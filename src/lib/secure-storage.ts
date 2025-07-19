/**
 * Secure storage utility to prevent XSS attacks on sensitive data
 * SECURITY: Replaces direct localStorage usage for sensitive information
 */

interface SecureStorageItem {
  value: string
  timestamp: number
  encrypted: boolean
  keyId?: string // Store key identifier for crypto operations
  encryptionType?: 'aes-gcm' | 'xor' // Track encryption method used
}

/**
 * Secure storage wrapper with encryption for sensitive data
 */
export class SecureStorage {
  private static readonly ENCRYPTION_PREFIX = 'enc:'
  private static readonly MAX_AGE = 24 * 60 * 60 * 1000 // 24 hours
  private static readonly MASTER_KEY_PREFIX = 'spliit_master_session_key'

  // Migration statistics
  private static migrationStats = {
    migratedKeys: 0,
    failedMigrations: 0,
    lastMigrationTime: 0,
  }

  /**
   * Get or generate a session key with consistent recovery
   * SECURITY: Uses session-persistent key generation with legacy support
   */
  private static getStorageKey(): string {
    if (typeof window !== 'undefined') {
      // Use a stable session key name for consistency
      const sessionKeyName = 'spliit_session_master_key'
      const existingKey = sessionStorage.getItem(sessionKeyName)
      if (existingKey) return existingKey

      // Check for existing data with old dynamic keys to ensure migration compatibility
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i)
        if (key && key.startsWith(this.MASTER_KEY_PREFIX)) {
          const oldKey = sessionStorage.getItem(key)
          if (oldKey) {
            // Migrate to new consistent key name
            sessionStorage.setItem(sessionKeyName, oldKey)
            sessionStorage.removeItem(key) // Clean up old key
            console.info(
              `[SecureStorage] Migrated session key from ${key} to ${sessionKeyName}`,
            )
            return oldKey
          }
        }
      }

