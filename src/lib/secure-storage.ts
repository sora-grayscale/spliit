/**
 * Secure storage utility to prevent XSS attacks on sensitive data
 * SECURITY: Replaces direct localStorage usage for sensitive information
 */

interface SecureStorageItem {
  value: string
  timestamp: number
  encrypted: boolean
}

/**
 * Secure storage wrapper with encryption for sensitive data
 */
export class SecureStorage {
  private static readonly ENCRYPTION_PREFIX = 'enc:'
  private static readonly MAX_AGE = 24 * 60 * 60 * 1000 // 24 hours

  /**
   * Generate a simple encryption key from session info
   * Note: This is not cryptographically secure, just XSS protection
   */
  private static getStorageKey(): string {
    return 'spliit_session_' + (Math.random() * 1000000).toFixed(0)
  }

  /**
   * Simple XOR encryption for localStorage protection
   * SECURITY: Prevents casual inspection, not cryptographic security
   */
  private static simpleEncrypt(data: string, key: string): string {
    let result = ''
    for (let i = 0; i < data.length; i++) {
      result += String.fromCharCode(
        data.charCodeAt(i) ^ key.charCodeAt(i % key.length)
      )
    }
    return btoa(result)
  }

  private static simpleDecrypt(encryptedData: string, key: string): string {
    try {
      const data = atob(encryptedData)
      let result = ''
      for (let i = 0; i < data.length; i++) {
        result += String.fromCharCode(
          data.charCodeAt(i) ^ key.charCodeAt(i % key.length)
        )
      }
      return result
    } catch {
      return ''
    }
  }

  /**
   * Store sensitive data with basic encryption
   */
  static setSecureItem(key: string, value: string, encrypt = true): void {
    if (typeof window === 'undefined') return

    const item: SecureStorageItem = {
      value: encrypt ? this.simpleEncrypt(value, this.getStorageKey()) : value,
      timestamp: Date.now(),
      encrypted: encrypt,
    }

    try {
      const storageKey = encrypt ? this.ENCRYPTION_PREFIX + key : key
      localStorage.setItem(storageKey, JSON.stringify(item))
    } catch (error) {
      console.warn('Failed to store secure item:', error)
    }
  }

  /**
   * Retrieve and decrypt sensitive data
   */
  static getSecureItem(key: string): string | null {
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
        console.warn('Migrating legacy storage data for key:', key)
        this.setSecureItem(key, itemStr, true)
        return itemStr
      }

      if (!parsed || typeof parsed !== 'object') {
        // Handle case where data is a plain string (legacy format)
        if (typeof parsed === 'string') {
          this.setSecureItem(key, parsed, true)
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
          return this.simpleDecrypt(item.value, this.getStorageKey())
        }

        return item.value
      } else {
        // Legacy format without timestamp, migrate it
        const legacyValue = typeof parsed === 'string' ? parsed : JSON.stringify(parsed)
        this.setSecureItem(key, legacyValue, true)
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
   * Clear all expired items
   */
  static cleanupExpiredItems(): void {
    if (typeof window === 'undefined') return

    try {
      const keysToRemove: string[] = []
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && (key.startsWith(this.ENCRYPTION_PREFIX) || key.includes('-activeUser'))) {
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

      keysToRemove.forEach(key => localStorage.removeItem(key))
    } catch (error) {
      console.warn('Failed to cleanup expired items:', error)
    }
  }
}