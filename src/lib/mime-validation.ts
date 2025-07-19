/**
 * MIME type validation utilities for file uploads
 * SECURITY: Validates both file extension and file content headers
 */

export interface MimeValidationResult {
  isValid: boolean
  detectedMimeType?: string
  error?: string
}

/**
 * File signature (magic number) patterns for common file types
 * SECURITY: Use file headers to validate actual file content, not just extension
 */
const FILE_SIGNATURES = {
  // JPEG files
  'image/jpeg': [
    [0xff, 0xd8, 0xff, 0xe0], // JFIF
    [0xff, 0xd8, 0xff, 0xe1], // EXIF
    [0xff, 0xd8, 0xff, 0xee], // Adobe JPEG
  ],
  // PNG files
  'image/png': [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
  // GIF files
  'image/gif': [
    [0x47, 0x49, 0x46, 0x38, 0x37, 0x61], // GIF87a
    [0x47, 0x49, 0x46, 0x38, 0x39, 0x61], // GIF89a
  ],
  // WebP files
  'image/webp': [[0x52, 0x49, 0x46, 0x46]], // RIFF container (needs further validation)
  // PDF files
  'application/pdf': [[0x25, 0x50, 0x44, 0x46]], // %PDF
}

/**
 * Allowed MIME types for file uploads
 */
export const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg', // Alias for image/jpeg
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
] as const

export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number]

/**
 * Validate file based on its binary signature
 * SECURITY: Checks actual file content, not just file extension
 */
export function validateFileSignature(
  buffer: ArrayBuffer,
  expectedMimeType?: string,
): MimeValidationResult {
  try {
    const bytes = new Uint8Array(buffer.slice(0, 16)) // Read first 16 bytes

    // Check each known file signature
    for (const [mimeType, signatures] of Object.entries(FILE_SIGNATURES)) {
      for (const signature of signatures) {
        if (matchesSignature(bytes, signature)) {
          // Special case for WebP - need additional validation
          if (mimeType === 'image/webp') {
            if (validateWebPSignature(bytes)) {
              return {
                isValid: !expectedMimeType || expectedMimeType === mimeType,
                detectedMimeType: mimeType,
              }
            }
            continue
          }

          return {
            isValid: !expectedMimeType || expectedMimeType === mimeType,
            detectedMimeType: mimeType,
          }
        }
      }
    }

    return {
      isValid: false,
      error: 'Unknown or unsupported file format',
    }
  } catch (error) {
    return {
      isValid: false,
      error: `File validation failed: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`,
    }
  }
}

/**
 * Check if byte array matches a signature pattern
 */
function matchesSignature(bytes: Uint8Array, signature: number[]): boolean {
  if (bytes.length < signature.length) return false

  for (let i = 0; i < signature.length; i++) {
    if (bytes[i] !== signature[i]) return false
  }

  return true
}

/**
 * Additional validation for WebP files
 * WebP files start with RIFF but need "WEBP" at offset 8
 */
function validateWebPSignature(bytes: Uint8Array): boolean {
  if (bytes.length < 12) return false

  // Check for "WEBP" at offset 8
  const webpSignature = [0x57, 0x45, 0x42, 0x50] // "WEBP"
  for (let i = 0; i < webpSignature.length; i++) {
    if (bytes[8 + i] !== webpSignature[i]) return false
  }

  return true
}

/**
 * Validate MIME type string
 */
export function isAllowedMimeType(
  mimeType: string,
): mimeType is AllowedMimeType {
  return ALLOWED_MIME_TYPES.includes(mimeType as AllowedMimeType)
}

/**
 * Get expected MIME type from file extension
 */
export function getMimeTypeFromExtension(
  extension: string,
): AllowedMimeType | null {
  const ext = extension.toLowerCase()

  switch (ext) {
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg'
    case '.png':
      return 'image/png'
    case '.gif':
      return 'image/gif'
    case '.webp':
      return 'image/webp'
    case '.pdf':
      return 'application/pdf'
    default:
      return null
  }
}

/**
 * Comprehensive file validation
 * Validates both extension and file content
 */
export function validateFile(
  filename: string,
  buffer: ArrayBuffer,
): MimeValidationResult {
  // Extract extension
  const match = filename.match(/(\.[^.]*)$/)
  if (!match) {
    return {
      isValid: false,
      error: 'No file extension found',
    }
  }

  const extension = match[1]
  const expectedMimeType = getMimeTypeFromExtension(extension)

  if (!expectedMimeType) {
    return {
      isValid: false,
      error: `Unsupported file extension: ${extension}`,
    }
  }

  // Validate file signature
  const signatureResult = validateFileSignature(buffer, expectedMimeType)

  if (!signatureResult.isValid) {
    return {
      isValid: false,
      error: signatureResult.error || 'File content does not match extension',
    }
  }

  return {
    isValid: true,
    detectedMimeType: signatureResult.detectedMimeType,
  }
}
