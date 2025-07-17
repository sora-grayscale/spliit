/**
 * Password-based E2EE cryptographic utilities using Web Crypto API
 */

export interface EncryptedData {
  encryptedData: string
  iv: string
}

export interface E2eeKeyData {
  salt: string
  iterations: number
}

export class PasswordCrypto {
  private static readonly ITERATIONS = 100000 // PBKDF2 iterations
  private static readonly KEY_LENGTH = 256 // AES-256
  private static readonly TEST_DATA = 'e2ee-verification-test'

  /**
   * Generate a random salt for key derivation
   */
  static generateSalt(): string {
    const salt = crypto.getRandomValues(new Uint8Array(32))
    return this.arrayBufferToBase64(salt)
  }

  /**
   * Create test data for password verification
   */
  static createTestData(): string {
    return this.TEST_DATA
  }

  /**
   * Derive AES key from password using PBKDF2
   */
  static async deriveKeyFromPassword(
    password: string,
    salt: string,
    iterations: number = this.ITERATIONS
  ): Promise<CryptoKey> {
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

  /**
   * Encrypt data with AES-GCM
   */
  static async encryptData(
    data: string,
    key: CryptoKey
  ): Promise<EncryptedData> {
    const encoder = new TextEncoder()
    const iv = crypto.getRandomValues(new Uint8Array(12)) // 96-bit IV for GCM

    const encryptedBuffer = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      key,
      encoder.encode(data)
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
    key: CryptoKey
  ): Promise<string> {
    const decoder = new TextDecoder()

    const decryptedBuffer = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: this.base64ToArrayBuffer(iv),
      },
      key,
      this.base64ToArrayBuffer(encryptedData)
    )

    return decoder.decode(decryptedBuffer)
  }

  /**
   * Encrypt expense sensitive data
   */
  static async encryptExpenseData(
    title: string,
    notes: string | undefined,
    password: string,
    salt: string
  ): Promise<EncryptedData> {
    const key = await this.deriveKeyFromPassword(password, salt)
    const sensitiveData = JSON.stringify({ title, notes })
    return await this.encryptData(sensitiveData, key)
  }

  /**
   * Decrypt expense sensitive data
   */
  static async decryptExpenseData(
    encryptedData: string,
    iv: string,
    password: string,
    salt: string
  ): Promise<{ title: string; notes?: string }> {
    const key = await this.deriveKeyFromPassword(password, salt)
    const decryptedJson = await this.decryptData(encryptedData, iv, key)
    return JSON.parse(decryptedJson) as { title: string; notes?: string }
  }

  /**
   * Verify password by attempting to decrypt a test payload
   */
  static async verifyPassword(
    testEncryptedData: string,
    testIv: string,
    password: string,
    salt: string
  ): Promise<boolean> {
    try {
      const key = await this.deriveKeyFromPassword(password, salt)
      await this.decryptData(testEncryptedData, testIv, key)
      return true
    } catch {
      return false
    }
  }

  /**
   * Create a test payload for password verification
   */
  static async createPasswordTest(
    password: string,
    salt: string
  ): Promise<EncryptedData> {
    const key = await this.deriveKeyFromPassword(password, salt)
    const testData = JSON.stringify({ test: 'password_verification', timestamp: Date.now() })
    return await this.encryptData(testData, key)
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

/**
 * Browser-side password session management
 */
export class PasswordSession {
  private static passwords = new Map<string, string>() // groupId -> password

  static setPassword(groupId: string, password: string): void {
    this.passwords.set(groupId, password)
  }

  static getPassword(groupId: string): string | undefined {
    return this.passwords.get(groupId)
  }

  static clearPassword(groupId: string): void {
    this.passwords.delete(groupId)
  }

  static clearAllPasswords(): void {
    this.passwords.clear()
  }

  static hasPassword(groupId: string): boolean {
    return this.passwords.has(groupId)
  }
}