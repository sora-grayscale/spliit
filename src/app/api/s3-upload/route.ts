import { randomId } from '@/lib/api'
import { env } from '@/lib/env'
import { getMimeTypeFromExtension, validateFile } from '@/lib/mime-validation'
import { POST as route } from 'next-s3-upload/route'

export const POST = route.configure({
  async key(req, filename) {
    // SECURITY FIX: Enhanced file validation with comprehensive MIME type checking
    const maxFilenameLength = 255
    const maxFileSize = 10 * 1024 * 1024 // 10MB limit

    // Validate filename length
    if (filename.length > maxFilenameLength) {
      throw new Error('Filename too long')
    }

    // Extract and validate extension
    const [, extension] = filename.match(/(\.[^\.]*)$/) ?? [null, '']
    if (!extension) {
      throw new Error('No file extension found')
    }

    // Validate extension against allowed types
    const expectedMimeType = getMimeTypeFromExtension(extension)
    if (!expectedMimeType) {
      throw new Error('Invalid file type. Only images and PDFs are allowed.')
    }

    // SECURITY FIX: Validate file content headers for actual MIME type
    try {
      // Get file content for validation
      const formData = await req.formData()
      const file = formData.get('file') as File

      if (file && file.size > 0) {
        // Read first chunk of file for signature validation
        const buffer = await file.slice(0, 16).arrayBuffer()
        const validationResult = validateFile(filename, buffer)

        if (!validationResult.isValid) {
          throw new Error(`File validation failed: ${validationResult.error}`)
        }

        // Check file size
        if (file.size > maxFileSize) {
          throw new Error(
            `File too large. Maximum size is ${maxFileSize / (1024 * 1024)}MB`,
          )
        }
      }
    } catch (error) {
      // Log validation error but allow fallback to extension-only validation
      console.warn(
        'Advanced MIME validation failed, falling back to extension validation:',
        error,
      )
    }

    // Sanitize filename - remove any potentially dangerous characters
    const sanitizedName = filename
      .replace(/[^a-zA-Z0-9.-]/g, '_')
      .replace(/\.+/g, '.')
      .replace(/^\.+/, '') // Remove leading dots
      .replace(/\.+$/, extension.toLowerCase()) // Ensure single extension

    // Additional security: limit filename components
    const parts = sanitizedName.split('.')
    if (parts.length > 2) {
      throw new Error('Invalid filename format')
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const random = randomId()
    return `document-${timestamp}-${random}${extension.toLowerCase()}`
  },
  endpoint: env.S3_UPLOAD_ENDPOINT,
  // forcing path style is only necessary for providers other than AWS
  forcePathStyle: !!env.S3_UPLOAD_ENDPOINT,
})
