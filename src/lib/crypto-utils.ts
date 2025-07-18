/**
 * Additional cryptographic utilities and security helpers
 */

import { SECURITY_CONSTANTS } from './security-constants'

/**
 * Timing-safe string comparison to prevent timing attacks
 * Enhanced with length masking and additional security measures
 */
export function timingSafeEqual(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') {
    throw new Error('Both inputs must be strings')
  }

  // Always perform comparison on same-length strings to prevent length-based timing attacks
  const maxLength = Math.max(a.length, b.length, 32) // Minimum 32 chars for timing consistency
  const paddedA = a.padEnd(maxLength, '\0')
  const paddedB = b.padEnd(maxLength, '\0')

  let result = 0

  // Always compare the full padded length
  for (let i = 0; i < maxLength; i++) {
    result |= paddedA.charCodeAt(i) ^ paddedB.charCodeAt(i)
  }

  // Additional check to ensure original lengths match
  result |= a.length ^ b.length

  return result === 0
}

/**
 * Generate cryptographically secure random integer using rejection sampling
 * This avoids bias that can be introduced by modulo operations
 */
export function getUnbiasedRandomInt(max: number): number {
  if (max <= 0 || max > SECURITY_CONSTANTS.MAX_UINT32) {
    throw new Error('Invalid max value for random int generation')
  }

  // Use the provided max value directly since we've validated it's within range
  const effectiveMax = max

  // Calculate the largest multiple of effectiveMax that fits in a 32-bit unsigned integer
  const limit =
    Math.floor(SECURITY_CONSTANTS.MAX_UINT32 / effectiveMax) * effectiveMax

  let value: number
  let attempts = 0
  const maxAttempts = 100 // Prevent infinite loops with malicious inputs

  do {
    if (attempts >= maxAttempts) {
      throw new Error(
        'Exceeded maximum attempts for unbiased random generation',
      )
    }

    const array = new Uint32Array(1)
    try {
      crypto.getRandomValues(array)
    } catch (error) {
      throw new Error('Failed to generate secure random values')
    }

    value = array[0]
    attempts++
  } while (value >= limit) // Rejection sampling to avoid bias

  return value % effectiveMax
}

/**
 * Generate cryptographically secure random bytes
 */
export function generateSecureRandomBytes(
  length: number = SECURITY_CONSTANTS.SECURE_RANDOM_BYTES,
): Uint8Array {
  if (length <= 0 || length > 1024) {
    throw new Error('Invalid random bytes length')
  }

  return crypto.getRandomValues(new Uint8Array(length))
}

/**
 * Convert ArrayBuffer to base64 string
 */
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join('')
  return btoa(binary)
}

/**
 * Convert base64 string to ArrayBuffer
 */
export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}

/**
 * Enhanced hash-based key derivation function with validation
 */
export async function deriveKey(
  keyMaterial: CryptoKey,
  salt: ArrayBuffer,
  info: string,
  keyLength: number = 256,
): Promise<CryptoKey> {
  // Validate inputs
  if (!keyMaterial || !salt || !info) {
    throw new Error('Key material, salt, and info must be provided')
  }

  if (salt.byteLength < 16) {
    throw new Error('Salt must be at least 16 bytes')
  }

  if (![128, 192, 256].includes(keyLength)) {
    throw new Error('Key length must be 128, 192, or 256 bits')
  }

  const sanitizedInfo = sanitizeCryptoInput(info)

  const algorithm = {
    name: 'HKDF',
    hash: 'SHA-256',
    salt: salt,
    info: new TextEncoder().encode(sanitizedInfo),
  }

  try {
    return await crypto.subtle.deriveKey(
      algorithm,
      keyMaterial,
      {
        name: 'AES-GCM',
        length: keyLength,
      },
      false,
      ['encrypt', 'decrypt'],
    )
  } catch (error) {
    throw new Error(
      `Key derivation failed: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`,
    )
  }
}

/**
 * Non-blocking constant-time delay function for rate limiting
 * Uses secure random jitter to prevent timing analysis
 */
export async function constantTimeDelay(baseMs: number = 100): Promise<void> {
  const jitter = getUnbiasedRandomInt(50) // 0-49ms secure jitter
  const delay = baseMs + jitter

  return new Promise((resolve) => {
    setTimeout(resolve, delay)
  })
}

/**
 * Non-blocking progressive delay for memory operations
 * Yields control to the event loop periodically
 */
