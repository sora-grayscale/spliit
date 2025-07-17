/**
 * Additional cryptographic utilities and security helpers
 */

import { SECURITY_CONSTANTS } from './security-constants'

/**
 * Timing-safe string comparison to prevent timing attacks
 */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false
  }
  
  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  
  return result === 0
}

/**
 * Generate cryptographically secure random bytes
 */
export function generateSecureRandomBytes(length: number = SECURITY_CONSTANTS.SECURE_RANDOM_BYTES): Uint8Array {
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
 * Hash-based key derivation function for consistent key generation
 */
export async function deriveKey(
  keyMaterial: CryptoKey,
  salt: ArrayBuffer,
  info: string,
  keyLength: number = 256
): Promise<CryptoKey> {
  const algorithm = {
    name: 'HKDF',
    hash: 'SHA-256',
    salt: salt,
    info: new TextEncoder().encode(info),
  }
  
  return await crypto.subtle.deriveKey(
    algorithm,
    keyMaterial,
    {
      name: 'AES-GCM',
      length: keyLength,
    },
    false,
    ['encrypt', 'decrypt']
  )
}

/**
 * Constant-time sleep function for rate limiting
 */
export async function constantTimeDelay(baseMs: number = 100): Promise<void> {
  const jitter = Math.floor(Math.random() * 50) // 0-49ms jitter
  const delay = baseMs + jitter
  
  return new Promise(resolve => {
    setTimeout(resolve, delay)
  })
}

/**
 * Validate cryptographic inputs
 */
export function validateCryptoInputs(inputs: Record<string, unknown>): void {
  for (const [key, value] of Object.entries(inputs)) {
    if (value === null || value === undefined) {
      throw new Error(`Cryptographic input '${key}' cannot be null or undefined`)
    }
    
    if (typeof value === 'string' && value.length === 0) {
      throw new Error(`Cryptographic input '${key}' cannot be empty`)
    }
  }
}

/**
 * Rate limiting helper
 */
export class RateLimiter {
  private attempts = new Map<string, { count: number; lastAttempt: number }>()
  
  constructor(
    private maxAttempts: number = SECURITY_CONSTANTS.MAX_LOGIN_ATTEMPTS,
    private windowMs: number = SECURITY_CONSTANTS.LOGIN_LOCKOUT_DURATION
  ) {}
  
  isBlocked(identifier: string): boolean {
    const record = this.attempts.get(identifier)
    if (!record) return false
    
    const now = Date.now()
    if (now - record.lastAttempt > this.windowMs) {
      this.attempts.delete(identifier)
      return false
    }
    
    return record.count >= this.maxAttempts
  }
  
  recordAttempt(identifier: string): boolean {
    const now = Date.now()
    const record = this.attempts.get(identifier)
    
    if (!record || now - record.lastAttempt > this.windowMs) {
      this.attempts.set(identifier, { count: 1, lastAttempt: now })
      return false
    }
    
    record.count++
    record.lastAttempt = now
    
    return record.count >= this.maxAttempts
  }
  
  reset(identifier: string): void {
    this.attempts.delete(identifier)
  }
}