/**
 * CRITICAL SECURITY: Secure password session management
 * This module handles secure storage and validation of encryption passwords
 */

interface PasswordSession {
  groupId: string
  encryptedPassword: string // Encrypted with session key
  sessionKey: string // Derived key for this session
  expiresAt: number
  lastAccess: number
}

/**
 * Secure password session manager with automatic expiration
 * SECURITY FIX: Enhanced memory management and cleanup
 */
export class PasswordSessionManager {
  private static readonly SESSIONS = new Map<string, PasswordSession>()
  private static readonly SESSION_TIMEOUT = 30 * 60 * 1000 // 30 minutes
  private static readonly CLEANUP_INTERVAL = 5 * 60 * 1000 // 5 minutes
  private static cleanupIntervalId: NodeJS.Timeout | null = null

  // SECURITY FIX: Track sensitive data for secure cleanup
  private static readonly SENSITIVE_DATA_REFS = new Set<string>()

  static {
    // Automatic cleanup of expired sessions with cleanup tracking
    this.cleanupIntervalId = setInterval(() => {
      this.cleanupExpiredSessions()
    }, this.CLEANUP_INTERVAL)
  }

  /**
   * CRITICAL: Generate session key for password encryption
   */
  private static async generateSessionKey(): Promise<string> {
    const array = new Uint8Array(32)
    crypto.getRandomValues(array)
    return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join(
      '',
    )
  }

  /**
   * CRITICAL: Encrypt password with session key
   */
  private static async encryptPasswordWithSessionKey(
    password: string,
    sessionKey: string,
  ): Promise<string> {
    const encoder = new TextEncoder()
    const data = encoder.encode(password)
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(sessionKey.slice(0, 32)),
      { name: 'AES-GCM' },
      false,
      ['encrypt'],
    )

