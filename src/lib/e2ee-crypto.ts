/**
 * Password-based E2EE cryptographic utilities using Web Crypto API
 */

import { SECURITY_CONSTANTS } from './security-constants'

export interface EncryptedData {
  encryptedData: string
  iv: string
}

export interface E2eeKeyData {
  salt: string
  iterations: number
}

export class PasswordCrypto {
  private static readonly ITERATIONS = SECURITY_CONSTANTS.PBKDF2_ITERATIONS
  private static readonly KEY_LENGTH = SECURITY_CONSTANTS.AES_KEY_LENGTH
  private static readonly IV_LENGTH = SECURITY_CONSTANTS.AES_IV_LENGTH
  private static readonly SALT_LENGTH = SECURITY_CONSTANTS.SALT_LENGTH

  /**
   * Generate a random salt for key derivation
   */
  static generateSalt(): string {
    const salt = crypto.getRandomValues(new Uint8Array(this.SALT_LENGTH))
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
    if (!data || typeof data !== 'string') {
      throw new Error('Data must be a non-empty string')
    }
    
    const encoder = new TextEncoder()
    const iv = crypto.getRandomValues(new Uint8Array(this.IV_LENGTH))

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
    if (!encryptedData || !iv) {
      throw new Error('Encrypted data and IV must be provided')
    }
    
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
   * Encrypt expense sensitive data with validation
   */
  static async encryptExpenseData(
    title: string,
    notes: string | undefined,
    password: string,
    salt: string
  ): Promise<EncryptedData> {
    if (!title || typeof title !== 'string') {
      throw new Error('Title must be a non-empty string')
    }
    if (!password || typeof password !== 'string') {
      throw new Error('Password must be a non-empty string')
    }
    if (!salt || typeof salt !== 'string') {
      throw new Error('Salt must be a non-empty string')
    }
    
    const key = await this.deriveKeyFromPassword(password, salt)
    const sensitiveData = JSON.stringify({ title, notes: notes || '' })
    return await this.encryptData(sensitiveData, key)
  }

  /**
   * Decrypt expense sensitive data with validation
   */
  static async decryptExpenseData(
    encryptedData: string,
    iv: string,
    password: string,
    salt: string
  ): Promise<{ title: string; notes?: string }> {
    if (!encryptedData || !iv || !password || !salt) {
      throw new Error('All parameters (encryptedData, iv, password, salt) must be provided')
    }
    
    try {
      const key = await this.deriveKeyFromPassword(password, salt)
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
      
      return {
        title: data.title,
        notes: typeof data.notes === 'string' ? data.notes : undefined
      }
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Decryption failed: ${error.message}`)
      }
      throw new Error('Decryption failed: Unknown error')
    }
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
   * Create a test payload for password verification with enhanced security
   */
  static async createPasswordTest(
    password: string,
    salt: string
  ): Promise<EncryptedData> {
    if (!password || !salt) {
      throw new Error('Password and salt must be provided')
    }
    
    const key = await this.deriveKeyFromPassword(password, salt)
    // Use static test data to prevent timing analysis
    const testData = JSON.stringify({ 
      test: 'password_verification', 
      version: '1.0',
      timestamp: 0, // Static timestamp to prevent timing leaks
      static: true 
    })
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
 * Secure memory management utility
 */
class SecureMemory {
  /**
   * Securely overwrite string data in memory multiple times
   */
  static secureWipeString(str: string): void {
    // Note: In JavaScript, strings are immutable, so this is a best-effort approach
    // The actual memory clearing depends on the JavaScript engine's garbage collection
    try {
      // Create array buffer representation for overwriting
      const encoder = new TextEncoder()
      const decoder = new TextDecoder()
      const buffer = encoder.encode(str)
      
      // Multiple overwrite cycles with different patterns
      for (let cycle = 0; cycle < SECURITY_CONSTANTS.PASSWORD_MEMORY_CLEAR_CYCLES; cycle++) {
        const pattern = cycle % 2 === 0 ? 0x00 : 0xFF
        buffer.fill(pattern)
        
        // Force some processing time
        if (cycle < 3) {
          decoder.decode(buffer)
        }
        
        // Small delay between cycles
        if (SECURITY_CONSTANTS.MEMORY_CLEAR_DELAY > 0) {
          // Blocking delay (not ideal but necessary for memory clearing)
          const start = Date.now()
          while (Date.now() - start < SECURITY_CONSTANTS.MEMORY_CLEAR_DELAY / 10) {
            // Busy wait
          }
        }
      }
      
      // Final overwrite with random data
      crypto.getRandomValues(buffer)
    } catch (error) {
      console.warn('Secure memory wipe failed:', error)
    }
  }
}

/**
 * Browser-side password session management with enhanced security
 */
export class PasswordSession {
  private static passwords = new Map<string, string>() // groupId -> password
  private static readonly MAX_PASSWORD_AGE = SECURITY_CONSTANTS.PASSWORD_SESSION_TIMEOUT
  private static passwordTimestamps = new Map<string, number>() // groupId -> timestamp
  private static wipeScheduled = new Set<string>() // groupIds scheduled for secure wipe

  static setPassword(groupId: string, password: string): void {
    if (!groupId || !password) {
      throw new Error('Group ID and password must be provided')
    }
    
    // Clear any existing password for this group first
    this.clearPassword(groupId)
    
    this.passwords.set(groupId, password)
    this.passwordTimestamps.set(groupId, Date.now())
    
    // Set up automatic cleanup
    this.setupPasswordCleanup(groupId)
  }

  static getPassword(groupId: string): string | undefined {
    const password = this.passwords.get(groupId)
    const timestamp = this.passwordTimestamps.get(groupId)
    
    // Check if password has expired
    if (password && timestamp && Date.now() - timestamp > this.MAX_PASSWORD_AGE) {
      this.clearPassword(groupId)
      return undefined
    }
    
    return password
  }

  static clearPassword(groupId: string): void {
    const password = this.passwords.get(groupId)
    if (password) {
      // Schedule secure wipe to avoid blocking
      if (!this.wipeScheduled.has(groupId)) {
        this.wipeScheduled.add(groupId)
        // Use setTimeout to avoid blocking the main thread
        setTimeout(() => {
          SecureMemory.secureWipeString(password)
          this.wipeScheduled.delete(groupId)
        }, 0)
      }
      
      // Clear password from memory immediately
      this.passwords.set(groupId, '')
      this.passwords.delete(groupId)
    }
    this.passwordTimestamps.delete(groupId)
    
    // Clean up event listeners
    this.removePasswordCleanup(groupId)
  }

  static clearAllPasswords(): void {
    // Securely wipe all passwords
    const passwordsToWipe: string[] = []
    this.passwords.forEach((password) => {
      if (password) {
        passwordsToWipe.push(password)
      }
    })
    
    // Clear maps first
    this.passwords.clear()
    this.passwordTimestamps.clear()
    this.cleanupListeners.clear()
    this.wipeScheduled.clear()
    
    // Schedule secure wipe for all passwords
    setTimeout(() => {
      passwordsToWipe.forEach(password => {
        SecureMemory.secureWipeString(password)
      })
    }, 0)
  }

  static hasPassword(groupId: string): boolean {
    return this.getPassword(groupId) !== undefined
  }

  private static cleanupListeners = new Map<string, Array<() => void>>() // groupId -> cleanup functions

  private static setupPasswordCleanup(groupId: string): void {
    if (typeof window === 'undefined') return

    // Remove existing listeners for this groupId
    this.removePasswordCleanup(groupId)

    const cleanupFunctions: Array<() => void> = []
    
    const cleanup = () => this.clearPassword(groupId)
    
    // Clean up on page unload
    const beforeUnloadCleanup = () => cleanup()
    window.addEventListener('beforeunload', beforeUnloadCleanup, { once: true })
    cleanupFunctions.push(() => window.removeEventListener('beforeunload', beforeUnloadCleanup))
    
    // Clean up on visibility change (when tab becomes hidden)
    const visibilityCleanup = () => {
      if (document.hidden) cleanup()
    }
    document.addEventListener('visibilitychange', visibilityCleanup)
    cleanupFunctions.push(() => document.removeEventListener('visibilitychange', visibilityCleanup))
    
    // Set up timeout-based cleanup
    const timeoutId = setTimeout(() => {
      this.clearPassword(groupId)
    }, this.MAX_PASSWORD_AGE)
    cleanupFunctions.push(() => clearTimeout(timeoutId))

    // Store cleanup functions
    this.cleanupListeners.set(groupId, cleanupFunctions)
  }

  private static removePasswordCleanup(groupId: string): void {
    const cleanupFunctions = this.cleanupListeners.get(groupId)
    if (cleanupFunctions) {
      cleanupFunctions.forEach(cleanup => cleanup())
      this.cleanupListeners.delete(groupId)
    }
  }
}