export async function nonBlockingDelay(ms: number = 1): Promise<void> {
  return new Promise((resolve) => {
    if (ms <= 0) {
      // Use requestAnimationFrame for immediate but non-blocking yield
      if (typeof requestAnimationFrame !== 'undefined') {
        requestAnimationFrame(() => resolve())
      } else {
        setTimeout(resolve, 0)
      }
    } else {
      setTimeout(resolve, ms)
    }
  })
}

/**
 * Validate cryptographic inputs with enhanced security checks
 */
export function validateCryptoInputs(inputs: Record<string, unknown>): void {
  for (const [key, value] of Object.entries(inputs)) {
    if (value === null || value === undefined) {
      throw new Error(
        `Cryptographic input '${key}' cannot be null or undefined`,
      )
    }

    if (typeof value === 'string') {
      if (value.length === 0) {
        throw new Error(`Cryptographic input '${key}' cannot be empty`)
      }

      // Check for potential injection attempts
      if (
        value.includes('\0') ||
        value.includes('\r') ||
        value.includes('\n')
      ) {
        throw new Error(
          `Cryptographic input '${key}' contains invalid characters`,
        )
      }

      // Check for excessively long inputs (potential DoS)
      if (value.length > 10000) {
        throw new Error(`Cryptographic input '${key}' exceeds maximum length`)
      }
    }

    if (typeof value === 'number') {
      if (!Number.isFinite(value) || value < 0) {
        throw new Error(
          `Cryptographic input '${key}' must be a positive finite number`,
        )
      }
    }
  }
}

/**
 * Secure input sanitization for cryptographic operations
 */
export function sanitizeCryptoInput(input: string): string {
  if (typeof input !== 'string') {
    throw new Error('Input must be a string')
  }

  // Remove null bytes and control characters
  return input.replace(/[\0\r\n\x00-\x1F\x7F]/g, '')
}

/**
 * Rate limiting helper
 */
/**
 * Enhanced rate limiter with exponential backoff and memory cleanup
 */
export class RateLimiter {
  private attempts = new Map<
    string,
    { count: number; lastAttempt: number; backoffMultiplier: number }
  >()
  private cleanupTimer?: ReturnType<typeof setInterval>

  constructor(
    private maxAttempts: number = SECURITY_CONSTANTS.MAX_LOGIN_ATTEMPTS,
    private windowMs: number = SECURITY_CONSTANTS.LOGIN_LOCKOUT_DURATION,
    private enableExponentialBackoff: boolean = true,
  ) {
    // Cleanup expired entries every 5 minutes
    this.cleanupTimer = setInterval(() => this.cleanup(), 5 * 60 * 1000)
  }

  isBlocked(identifier: string): boolean {
    const record = this.attempts.get(identifier)
    if (!record) return false

    const now = Date.now()
    const effectiveWindow = this.enableExponentialBackoff
      ? this.windowMs * record.backoffMultiplier
      : this.windowMs

    if (now - record.lastAttempt > effectiveWindow) {
      this.attempts.delete(identifier)
      return false
    }

    return record.count >= this.maxAttempts
  }

  async recordAttempt(identifier: string): Promise<boolean> {
    const now = Date.now()
    const record = this.attempts.get(identifier)

    if (!record || now - record.lastAttempt > this.windowMs) {
      this.attempts.set(identifier, {
        count: 1,
        lastAttempt: now,
        backoffMultiplier: 1,
      })
      return false
    }

    record.count++
    record.lastAttempt = now

    // Exponential backoff
    if (this.enableExponentialBackoff && record.count >= this.maxAttempts) {
      record.backoffMultiplier = Math.min(record.backoffMultiplier * 2, 16) // Max 16x backoff
    }

    const isBlocked = record.count >= this.maxAttempts

    // Add progressive delay for repeated attempts
    if (record.count > 1) {
      await constantTimeDelay(Math.min(record.count * 100, 2000)) // Max 2 second delay
    }

    return isBlocked
  }

  reset(identifier: string): void {
    this.attempts.delete(identifier)
  }

  private cleanup(): void {
    const now = Date.now()
    const expiredKeys: string[] = []

    this.attempts.forEach((record, key) => {
      const effectiveWindow = this.enableExponentialBackoff
        ? this.windowMs * record.backoffMultiplier
        : this.windowMs

      if (now - record.lastAttempt > effectiveWindow * 2) {
        // Keep for 2x window for safety
        expiredKeys.push(key)
      }
    })

    expiredKeys.forEach((key) => this.attempts.delete(key))
  }

  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
      this.cleanupTimer = undefined
    }
    this.attempts.clear()
  }
}