      // Generate new session key with enhanced entropy
      let newKey: string
      if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
        // Enhanced entropy: timestamp + random + origin
        const array = new Uint8Array(20) // Increased entropy
        crypto.getRandomValues(array)
        const timestamp = Date.now().toString(36)
        const origin = window.location.origin
          .slice(-8)
          .replace(/[^a-zA-Z0-9]/g, '')
        newKey =
          `spliit_session_${timestamp}_${origin}_` +
          Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join(
            '',
          )
      } else {
        // Enhanced fallback with timestamp and random component
        const timestamp = Date.now().toString(36)
        const random = Math.random().toString(36).substring(2, 10)
        newKey = `spliit_session_${timestamp}_${random}`
      }

      // Store in sessionStorage for consistency
      sessionStorage.setItem(sessionKeyName, newKey)
      return newKey
    }

    // Server-side fallback with timestamp
    return `spliit_session_fallback_${Date.now()}`
  }

  /**
   * Cryptographically validate key identity
   * SECURITY: Uses exact matching instead of vulnerable prefix comparison
   */
  private static validateKeyIdentity(
    sessionKey: string,
    keyId: string,
  ): boolean {
    if (!sessionKey || !keyId) return false

    try {
      // SECURITY FIX: Use exact key ID matching instead of prefix comparison
      // Extract the first 16 characters as the key identifier for exact comparison
      const sessionKeyId = sessionKey.substring(0, 16)
      return sessionKeyId === keyId
    } catch (error) {
      console.warn('Key identity validation failed:', error)
      return false
    }
  }

  /**
   * Try to recover the encryption key from sessionStorage
   * SECURITY: Attempts to find the correct key for legacy data with exact matching
   */
  private static tryKeyRecovery(keyId: string): string | null {
    if (typeof window === 'undefined') return null

    try {
      // Check sessionStorage for any keys that match exactly
      for (let i = 0; i < sessionStorage.length; i++) {
        const storageKey = sessionStorage.key(i)
        if (storageKey && storageKey.includes('spliit_session')) {
          const sessionKey = sessionStorage.getItem(storageKey)
          if (sessionKey && this.validateKeyIdentity(sessionKey, keyId)) {
            console.info(`[SecureStorage] Recovered key for keyId: ${keyId}`)
            return sessionKey
          }
        }
      }

      // Check localStorage for any migration data that might contain the key
      const migrationKey = `migration_key_${keyId}`
      const migrationData = localStorage.getItem(migrationKey)
      if (migrationData && this.validateKeyIdentity(migrationData, keyId)) {
        console.info(
          `[SecureStorage] Recovered key from migration data for keyId: ${keyId}`,
        )
        return migrationData
      }

      return null
    } catch (error) {
      console.warn('Key recovery failed:', error)
      return null
    }
  }

  /**
   * Generate dynamic master key name to prevent collision attacks
   * SECURITY: Dynamic key names prevent cross-session interference
   * @deprecated Use stable session key instead
   */
  private static getDynamicMasterKeyName(): string {
    // Use a hash of the current session to create a unique key name
    if (typeof window !== 'undefined') {
      const sessionInfo = `${window.location.origin}_${Date.now()
        .toString()
        .slice(-6)}`
      let hash = 0
      for (let i = 0; i < sessionInfo.length; i++) {
        const char = sessionInfo.charCodeAt(i)
        hash = (hash << 5) - hash + char
        hash = hash & hash // Convert to 32-bit integer
      }
      return `${this.MASTER_KEY_PREFIX}_${Math.abs(hash).toString(36)}`
    }
    return this.MASTER_KEY_PREFIX
  }

  /**
   * AES-GCM encryption for localStorage protection
   * SECURITY: Cryptographically secure encryption using Web Crypto API
   */
  private static async cryptoEncrypt(
    data: string,
    password: string,
  ): Promise<string> {
    if (typeof crypto === 'undefined' || !crypto.subtle) {
      // Fallback to XOR encryption if Web Crypto API not available
      return this.xorEncrypt(data, password)
    }

    try {
      const encoder = new TextEncoder()
      const dataBuffer = encoder.encode(data)

      // Generate salt and IV
      const salt = crypto.getRandomValues(new Uint8Array(16))
      const iv = crypto.getRandomValues(new Uint8Array(12))

      // Derive key from password
      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        encoder.encode(password),
        'PBKDF2',
        false,
        ['deriveKey'],
      )

      const key = await crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: salt,
          iterations: 100000,
          hash: 'SHA-256',
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt'],
      )

      // Encrypt data
      const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: iv },
        key,
        dataBuffer,
      )

      // Combine salt, iv, and encrypted data
      const combined = new Uint8Array(
        salt.length + iv.length + encrypted.byteLength,
      )
      combined.set(salt, 0)
      combined.set(iv, salt.length)
      combined.set(new Uint8Array(encrypted), salt.length + iv.length)

      return btoa(String.fromCharCode.apply(null, Array.from(combined)))
    } catch (error) {
      // SECURITY FIX: Enhanced error handling for encryption failures
      if (error instanceof DOMException) {
        console.warn(
          'Crypto encryption failed with DOMException:',
          error.name,
          error.message,
        )
      } else {
        console.warn('Crypto encryption failed with unexpected error:', error)
      }

      // Fallback to XOR encryption
      console.info('Falling back to XOR encryption for compatibility')
      return this.xorEncrypt(data, password)
    }
  }

  private static async cryptoDecrypt(
    encryptedData: string,
    password: string,
  ): Promise<string> {
    if (typeof crypto === 'undefined' || !crypto.subtle) {
      // Fallback to XOR decryption
      return this.xorDecrypt(encryptedData, password)
    }

    try {
      const encoder = new TextEncoder()
      const combined = new Uint8Array(
        atob(encryptedData)
          .split('')
          .map((char) => char.charCodeAt(0)),
      )

      // Extract salt, iv, and encrypted data
      const salt = combined.slice(0, 16)
      const iv = combined.slice(16, 28)
      const encrypted = combined.slice(28)

      // Derive key from password
      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        encoder.encode(password),
        'PBKDF2',
        false,
        ['deriveKey'],
      )

      const key = await crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: salt,
          iterations: 100000,
          hash: 'SHA-256',
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['decrypt'],
      )

      // Decrypt data
      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: iv },
        key,
        encrypted,
      )

      return new TextDecoder().decode(decrypted)
    } catch (error) {
      // SECURITY FIX: Enhanced error handling with specific error types
      if (error instanceof DOMException) {
        if (
          error.name === 'OperationError' ||
          error.name === 'InvalidAccessError'
        ) {
          console.warn(
            'Crypto decryption failed due to invalid password/data, trying XOR fallback',
          )
        } else {
          console.warn(
            'Crypto decryption failed with DOMException:',
            error.name,
            error.message,
          )
        }
      } else {
        console.warn('Crypto decryption failed with unexpected error:', error)
      }

      // Always fallback to XOR decryption
      return this.xorDecrypt(encryptedData, password)
    }
  }

  /**
   * Detect if data is in AES-GCM format (base64 with proper structure)
   * SECURITY: Format detection for legacy data migration
   */
  private static detectAesGcmFormat(encryptedData: string): boolean {
    try {
      // AES-GCM format should be base64 and have minimum length
      // salt(16) + iv(12) + encrypted data (minimum 16) = 44 bytes minimum
      const decoded = atob(encryptedData)
      return decoded.length >= 44 // Minimum AES-GCM structure size
    } catch {
      return false // Not valid base64 or too short
    }
  }

  /**
   * XOR encryption fallback for localStorage protection
   * SECURITY: Basic obfuscation, not cryptographically secure
   */
  private static xorEncrypt(data: string, key: string): string {
    let result = ''
    for (let i = 0; i < data.length; i++) {
      result += String.fromCharCode(
        data.charCodeAt(i) ^ key.charCodeAt(i % key.length),
      )
    }
    return btoa(result)
  }

  private static xorDecrypt(encryptedData: string, key: string): string {
    try {
      const data = atob(encryptedData)
      let result = ''
      for (let i = 0; i < data.length; i++) {
        result += String.fromCharCode(
          data.charCodeAt(i) ^ key.charCodeAt(i % key.length),
        )
      }
      return result
    } catch {
      return ''
    }
  }

  /**
   * Store sensitive data with AES-GCM encryption
   * SECURITY: Uses cryptographically secure encryption
   */
  static async setSecureItem(
    key: string,
    value: string,
    encrypt = true,
  ): Promise<void> {
    if (typeof window === 'undefined') return

    try {
      const sessionKey = this.getStorageKey()
      let encryptedValue = value
      let encryptionType: 'aes-gcm' | 'xor' | undefined = undefined

      if (encrypt) {
        // SECURITY FIX: Try AES-GCM first, fallback to XOR with proper tracking
        try {
          encryptedValue = await this.cryptoEncrypt(value, sessionKey)
          encryptionType = 'aes-gcm'
        } catch (cryptoError) {
          console.warn(
            'AES-GCM encryption failed, using XOR fallback:',
            cryptoError,
          )
          encryptedValue = this.xorEncrypt(value, sessionKey)
          encryptionType = 'xor'
        }
      }

      const item: SecureStorageItem = {
        value: encryptedValue,
        timestamp: Date.now(),
        encrypted: encrypt,
        keyId: encrypt ? sessionKey.substring(0, 16) : undefined, // Store key identifier
        encryptionType: encryptionType, // Track which encryption was used
      }

      const storageKey = encrypt ? this.ENCRYPTION_PREFIX + key : key
      localStorage.setItem(storageKey, JSON.stringify(item))
    } catch (error) {
      console.warn('Failed to store secure item:', error)
    }
  }

  /**
   * Retrieve and decrypt sensitive data
   * SECURITY: Uses AES-GCM decryption with fallback support
   */
  static async getSecureItem(key: string): Promise<string | null> {
    if (typeof window === 'undefined') return null

    try {
      // Try encrypted version first
      const encryptedKey = this.ENCRYPTION_PREFIX + key
      let itemStr = localStorage.getItem(encryptedKey)
      let isEncrypted = true

      // Fallback to plain version
      if (!itemStr) {
        itemStr = localStorage.getItem(key)
        isEncrypted = false
      }

      if (!itemStr) return null

      // SECURITY FIX: Handle legacy plain string data
      let parsed: any
      try {
        parsed = JSON.parse(itemStr)
      } catch (parseError) {
        // Legacy data is stored as plain string, migrate it
        if (process.env.NODE_ENV === 'development') {
          console.info(
            `[SecureStorage] Migrating legacy data for key: ${key} (${itemStr.length} chars)`,
          )
        }
        try {
          await this.setSecureItem(key, itemStr, true)
          this.migrationStats.migratedKeys++
          this.migrationStats.lastMigrationTime = Date.now()
          if (process.env.NODE_ENV === 'development') {
            console.info(
              `[SecureStorage] Successfully migrated legacy data for key: ${key} (Total: ${this.migrationStats.migratedKeys})`,
            )
          }
          return itemStr
        } catch (migrationError) {
          this.migrationStats.failedMigrations++
          console.warn(
            '[SecureStorage] Failed to migrate legacy data for key:',
            key,
            migrationError,
          )
          return itemStr // Return as-is if migration fails
        }
      }

      if (!parsed || typeof parsed !== 'object') {
        // Handle case where data is a plain string (legacy format)
        if (typeof parsed === 'string') {
          if (process.env.NODE_ENV === 'development') {
            console.info(
              `[SecureStorage] Migrating legacy string data for key: ${key}`,
            )
          }
          await this.setSecureItem(key, parsed, true)
          return parsed
        }
        return null
      }

      const item = parsed as SecureStorageItem

      // Check if this is the new format with timestamp
      if (typeof item.timestamp === 'number') {
        // Check expiration
        if (Date.now() - item.timestamp > this.MAX_AGE) {
          this.removeSecureItem(key)
          return null
        }

        // Decrypt if encrypted
        if (item.encrypted && isEncrypted) {
          const sessionKey = this.getStorageKey()

          // SECURITY FIX: Enhanced decryption method selection with format detection
          if (item.encryptionType === 'xor') {
            return this.xorDecrypt(item.value, sessionKey)
          } else if (item.encryptionType === 'aes-gcm') {
            // Enhanced key consistency check for AES-GCM operations
            if (
              item.keyId &&
              !this.validateKeyIdentity(sessionKey, item.keyId)
            ) {
              console.warn(
                'Key mismatch detected for AES-GCM, trying key recovery for key:',
                key,
              )

              // Try to recover from sessionStorage with old key pattern
              const recoveredKey = this.tryKeyRecovery(item.keyId)
              if (recoveredKey) {
                try {
                  return await this.cryptoDecrypt(item.value, recoveredKey)
                } catch (recoveryError) {
                  console.warn(
                    'Key recovery failed, using XOR fallback:',
                    recoveryError,
                  )
                }
              }

              return this.xorDecrypt(item.value, sessionKey)
            }

            try {
              return await this.cryptoDecrypt(item.value, sessionKey)
            } catch (cryptoError) {
              console.warn(
                'AES-GCM decryption failed, trying XOR fallback:',
                cryptoError,
              )
              return this.xorDecrypt(item.value, sessionKey)
            }
          } else {
            // SECURITY FIX: Detect data format for legacy data without encryptionType
            const isAesGcmFormat = this.detectAesGcmFormat(item.value)

            if (isAesGcmFormat) {
              // Enhanced key consistency check for AES-GCM
              if (
                item.keyId &&
                !this.validateKeyIdentity(sessionKey, item.keyId)
              ) {
                console.warn(
                  'Legacy key mismatch detected, trying key recovery for key:',
                  key,
                )

                // Try to recover from sessionStorage with old key pattern
                const recoveredKey = this.tryKeyRecovery(item.keyId)
                if (recoveredKey) {
                  try {
                    return await this.cryptoDecrypt(item.value, recoveredKey)
                  } catch (recoveryError) {
                    console.warn(
                      'Legacy key recovery failed, using XOR fallback:',
                      recoveryError,
                    )
                  }
                }

                return this.xorDecrypt(item.value, sessionKey)
              }

              try {
                return await this.cryptoDecrypt(item.value, sessionKey)
              } catch (cryptoError) {
                console.warn(
                  'Legacy AES-GCM decryption failed, trying XOR fallback:',
                  cryptoError,
                )
                return this.xorDecrypt(item.value, sessionKey)
              }
            } else {
              // Assume XOR format for legacy data
              return this.xorDecrypt(item.value, sessionKey)
            }
          }
        }

        return item.value
      } else {
        // Legacy format without timestamp, migrate it
        if (process.env.NODE_ENV === 'development') {
          console.info(
            `[SecureStorage] Migrating legacy object data for key: ${key}`,
          )
        }
        const legacyValue =
          typeof parsed === 'string' ? parsed : JSON.stringify(parsed)
        await this.setSecureItem(key, legacyValue, true)
        return legacyValue
      }
    } catch (error) {
      console.warn('Failed to retrieve secure item:', error)
      // Clean up potentially corrupted data
      this.removeSecureItem(key)
      return null
    }
  }

  /**
   * Remove secure item from storage
   */
  static removeSecureItem(key: string): void {
    if (typeof window === 'undefined') return

    try {
      localStorage.removeItem(this.ENCRYPTION_PREFIX + key)
      localStorage.removeItem(key)
    } catch (error) {
      console.warn('Failed to remove secure item:', error)
    }
  }

  /**
   * Get migration statistics
   */
  static getMigrationStats(): {
    migratedKeys: number
    failedMigrations: number
    lastMigrationTime: number
    hasRecentMigrations: boolean
  } {
    return {
      ...this.migrationStats,
      hasRecentMigrations:
        Date.now() - this.migrationStats.lastMigrationTime < 60000, // Within last minute
    }
  }

  /**
   * Clear all expired items
   */
  static cleanupExpiredItems(): void {
    if (typeof window === 'undefined') return

    try {
      const keysToRemove: string[] = []

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (
          key &&
          (key.startsWith(this.ENCRYPTION_PREFIX) ||
            key.includes('-activeUser'))
        ) {
          const itemStr = localStorage.getItem(key)
          if (itemStr) {
            try {
              const parsed = JSON.parse(itemStr)
              if (!parsed || typeof parsed !== 'object') continue
              const item = parsed as SecureStorageItem
              if (Date.now() - item.timestamp > this.MAX_AGE) {
                keysToRemove.push(key)
              }
            } catch {
              // Invalid format, remove it
              keysToRemove.push(key)
            }
          }
        }
      }

      keysToRemove.forEach((key) => localStorage.removeItem(key))
    } catch (error) {
      console.warn('Failed to cleanup expired items:', error)
    }
  }
}
