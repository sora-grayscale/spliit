/**
 * Key derivation utilities for E2EE
 */

import { SECURITY_CONSTANTS } from './security-constants'
import { validateCryptoInputs } from './crypto-utils'

/**
 * Key derivation service using PBKDF2
 */
export class KeyDerivation {
  private static readonly ITERATIONS = SECURITY_CONSTANTS.PBKDF2_ITERATIONS
  private static readonly KEY_LENGTH = SECURITY_CONSTANTS.AES_KEY_LENGTH

  /**
   * Generate a random salt for key derivation
   */
  static generateSalt(): string {
    const salt = crypto.getRandomValues(new Uint8Array(SECURITY_CONSTANTS.SALT_LENGTH))
    return this.arrayBufferToBase64(salt)
  }

  /**
   * Derive AES key from password using PBKDF2
   */
  static async deriveKeyFromPassword(
    password: string,
    salt: string,
    iterations: number = this.ITERATIONS
  ): Promise<CryptoKey> {
    validateCryptoInputs({ password, salt })
    
    if (iterations < 10000) {
      throw new Error('Iterations must be at least 10,000 for security')
    }

    const encoder = new TextEncoder()
    const passwordBuffer = encoder.encode(password)
    const saltBuffer = this.base64ToArrayBuffer(salt)

    // Import password as key material
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      passwordBuffer,
      'PBKDF2',
      false,
      ['deriveKey']
    )

    // Derive AES key
    return await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: saltBuffer,
        iterations,
        hash: 'SHA-256',
      },
      keyMaterial,
      {
        name: 'AES-GCM',
        length: this.KEY_LENGTH,
      },
      false,
      ['encrypt', 'decrypt']
    )
  }

  // Utility methods
  private static arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer)
    const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join('')
    return btoa(binary)
  }

  private static base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i)
    }
    return bytes.buffer
  }
}