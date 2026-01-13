/**
 * Rate limiter tests
 */

import {
  checkRateLimit,
  clearAttempts,
  getRateLimitConfig,
  recordFailedAttempt,
} from './rate-limit'

describe('rate-limit', () => {
  const testEmail = 'test@example.com'

  beforeEach(() => {
    // Clear attempts before each test
    clearAttempts(testEmail)
  })

  describe('checkRateLimit', () => {
    it('should allow first attempt', () => {
      const result = checkRateLimit(testEmail)
      expect(result.isLimited).toBe(false)
      expect(result.remainingAttempts).toBe(5)
    })

    it('should track remaining attempts after failures', () => {
      recordFailedAttempt(testEmail)
      const result = checkRateLimit(testEmail)
      expect(result.isLimited).toBe(false)
      expect(result.remainingAttempts).toBe(4)
    })

    it('should limit after max attempts', () => {
      const { maxAttempts } = getRateLimitConfig()

      // Record max failed attempts
      for (let i = 0; i < maxAttempts; i++) {
        recordFailedAttempt(testEmail)
      }

      const result = checkRateLimit(testEmail)
      expect(result.isLimited).toBe(true)
      expect(result.retryAfter).toBeGreaterThan(0)
    })

    it('should be case insensitive', () => {
      recordFailedAttempt('TEST@EXAMPLE.COM')
      const result = checkRateLimit('test@example.com')
      expect(result.remainingAttempts).toBe(4)
    })
  })

  describe('recordFailedAttempt', () => {
    it('should increment attempt count', () => {
      recordFailedAttempt(testEmail)
      recordFailedAttempt(testEmail)

      const result = checkRateLimit(testEmail)
      expect(result.remainingAttempts).toBe(3) // 5 - 2 = 3
    })
  })

  describe('clearAttempts', () => {
    it('should reset attempts on successful login', () => {
      // Record some failed attempts
      recordFailedAttempt(testEmail)
      recordFailedAttempt(testEmail)

      // Verify attempts recorded
      let result = checkRateLimit(testEmail)
      expect(result.remainingAttempts).toBe(3)

      // Clear attempts (simulating successful login)
      clearAttempts(testEmail)

      // Should be back to full attempts
      result = checkRateLimit(testEmail)
      expect(result.isLimited).toBe(false)
      expect(result.remainingAttempts).toBe(5)
    })
  })

  describe('getRateLimitConfig', () => {
    it('should return configuration values', () => {
      const config = getRateLimitConfig()
      expect(config.maxAttempts).toBe(5)
      expect(config.windowMs).toBe(15 * 60 * 1000)
      expect(config.lockoutMs).toBe(30 * 60 * 1000)
    })
  })
})
