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
   * Generate a random salt for key derivation with enhanced error handling
   */
  static generateSalt(): string {
    try {
      const salt = crypto.getRandomValues(new Uint8Array(SECURITY_CONSTANTS.SALT_LENGTH))
      return this.arrayBufferToBase64(salt)
    } catch (error) {
      throw new Error(`Salt generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Derive AES key from password using PBKDF2 with enhanced validation and error handling
   */
  static async deriveKeyFromPassword(
    password: string,
    salt: string,
    iterations: number = this.ITERATIONS
  ): Promise<CryptoKey> {
    validateCryptoInputs({ password, salt })
    
    if (typeof iterations !== 'number' || iterations < 10000) {
      throw new Error('Iterations must be at least 10,000 for security')
    }
    
    if (iterations > 1000000) {
      throw new Error('Iterations cannot exceed 1,000,000 to prevent DoS attacks')
    }

    try {
      const encoder = new TextEncoder()
      const passwordBuffer = encoder.encode(password)
      const saltBuffer = this.base64ToArrayBuffer(salt)

      // Import password as key material with error handling
      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        passwordBuffer,
        'PBKDF2',
        false,
        ['deriveKey']
      )

      // Clear intermediate password buffer
      passwordBuffer.fill(0)

      // Derive AES key with secure parameters
      const derivedKey = await crypto.subtle.deriveKey(
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

      return derivedKey
    } catch (error) {
      throw new Error(`Key derivation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Utility methods with enhanced error handling
  private static arrayBufferToBase64(buffer: ArrayBuffer): string {
    try {
      const bytes = new Uint8Array(buffer)
      const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join('')
      return btoa(binary)
    } catch (error) {
      throw new Error('Failed to convert buffer to base64')
    }
  }

  private static base64ToArrayBuffer(base64: string): ArrayBuffer {
    try {
      const binary = atob(base64)
      const bytes = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i)
      }
      return bytes.buffer
    } catch (error) {
      throw new Error('Invalid base64 input for salt')
    }
  }
}