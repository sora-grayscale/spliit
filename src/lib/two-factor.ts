/**
 * Two-Factor Authentication (2FA) utilities
 *
 * This module provides server-side encryption for 2FA secrets and backup codes.
 * Uses AES-256-GCM for authenticated encryption.
 * The encryption key is stored in TWO_FA_ENCRYPTION_KEY environment variable.
 */

import * as OTPAuth from 'otpauth'
import QRCode from 'qrcode'
import { env } from './env'

// ============================================================
// Constants
// ============================================================

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12 // 96-bit IV for GCM (recommended)
const AUTH_TAG_LENGTH = 16 // 128-bit auth tag
const BACKUP_CODE_LENGTH = 8
const BACKUP_CODE_COUNT = 10

// App name for TOTP
const APP_NAME = 'anon-spliit'

// ============================================================
// Key Management
// ============================================================

/**
 * Get the encryption key from environment variable
 * @returns 256-bit key as Buffer
 * @throws Error if TWO_FA_ENCRYPTION_KEY is not set
 */
function getEncryptionKey(): Buffer {
  const keyHex = env.TWO_FA_ENCRYPTION_KEY
  if (!keyHex) {
    throw new Error(
      'TWO_FA_ENCRYPTION_KEY environment variable is not set. ' +
        'Generate a 256-bit key with: openssl rand -hex 32',
    )
  }
  return Buffer.from(keyHex, 'hex')
}

// ============================================================
// Encryption/Decryption (AES-256-GCM)
// ============================================================

/**
 * Encrypt a secret using AES-256-GCM
 * Returns base64-encoded string containing: IV (12 bytes) + ciphertext + authTag (16 bytes)
 *
 * @param secret - The plaintext secret to encrypt
 * @returns Base64-encoded encrypted data
 */
export function encryptSecret(secret: string): string {
  // Dynamic import for Node.js crypto (server-side only)

  const crypto = require('crypto')

  const key = getEncryptionKey()
  const iv = crypto.randomBytes(IV_LENGTH)

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  })

  const encrypted = Buffer.concat([
    cipher.update(secret, 'utf8'),
    cipher.final(),
  ])

  const authTag = cipher.getAuthTag()

  // Combine: IV + ciphertext + authTag
  const combined = Buffer.concat([iv, encrypted, authTag])

  return combined.toString('base64')
}

/**
 * Decrypt a secret using AES-256-GCM
 *
 * @param encryptedData - Base64-encoded encrypted data
 * @returns Decrypted plaintext secret
 * @throws Error if decryption fails (invalid key, tampered data, etc.)
 */
export function decryptSecret(encryptedData: string): string {
  // Dynamic import for Node.js crypto (server-side only)

  const crypto = require('crypto')

  const key = getEncryptionKey()
  const combined = Buffer.from(encryptedData, 'base64')

  // Extract components
  const iv = combined.subarray(0, IV_LENGTH)
  const authTag = combined.subarray(combined.length - AUTH_TAG_LENGTH)
  const ciphertext = combined.subarray(
    IV_LENGTH,
    combined.length - AUTH_TAG_LENGTH,
  )

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  })

  decipher.setAuthTag(authTag)

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ])

  return decrypted.toString('utf8')
}

// ============================================================
// Backup Codes
// ============================================================

/**
 * Generate secure backup codes
 * Each code is 8 characters (alphanumeric, uppercase)
 *
 * @returns Array of 10 backup codes
 */
export function generateBackupCodes(): string[] {
  // Dynamic import for Node.js crypto (server-side only)

  const crypto = require('crypto')

  const codes: string[] = []
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'

  for (let i = 0; i < BACKUP_CODE_COUNT; i++) {
    let code = ''
    const randomBytes = crypto.randomBytes(BACKUP_CODE_LENGTH)
    for (let j = 0; j < BACKUP_CODE_LENGTH; j++) {
      code += charset[randomBytes[j] % charset.length]
    }
    codes.push(code)
  }

  return codes
}

/**
 * Encrypt backup codes as JSON array
 *
 * @param codes - Array of backup codes
 * @returns Base64-encoded encrypted JSON
 */
export function encryptBackupCodes(codes: string[]): string {
  const json = JSON.stringify(codes)
  return encryptSecret(json)
}

/**
 * Decrypt backup codes from encrypted JSON
 *
 * @param encrypted - Base64-encoded encrypted JSON
 * @returns Array of backup codes
 */
export function decryptBackupCodes(encrypted: string): string[] {
  const json = decryptSecret(encrypted)
  return JSON.parse(json) as string[]
}

// ============================================================
// TOTP (Time-based One-Time Password)
// ============================================================

/**
 * Generate a new TOTP secret and otpauth URL
 *
 * @param userIdentifier - User identifier (email, username, or account ID)
 * @returns Object containing base32-encoded secret and otpauth URL
 */
export function generateTOTPSecret(userIdentifier: string = 'user'): {
  secret: string
  otpauthUrl: string
} {
  // Create a new TOTP instance with random secret
  const totp = new OTPAuth.TOTP({
    issuer: APP_NAME,
    label: userIdentifier,
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
  })

  return {
    secret: totp.secret.base32,
    otpauthUrl: totp.toString(),
  }
}

/**
 * Verify a TOTP token against a secret
 *
 * @param secret - Base32-encoded TOTP secret
 * @param token - 6-digit token to verify
 * @returns true if token is valid, false otherwise
 */
export function verifyTOTP(secret: string, token: string): boolean {
  try {
    const totp = new OTPAuth.TOTP({
      issuer: APP_NAME,
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: OTPAuth.Secret.fromBase32(secret),
    })

    // validate returns null if invalid, or the delta (time step difference) if valid
    // window: 1 allows for 1 time step before/after (30 seconds tolerance)
    const delta = totp.validate({ token, window: 1 })

    return delta !== null
  } catch {
    return false
  }
}

// ============================================================
// QR Code Generation
// ============================================================

/**
 * Generate a QR code as a data URL for the otpauth URL
 *
 * @param otpauthUrl - The otpauth:// URL to encode
 * @returns Promise resolving to a data URL (image/png;base64,...)
 */
export async function generateQRCode(otpauthUrl: string): Promise<string> {
  return QRCode.toDataURL(otpauthUrl, {
    errorCorrectionLevel: 'M',
    type: 'image/png',
    width: 256,
    margin: 2,
  })
}
