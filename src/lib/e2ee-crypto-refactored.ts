/**
 * Refactored E2EE cryptographic utilities with modular architecture
 */

import { SECURITY_CONSTANTS } from './security-constants'
import { nonBlockingDelay } from './crypto-utils'
import { KeyDerivation } from './key-derivation'
import { EncryptionService, EncryptedData } from './encryption'
import { PasswordVerification } from './password-verification'
import { GroupRateLimiter } from './group-rate-limiter'

// Re-export types and interfaces
export type { EncryptedData } from './encryption'

export interface E2eeKeyData {
  salt: string
  iterations: number
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
 * Browser-side password session management with enhanced security and per-group rate limiting
 */
export class PasswordSession {
  private static passwords = new Map<string, string>() // groupId -> password
  private static readonly MAX_PASSWORD_AGE = SECURITY_CONSTANTS.PASSWORD_SESSION_TIMEOUT
  private static passwordTimestamps = new Map<string, number>() // groupId -> timestamp
  private static wipeScheduled = new Set<string>() // groupIds scheduled for secure wipe
  private static cleanupListeners = new Map<string, Array<() => void>>() // groupId -> cleanup functions

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
    // Process passwords one at a time to prevent memory doubling
    const passwordEntries = Array.from(this.passwords.entries())
    
    // Clear maps first to prevent access during cleanup
    this.passwords.clear()
    this.passwordTimestamps.clear()
    this.cleanupListeners.clear()
    this.wipeScheduled.clear()
    
    // Securely wipe passwords one by one
    for (const [groupId, password] of passwordEntries) {
      if (password) {
        await SecureMemory.secureWipeString(password)
      }
    }
    
    // Clean up all group rate limiters
    GroupRateLimiter.destroyAll()
  }

  static hasPassword(groupId: string): boolean {
    return this.getPassword(groupId) !== undefined
  }

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

/**
 * Legacy PasswordCrypto class - delegates to new modular services
 * @deprecated Use KeyDerivation, EncryptionService, and PasswordVerification directly
 */
export class PasswordCrypto {
  /**
   * Generate a random salt for key derivation
   */
  static generateSalt(): string {
    return KeyDerivation.generateSalt()
  }

  /**
   * Derive AES key from password using PBKDF2
   */
  static async deriveKeyFromPassword(
    password: string,
    salt: string,
    iterations?: number
  ): Promise<CryptoKey> {
    return KeyDerivation.deriveKeyFromPassword(password, salt, iterations)
  }

  /**
   * Encrypt data with AES-GCM
   */
  static async encryptData(
    data: string,
    key: CryptoKey
  ): Promise<EncryptedData> {
    return EncryptionService.encryptData(data, key)
  }

  /**
   * Decrypt data with AES-GCM
   */
  static async decryptData(
    encryptedData: string,
    iv: string,
    key: CryptoKey
  ): Promise<string> {
    return EncryptionService.decryptData(encryptedData, iv, key)
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
    return EncryptionService.encryptExpenseData(title, notes, password, salt)
  }

  /**
   * Decrypt expense sensitive data with validation and per-group rate limiting
   */
  static async decryptExpenseData(
    encryptedData: string,
    iv: string,
    password: string,
    salt: string,
    groupId?: string
  ): Promise<{ title: string; notes?: string }> {
    // Apply per-group rate limiting if groupId is provided
    if (groupId) {
      const rateLimiter = GroupRateLimiter.getGroupLimiter(groupId, 'decryption')
      const isBlocked = await rateLimiter.recordAttempt()
      if (isBlocked) {
        throw new Error('Too many decryption attempts. Please try again later.')
      }
    }
    
    try {
      const result = await EncryptionService.decryptExpenseData(encryptedData, iv, password, salt)
      
      // Reset rate limits on successful decryption
      if (groupId) {
        const rateLimiter = GroupRateLimiter.getGroupLimiter(groupId, 'decryption')
        rateLimiter.reset()
      }
      
      return result
    } catch (error) {
      // Add delay on failed attempts
      if (groupId) {
        await nonBlockingDelay(500 + Math.random() * 500) // 0.5-1 second delay
      }
      throw error
    }
  }

  /**
   * Verify password by attempting to decrypt a test payload with per-group rate limiting
   */
  static async verifyPassword(
    testEncryptedData: string,
    testIv: string,
    password: string,
    salt: string,
    groupId?: string
  ): Promise<boolean> {
    // Apply per-group rate limiting if groupId is provided
    if (groupId) {
      const rateLimiter = GroupRateLimiter.getGroupLimiter(groupId, 'verification')
      const isBlocked = await rateLimiter.recordAttempt()
      if (isBlocked) {
        throw new Error('Too many verification attempts. Please try again later.')
      }
    }
    
    try {
      const result = await PasswordVerification.verifyPassword(testEncryptedData, testIv, password, salt)
      
      // Reset rate limits on successful verification
      if (groupId && result) {
        const rateLimiter = GroupRateLimiter.getGroupLimiter(groupId, 'verification')
        rateLimiter.reset()
      }
      
      return result
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
    return PasswordVerification.createPasswordTest(password, salt)
  }
}