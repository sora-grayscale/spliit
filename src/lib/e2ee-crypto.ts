/**
 * Password-based E2EE cryptographic utilities using Web Crypto API
 */

import { SECURITY_CONSTANTS } from './security-constants'
import { nonBlockingDelay, RateLimiter, timingSafeEqual } from './crypto-utils'

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
   * Decrypt expense sensitive data with validation and rate limiting
   */
  static async decryptExpenseData(
    encryptedData: string,
    iv: string,
    password: string,
    salt: string,
    groupId?: string
  ): Promise<{ title: string; notes?: string }> {
    if (!encryptedData || !iv || !password || !salt) {
      throw new Error('All parameters (encryptedData, iv, password, salt) must be provided')
    }
    
    // Apply rate limiting if groupId is provided
    if (groupId) {
      const isBlocked = await PasswordSession.checkDecryptionRateLimit(groupId)
      if (isBlocked) {
        throw new Error('Too many decryption attempts. Please try again later.')
      }
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
      
      // Reset rate limits on successful decryption
      if (groupId) {
        PasswordSession.resetRateLimits(groupId)
      }
      
      return {
        title: data.title,
        notes: typeof data.notes === 'string' ? data.notes : undefined
      }
    } catch (error) {
      // Add delay on failed attempts
      if (groupId) {
        await nonBlockingDelay(500 + Math.random() * 500) // 0.5-1 second delay
      }
      
      if (error instanceof Error) {
        throw new Error(`Decryption failed: ${error.message}`)
      }
      throw new Error('Decryption failed: Unknown error')
    }
  }

  /**
   * Verify password by attempting to decrypt a test payload with rate limiting
   */
  static async verifyPassword(
    testEncryptedData: string,
    testIv: string,
    password: string,
    salt: string,
    groupId?: string
  ): Promise<boolean> {
    // Apply rate limiting if groupId is provided
    if (groupId) {
      const isBlocked = await PasswordSession.checkVerificationRateLimit(groupId)
      if (isBlocked) {
        throw new Error('Too many verification attempts. Please try again later.')
      }
    }
    
    try {
      const key = await this.deriveKeyFromPassword(password, salt)
      await this.decryptData(testEncryptedData, testIv, key)
      
      // Reset rate limits on successful verification
      if (groupId) {
        PasswordSession.resetRateLimits(groupId)
      }
      
      return true
    } catch (error) {
      // Add delay on failed attempts to slow down brute force
      if (groupId) {
        await nonBlockingDelay(1000 + Math.random() * 1000) // 1-2 second delay
      }
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
 * Secure memory management utility with enhanced documentation
 * 
 * IMPORTANT LIMITATIONS:
 * - JavaScript strings are immutable primitives stored in the runtime's string table
 * - True memory wiping is impossible due to garbage collection and string interning
 * - This implementation provides best-effort defense against casual memory inspection
 * - For true security, consider using WebAssembly or server-side encryption
 * 
 * ALTERNATIVE APPROACHES:
 * 1. Use typed arrays (Uint8Array) for sensitive data storage when possible
 * 2. Implement server-side encryption with zero-knowledge architecture
 * 3. Use Web Workers to isolate sensitive operations
 * 4. Consider using WebAssembly for memory-controlled operations
 */
class SecureMemory {
  /**
   * Attempt to securely overwrite string data in memory
   * This is a best-effort approach with known limitations
   */
  static async secureWipeString(str: string): Promise<void> {
    try {
      // Create array buffer representation for overwriting
      const encoder = new TextEncoder()
      const buffer = encoder.encode(str)
      
      // Multiple overwrite cycles with different patterns
      for (let cycle = 0; cycle < SECURITY_CONSTANTS.PASSWORD_MEMORY_CLEAR_CYCLES; cycle++) {
        const pattern = cycle % 3 === 0 ? 0x00 : cycle % 3 === 1 ? 0xFF : 0xAA
        buffer.fill(pattern)
        
        // Non-blocking delay between cycles to prevent UI freezing
        if (cycle % 2 === 0) {
          await nonBlockingDelay(1)
        }
      }
      
      // Final overwrite with random data
      crypto.getRandomValues(buffer)
      
      // Additional overwrite with zeros
      buffer.fill(0)
      
    } catch (error) {
      console.warn('Secure memory wipe failed:', error)
    }
  }
  
  /**
   * Create a secure buffer for sensitive data
   * Returns a typed array that can be more reliably cleared
   */
  static createSecureBuffer(data: string): Uint8Array {
    const encoder = new TextEncoder()
    return encoder.encode(data)
  }
  
  /**
   * Securely clear a typed array
   */
  static async clearSecureBuffer(buffer: Uint8Array): Promise<void> {
    // Multiple overwrite patterns
    for (let cycle = 0; cycle < 3; cycle++) {
      const pattern = cycle % 3 === 0 ? 0x00 : cycle % 3 === 1 ? 0xFF : 0xAA
      buffer.fill(pattern)
      
      if (cycle < 2) {
        await nonBlockingDelay(1)
      }
    }
    
    // Final random overwrite
    crypto.getRandomValues(buffer)
    buffer.fill(0)
  }
}

/**
 * Browser-side password session management with enhanced security and rate limiting
 */
export class PasswordSession {
  private static passwords = new Map<string, string>() // groupId -> password
  private static readonly MAX_PASSWORD_AGE = SECURITY_CONSTANTS.PASSWORD_SESSION_TIMEOUT
  private static passwordTimestamps = new Map<string, number>() // groupId -> timestamp
  private static wipeScheduled = new Set<string>() // groupIds scheduled for secure wipe
  private static decryptionLimiter = new RateLimiter(5, 60000) // 5 attempts per minute
  private static verificationLimiter = new RateLimiter(10, 300000) // 10 attempts per 5 minutes

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
        // Use non-blocking secure wipe
        SecureMemory.secureWipeString(password).finally(() => {
          this.wipeScheduled.delete(groupId)
        })
      }
      
      // Clear password from memory immediately
      this.passwords.set(groupId, '')
      this.passwords.delete(groupId)
    }
    this.passwordTimestamps.delete(groupId)
    
    // Clean up event listeners
    this.removePasswordCleanup(groupId)
  }

  static async clearAllPasswords(): Promise<void> {
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
    
    // Secure wipe for all passwords (non-blocking)
    const wipePromises = passwordsToWipe.map(password => 
      SecureMemory.secureWipeString(password)
    )
    
    await Promise.all(wipePromises)
  }
  
  /**
   * Check if decryption is rate limited for a group
   */
  static async checkDecryptionRateLimit(groupId: string): Promise<boolean> {
    return await this.decryptionLimiter.recordAttempt(groupId)
  }
  
  /**
   * Check if password verification is rate limited for a group
   */
  static async checkVerificationRateLimit(groupId: string): Promise<boolean> {
    return await this.verificationLimiter.recordAttempt(groupId)
  }
  
  /**
   * Reset rate limits for a group (on successful operations)
   */
  static resetRateLimits(groupId: string): void {
    this.decryptionLimiter.reset(groupId)
    this.verificationLimiter.reset(groupId)
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