/**
 * Encryption and decryption utilities for E2EE
 */

import { constantTimeDelay, validateCryptoInputs } from './crypto-utils'
import { KeyDerivation } from './key-derivation'
import { SECURITY_CONSTANTS } from './security-constants'

export interface EncryptedData {
  encryptedData: string
  iv: string
}

/**
 * AES-GCM encryption and decryption service
 */
export class EncryptionService {
  private static readonly IV_LENGTH = SECURITY_CONSTANTS.AES_IV_LENGTH

  /**
   * Encrypt data with AES-GCM
   */
  static async encryptData(
    data: string,
    key: CryptoKey,
  ): Promise<EncryptedData> {
    validateCryptoInputs({ data })

    if (!key) {
      throw new Error('Encryption key must be provided')
    }

    const encoder = new TextEncoder()
    const iv = crypto.getRandomValues(new Uint8Array(this.IV_LENGTH))

    const encryptedBuffer = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      key,
      encoder.encode(data),
    )

    return {
      encryptedData: this.arrayBufferToBase64(encryptedBuffer),
      iv: this.arrayBufferToBase64(iv),
    }
  }

  /**
   * Decrypt data with AES-GCM
   */
  static async decryptData(
    encryptedData: string,
    iv: string,
    key: CryptoKey,
  ): Promise<string> {
    validateCryptoInputs({ encryptedData, iv })

    if (!key) {
      throw new Error('Decryption key must be provided')
    }

    const decoder = new TextDecoder()

    const decryptedBuffer = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: this.base64ToArrayBuffer(iv),
      },
      key,
      this.base64ToArrayBuffer(encryptedData),
    )

    return decoder.decode(decryptedBuffer)
  }

  /**
   * Encrypt expense sensitive data with validation
   */
  static async encryptExpenseData(
    title: string,
    notes: string | undefined,
    password: string,
    salt: string,
  ): Promise<EncryptedData> {
    validateCryptoInputs({ title, password, salt })

    const key = await KeyDerivation.deriveKeyFromPassword(password, salt)
    const sensitiveData = JSON.stringify({ title, notes: notes || '' })
    return await this.encryptData(sensitiveData, key)
  }

  /**
   * Decrypt expense sensitive data with validation and constant-time operations
   */
  static async decryptExpenseData(
    encryptedData: string,
    iv: string,
    password: string,
    salt: string,
  ): Promise<{ title: string; notes?: string }> {
    validateCryptoInputs({ encryptedData, iv, password, salt })

    const startTime = Date.now()
    let success = false
    let result: { title: string; notes?: string } | null = null
    let errorMessage = 'Decryption failed'

    try {
      const key = await KeyDerivation.deriveKeyFromPassword(password, salt)
      const decryptedJson = await this.decryptData(encryptedData, iv, key)
      const parsed = JSON.parse(decryptedJson) as unknown

      // Validate the decrypted structure
      if (!parsed || typeof parsed !== 'object') {
        throw new Error('Invalid decrypted data structure')
      }

      const data = parsed as Record<string, unknown>

      if (typeof data.title !== 'string') {
        throw new Error('Invalid decrypted data: title must be a string')
      }

      result = {
        title: data.title,
        notes: typeof data.notes === 'string' ? data.notes : undefined,
      }
      success = true
    } catch (error) {
      success = false
      if (error instanceof Error) {
        errorMessage = `Decryption failed: ${error.message}`
      } else {
        errorMessage = 'Decryption failed: Unknown error'
      }
    }

    // Implement constant-time behavior to prevent timing attacks
    const elapsedTime = Date.now() - startTime
    const minOperationTime = SECURITY_CONSTANTS.MIN_DECRYPTION_TIME_MS || 100

    if (elapsedTime < minOperationTime) {
      await constantTimeDelay(minOperationTime - elapsedTime)
    }

    if (success && result) {
      return result
    } else {
      throw new Error(errorMessage)
    }
  }

  // Utility methods
  private static arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer)
    const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join(
      '',
    )
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
