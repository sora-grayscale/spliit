import { randomId } from '@/lib/api'
import { env } from '@/lib/env'
import { POST as route } from 'next-s3-upload/route'

export const POST = route.configure({
  key(req, filename) {
    // SECURITY FIX: Enhanced file validation
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.pdf', '.gif', '.webp']
    const maxFilenameLength = 255
    
    // Validate filename length
    if (filename.length > maxFilenameLength) {
      throw new Error('Filename too long')
    }
    
    // Extract and validate extension
    const [, extension] = filename.match(/(\.[^\.]*)$/) ?? [null, '']
    if (!extension || !allowedExtensions.includes(extension.toLowerCase())) {
      throw new Error('Invalid file type. Only images and PDFs are allowed.')
    }
    
    // Sanitize filename - remove any potentially dangerous characters
    const sanitizedName = filename
      .replace(/[^a-zA-Z0-9.-]/g, '_')
      .replace(/\.+/g, '.')
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const random = randomId()
    return `document-${timestamp}-${random}${extension.toLowerCase()}`
  },
  endpoint: env.S3_UPLOAD_ENDPOINT,
  // forcing path style is only necessary for providers other than AWS
  forcePathStyle: !!env.S3_UPLOAD_ENDPOINT,
})
