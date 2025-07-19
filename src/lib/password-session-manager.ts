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
 */
export class PasswordSessionManager {
  private static readonly SESSIONS = new Map<string, PasswordSession>()
  private static readonly SESSION_TIMEOUT = 30 * 60 * 1000 // 30 minutes
  private static readonly CLEANUP_INTERVAL = 5 * 60 * 1000 // 5 minutes
  private static cleanupIntervalId: NodeJS.Timeout | null = null

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
   * CRITICAL: Cleanup mechanism for memory leak prevention
   */
  static cleanup(): void {
    if (this.cleanupIntervalId) {
      clearInterval(this.cleanupIntervalId)
      this.cleanupIntervalId = null
    }
    this.SESSIONS.clear()
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
   * CRITICAL SECURITY: Clear password session
   */
  static clearSession(sessionToken: string): void {
    this.SESSIONS.delete(sessionToken)
  }

  /**
   * CRITICAL SECURITY: Clear all sessions for a group
   */
  static clearGroupSessions(groupId: string): void {
    const sessionsToDelete: string[] = []
    this.SESSIONS.forEach((session, token) => {
      if (session.groupId === groupId) {
        sessionsToDelete.push(token)
      }
    })
    for (const token of sessionsToDelete) {
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
   * Cleanup expired sessions
   */
  private static cleanupExpiredSessions(): void {
    const now = Date.now()
    const expiredTokens: string[] = []
    this.SESSIONS.forEach((session, token) => {
      if (now > session.expiresAt) {
        expiredTokens.push(token)
      }
    })
    for (const token of expiredTokens) {
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
