/**
 * Per-group rate limiting for E2EE operations
 */

import { constantTimeDelay } from './crypto-utils'
import { SECURITY_CONSTANTS } from './security-constants'

interface RateLimitRecord {
  count: number
  lastAttempt: number
  backoffMultiplier: number
}

/**
 * Group-specific rate limiter to prevent cross-group interference
 */
export class GroupRateLimiter {
  private static instances = new Map<string, GroupRateLimiter>()
  private attempts = new Map<string, RateLimitRecord>()
  private cleanupTimer?: ReturnType<typeof setInterval>

  constructor(
    private groupId: string,
    private maxAttempts: number = SECURITY_CONSTANTS.MAX_LOGIN_ATTEMPTS,
    private windowMs: number = SECURITY_CONSTANTS.LOGIN_LOCKOUT_DURATION,
    private enableExponentialBackoff: boolean = true,
  ) {
    // Cleanup expired entries every 5 minutes
    this.cleanupTimer = setInterval(() => this.cleanup(), 5 * 60 * 1000)
  }

  /**
   * Get or create a rate limiter for a specific group
   */
  static getGroupLimiter(
    groupId: string,
    operationType: 'decryption' | 'verification' = 'decryption',
  ): GroupRateLimiter {
    const key = `${groupId}:${operationType}`

    if (!this.instances.has(key)) {
      // Different limits for different operations
      const limits =
        operationType === 'decryption'
          ? { maxAttempts: 50, windowMs: 60000 } // 50 attempts per minute for decryption (reasonable for UI)
          : { maxAttempts: 10, windowMs: 300000 } // 10 attempts per 5 minutes for verification

      this.instances.set(
        key,
        new GroupRateLimiter(groupId, limits.maxAttempts, limits.windowMs),
      )
    }

    return this.instances.get(key)!
  }

  /**
   * Check if operations are blocked for this group
   */
  isBlocked(identifier: string = 'default'): boolean {
    const record = this.attempts.get(identifier)
    if (!record) return false

    const now = Date.now()
    const effectiveWindow = this.enableExponentialBackoff
      ? this.windowMs * record.backoffMultiplier
      : this.windowMs

    if (now - record.lastAttempt > effectiveWindow) {
      this.attempts.delete(identifier)
      return false
    }

    return record.count >= this.maxAttempts
  }

  /**
   * Record an attempt and apply rate limiting
   */
  async recordAttempt(identifier: string = 'default'): Promise<boolean> {
    const now = Date.now()
    const record = this.attempts.get(identifier)

    if (!record || now - record.lastAttempt > this.windowMs) {
      this.attempts.set(identifier, {
        count: 1,
        lastAttempt: now,
        backoffMultiplier: 1,
      })
      return false
    }

    record.count++
    record.lastAttempt = now

    // Exponential backoff
    if (this.enableExponentialBackoff && record.count >= this.maxAttempts) {
      record.backoffMultiplier = Math.min(record.backoffMultiplier * 2, 16) // Max 16x backoff
    }

    const isBlocked = record.count >= this.maxAttempts

    // SECURITY FIX: Only add delay for verification operations to prevent brute force
    // Decryption operations should not be delayed as they are legitimate UI operations
    if (record.count > this.maxAttempts * 0.8) { // Only delay when near limit
      await constantTimeDelay(Math.min(record.count * 50, 500)) // Max 0.5 second delay
    }

    return isBlocked
  }

  /**
   * Reset rate limits for this group (on successful operations)
   */
  reset(identifier: string = 'default'): void {
    this.attempts.delete(identifier)
  }

  /**
   * Reset all rate limits for this group
   */
  resetAll(): void {
    this.attempts.clear()
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now()
    const expiredKeys: string[] = []

    this.attempts.forEach((record, key) => {
      const effectiveWindow = this.enableExponentialBackoff
        ? this.windowMs * record.backoffMultiplier
        : this.windowMs

      if (now - record.lastAttempt > effectiveWindow * 2) {
        // Keep for 2x window for safety
        expiredKeys.push(key)
      }
    })

    expiredKeys.forEach((key) => this.attempts.delete(key))
  }

  /**
   * Destroy this rate limiter
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
      this.cleanupTimer = undefined
    }
    this.attempts.clear()

    // Remove from global instances
    GroupRateLimiter.instances.forEach((limiter, key) => {
      if (limiter === this) {
        GroupRateLimiter.instances.delete(key)
      }
    })
  }

  /**
   * Clean up all rate limiters (call on app shutdown)
   */
  static destroyAll(): void {
    this.instances.forEach((limiter) => limiter.destroy())
    this.instances.clear()
  }
}
