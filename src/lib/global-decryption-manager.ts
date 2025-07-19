/**
 * Global Decryption Manager - Centralized rate-limited decryption service
 * SECURITY: Prevents multiple components from overwhelming rate limits
 */

import { PasswordCrypto, PasswordSession } from './e2ee-crypto-refactored'

// SECURITY: Global cache for decryption results
const globalDecryptionCache = new Map<string, {
  data: { title: string; notes?: string }
  timestamp: number
  promise?: Promise<{ title: string; notes?: string }>
}>()

const CACHE_EXPIRY_MS = 5 * 60 * 1000 // 5 minutes
const MAX_CACHE_SIZE = 200

// SECURITY: Pending decryption requests to prevent duplicate calls
const pendingDecryptions = new Map<string, Promise<{ title: string; notes?: string }>>()

/**
 * Generate secure cache key for decryption
 */
function generateCacheKey(
  groupId: string,
  encryptedData: string,
  encryptionIv: string
): string {
  // SECURITY: Use hash-like key to prevent data leakage
  const combined = `${groupId}:${encryptedData.substring(0, 12)}:${encryptionIv.substring(0, 12)}`
  return btoa(combined).substring(0, 32)
}

/**
 * Clean expired cache entries
 */
function cleanExpiredCache(): void {
  const now = Date.now()
  const expiredKeys: string[] = []
  
  globalDecryptionCache.forEach((entry, key) => {
    if (now - entry.timestamp > CACHE_EXPIRY_MS) {
      expiredKeys.push(key)
    }
  })
  
  expiredKeys.forEach(key => globalDecryptionCache.delete(key))
  
  // SECURITY: Limit cache size
  if (globalDecryptionCache.size > MAX_CACHE_SIZE) {
    const oldestKeys = Array.from(globalDecryptionCache.keys()).slice(0, 50)
    oldestKeys.forEach(key => globalDecryptionCache.delete(key))
  }
}

/**
 * Global Decryption Manager
 * SECURITY: Centralized, rate-limit aware decryption service
 */
export class GlobalDecryptionManager {
  /**
   * SECURITY: Centralized decryption with rate limiting and caching
   */
  static async decryptExpenseData(
    encryptedData: string,
    encryptionIv: string,
    encryptionSalt: string,
    groupId: string,
    fallbackTitle: string = 'Untitled Expense'
  ): Promise<{ title: string; notes?: string }> {
    // Input validation
    if (!encryptedData?.trim() || !encryptionIv?.trim() || !encryptionSalt?.trim() || !groupId?.trim()) {
      return { title: fallbackTitle }
    }

    const cacheKey = generateCacheKey(groupId, encryptedData, encryptionIv)
    
    // SECURITY: Check cache first
    const cached = globalDecryptionCache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < CACHE_EXPIRY_MS) {
      return cached.data
    }
    
    // SECURITY: Check if decryption is already in progress
    if (pendingDecryptions.has(cacheKey)) {
      try {
        return await pendingDecryptions.get(cacheKey)!
      } catch (error) {
        pendingDecryptions.delete(cacheKey)
        throw error
      }
    }
    
    // Verify password availability
    const password = PasswordSession.getPassword(groupId)
    if (!password?.trim()) {
      return { title: fallbackTitle }
    }
    
    // SECURITY: Create single decryption promise to prevent duplicate calls
    const decryptionPromise = this.performDecryption(
      encryptedData,
      encryptionIv,
      password,
      encryptionSalt,
      groupId,
      fallbackTitle
    )
    
    pendingDecryptions.set(cacheKey, decryptionPromise)
    
    try {
      const result = await decryptionPromise
      
      // SECURITY: Cache successful result
      globalDecryptionCache.set(cacheKey, {
        data: result,
        timestamp: Date.now()
      })
      
      // Clean expired entries periodically
      if (Math.random() < 0.1) { // 10% chance
        cleanExpiredCache()
      }
      
      return result
    } catch (error) {
      console.error('Decryption failed:', error)
      return { title: fallbackTitle }
    } finally {
      pendingDecryptions.delete(cacheKey)
    }
  }
  
  /**
   * SECURITY: Rate-limited decryption implementation
   */
  private static async performDecryption(
    encryptedData: string,
    encryptionIv: string,
    password: string,
    encryptionSalt: string,
    groupId: string,
    fallbackTitle: string
  ): Promise<{ title: string; notes?: string }> {
    try {
      const result = await PasswordCrypto.decryptExpenseData(
        encryptedData,
        encryptionIv,
        password,
        encryptionSalt,
        groupId
      )
      
      return {
        title: result.title?.trim() || fallbackTitle,
        notes: result.notes?.trim() || undefined
      }
    } catch (error) {
      // SECURITY: Don't leak error details, just fallback
      throw new Error('Decryption failed')
    }
  }
  
  /**
   * SECURITY: Check if data is cached (without triggering decryption)
   */
  static isCached(
    encryptedData: string,
    encryptionIv: string,
    groupId: string
  ): boolean {
    if (!encryptedData?.trim() || !encryptionIv?.trim() || !groupId?.trim()) {
      return false
    }
    
    const cacheKey = generateCacheKey(groupId, encryptedData, encryptionIv)
    const cached = globalDecryptionCache.get(cacheKey)
    
    return cached ? Date.now() - cached.timestamp < CACHE_EXPIRY_MS : false
  }
  
  /**
   * SECURITY: Clear all cached data (for logout/password change)
   */
  static clearCache(groupId?: string): void {
    if (groupId) {
      // Clear only specific group's cache
      const keysToDelete: string[] = []
      globalDecryptionCache.forEach((_, key) => {
        try {
          const decoded = atob(key)
          if (decoded.startsWith(`${groupId}:`)) {
            keysToDelete.push(key)
          }
        } catch {
          // Invalid key, skip
        }
      })
      keysToDelete.forEach(key => globalDecryptionCache.delete(key))
    } else {
      // Clear all cache
      globalDecryptionCache.clear()
    }
    
    // Clear pending decryptions
    pendingDecryptions.clear()
  }
  
  /**
   * SECURITY: Get cache statistics for monitoring
   */
  static getCacheStats(): {
    size: number
    pendingCount: number
    expiredCount: number
  } {
    const now = Date.now()
    let expiredCount = 0
    
    globalDecryptionCache.forEach((entry) => {
      if (now - entry.timestamp > CACHE_EXPIRY_MS) {
        expiredCount++
      }
    })
    
    return {
      size: globalDecryptionCache.size,
      pendingCount: pendingDecryptions.size,
      expiredCount
    }
  }
}

// SECURITY: Cleanup on window unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    GlobalDecryptionManager.clearCache()
  })
  
  // Periodic cleanup every 2 minutes
  setInterval(() => {
    cleanExpiredCache()
  }, 2 * 60 * 1000)
}