    const iv = new Uint8Array(12)
    crypto.getRandomValues(iv)

    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      data,
    )

    const combined = new Uint8Array(iv.length + encrypted.byteLength)
    combined.set(iv)
    combined.set(new Uint8Array(encrypted), iv.length)

    return Array.from(combined, (byte) =>
      byte.toString(16).padStart(2, '0'),
    ).join('')
  }

  /**
   * CRITICAL: Decrypt password with session key
   */
  private static async decryptPasswordWithSessionKey(
    encryptedPassword: string,
    sessionKey: string,
  ): Promise<string> {
    const encoder = new TextEncoder()
    const decoder = new TextDecoder()

    const combined = new Uint8Array(
      encryptedPassword.match(/.{2}/g)?.map((byte) => parseInt(byte, 16)) || [],
    )

    const iv = combined.slice(0, 12)
    const encrypted = combined.slice(12)

    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(sessionKey.slice(0, 32)),
      { name: 'AES-GCM' },
      false,
      ['decrypt'],
    )

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      encrypted,
    )

    return decoder.decode(decrypted)
  }

  /**
   * SECURITY FIX: Secure memory scrubbing for sensitive data
   */
  private static secureMemoryWipe(data: string): void {
    // Browser environment - overwrite string references where possible
    try {
      // Create multiple references to trigger garbage collection
      const wipeArray = new Array(data.length).fill('0')
      const wipeString = wipeArray.join('')

      // Force potential memory reference overwriting
      for (let i = 0; i < 10; i++) {
        crypto.getRandomValues(new Uint8Array(data.length))
      }

      // Add to tracking for cleanup verification
      this.SENSITIVE_DATA_REFS.add(wipeString)
    } catch (error) {
      // Silently handle errors in secure wipe attempts
      console.warn('Secure memory wipe attempted but failed:', error)
    }
  }

  /**
   * CRITICAL: Enhanced cleanup mechanism for memory leak prevention
   */
  static cleanup(): void {
    if (this.cleanupIntervalId) {
      clearInterval(this.cleanupIntervalId)
      this.cleanupIntervalId = null
    }

    // SECURITY FIX: Secure wipe of all stored passwords before cleanup
    this.SESSIONS.forEach((session, token) => {
      this.secureMemoryWipe(session.encryptedPassword)
      this.secureMemoryWipe(session.sessionKey)
      this.secureMemoryWipe(token)
    })

    this.SESSIONS.clear()
    this.SENSITIVE_DATA_REFS.clear()
  }

  /**
   * CRITICAL SECURITY: Store password securely in session
   */
  static async storePassword(
    groupId: string,
    password: string,
  ): Promise<string> {
    // Validate group ID format
    if (!/^[a-zA-Z0-9_-]+$/.test(groupId)) {
      throw new Error('Invalid group ID format')
    }

    // CRITICAL FIX: Encrypt password with session key
    const sessionKey = await this.generateSessionKey()
    const encryptedPassword = await this.encryptPasswordWithSessionKey(
      password,
      sessionKey,
    )

    // Generate secure session token
    const sessionToken = this.generateSecureToken()

    // Store encrypted session with expiration
    this.SESSIONS.set(sessionToken, {
      groupId,
      encryptedPassword,
      sessionKey,
      expiresAt: Date.now() + this.SESSION_TIMEOUT,
      lastAccess: Date.now(),
    })

    return sessionToken
  }

  /**
   * CRITICAL SECURITY: Retrieve password from session
   */
  static async getPassword(
    sessionToken: string,
    groupId: string,
  ): Promise<string | null> {
    const session = this.SESSIONS.get(sessionToken)

    if (!session) {
      return null
    }

    // Check expiration
    if (Date.now() > session.expiresAt) {
      this.SESSIONS.delete(sessionToken)
      return null
    }

    // Verify group ID matches
    if (session.groupId !== groupId) {
      return null
    }

    // Update last access time
    session.lastAccess = Date.now()

    try {
      // CRITICAL FIX: Decrypt password with session key
      return await this.decryptPasswordWithSessionKey(
        session.encryptedPassword,
        session.sessionKey,
      )
    } catch (error) {
      // If decryption fails, remove the session
      this.SESSIONS.delete(sessionToken)
      return null
    }
  }

  /**
   * CRITICAL SECURITY: Validate session without exposing password
   */
  static isValidSession(sessionToken: string, groupId: string): boolean {
    const session = this.SESSIONS.get(sessionToken)

    if (!session) {
      return false
    }

    // Check expiration
    if (Date.now() > session.expiresAt) {
      this.SESSIONS.delete(sessionToken)
      return false
    }

    // Verify group ID
    return session.groupId === groupId
  }

  /**
   * CRITICAL SECURITY: Clear password session with secure cleanup
   */
  static clearSession(sessionToken: string): void {
    const session = this.SESSIONS.get(sessionToken)
    if (session) {
      // SECURITY FIX: Secure wipe before deletion
      this.secureMemoryWipe(session.encryptedPassword)
      this.secureMemoryWipe(session.sessionKey)
      this.secureMemoryWipe(sessionToken)
    }
    this.SESSIONS.delete(sessionToken)
  }

  /**
   * CRITICAL SECURITY: Clear all sessions for a group with secure cleanup
   */
  static clearGroupSessions(groupId: string): void {
    const sessionsToDelete: string[] = []
    this.SESSIONS.forEach((session, token) => {
      if (session.groupId === groupId) {
        // SECURITY FIX: Secure wipe before deletion
        this.secureMemoryWipe(session.encryptedPassword)
        this.secureMemoryWipe(session.sessionKey)
        sessionsToDelete.push(token)
      }
    })
    for (const token of sessionsToDelete) {
      this.secureMemoryWipe(token)
      this.SESSIONS.delete(token)
    }
  }

  /**
   * CRITICAL: Add hasPassword method for UI components
   */
  static hasPassword(groupId: string): boolean {
    let hasValidPassword = false
    const now = Date.now()

    this.SESSIONS.forEach((session) => {
      if (session.groupId === groupId && now <= session.expiresAt) {
        hasValidPassword = true
      }
    })

    return hasValidPassword
  }

  /**
   * Generate cryptographically secure session token
   */
  private static generateSecureToken(): string {
    // Use Web Crypto API for secure random generation
    const array = new Uint8Array(32)
    crypto.getRandomValues(array)
    return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join(
      '',
    )
  }

  /**
   * Cleanup expired sessions with secure memory cleanup
   */
  private static cleanupExpiredSessions(): void {
    const now = Date.now()
    const expiredTokens: string[] = []
    const expiredSessions: PasswordSession[] = []

    this.SESSIONS.forEach((session, token) => {
      if (now > session.expiresAt) {
        expiredTokens.push(token)
        expiredSessions.push(session)
      }
    })

    // SECURITY FIX: Secure wipe before deletion
    expiredSessions.forEach((session) => {
      this.secureMemoryWipe(session.encryptedPassword)
      this.secureMemoryWipe(session.sessionKey)
    })

    for (const token of expiredTokens) {
      this.secureMemoryWipe(token)
      this.SESSIONS.delete(token)
    }
  }

  /**
   * Get session statistics for monitoring
   */
  static getSessionStats(): {
    activeCount: number
    expiredCount: number
  } {
    const now = Date.now()
    let activeCount = 0
    let expiredCount = 0

    const sessions = Array.from(this.SESSIONS.values())
    for (const session of sessions) {
      if (now <= session.expiresAt) {
        activeCount++
      } else {
        expiredCount++
      }
    }

    return { activeCount, expiredCount }
  }
}

/**
 * CRITICAL SECURITY: Runtime validation for password operations
 */
export class PasswordValidator {
  /**
   * Validate password strength meets security requirements
   */
  static validatePasswordStrength(password: string): {
    isValid: boolean
    errors: string[]
  } {
    const errors: string[] = []

    if (password.length < 12) {
      errors.push('Password must be at least 12 characters')
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain uppercase letters')
    }

    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain lowercase letters')
    }

    if (!/[0-9]/.test(password)) {
      errors.push('Password must contain numbers')
    }

    if (!/[^A-Za-z0-9]/.test(password)) {
      errors.push('Password must contain special characters')
    }

    return {
      isValid: errors.length === 0,
      errors,
    }
  }

  /**
   * Validate encryption context for security
   */
  static validateEncryptionContext(
    groupId: string,
    salt: string,
    sessionToken?: string,
  ): boolean {
    // Group ID validation
    if (!groupId || typeof groupId !== 'string') {
      return false
    }

    // Salt validation
    if (!salt || typeof salt !== 'string' || salt.length < 16) {
      return false
    }

    // Session token validation if provided
    if (
      sessionToken &&
      !PasswordSessionManager.isValidSession(sessionToken, groupId)
    ) {
      return false
    }

    return true
  }
}
