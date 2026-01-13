/**
 * Simple in-memory rate limiter for authentication
 * Tracks failed login attempts by email address
 */

interface AttemptRecord {
  count: number
  firstAttempt: number
  lockedUntil?: number
}

const attempts = new Map<string, AttemptRecord>()

// Configuration
const MAX_ATTEMPTS = 5 // Max failed attempts before lockout
const WINDOW_MS = 15 * 60 * 1000 // 15 minute window
const LOCKOUT_MS = 30 * 60 * 1000 // 30 minute lockout after max attempts
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000 // Cleanup old entries every 5 minutes

// Periodic cleanup of expired entries
let cleanupInterval: NodeJS.Timeout | null = null

function startCleanup() {
  if (cleanupInterval) return
  cleanupInterval = setInterval(() => {
    const now = Date.now()
    const keysToDelete: string[] = []

    attempts.forEach((record, key) => {
      // Remove if window has passed and not locked
      if (!record.lockedUntil && now - record.firstAttempt > WINDOW_MS) {
        keysToDelete.push(key)
      }
      // Remove if lockout has expired
      if (record.lockedUntil && now > record.lockedUntil) {
        keysToDelete.push(key)
      }
    })

    keysToDelete.forEach((key) => attempts.delete(key))
  }, CLEANUP_INTERVAL_MS)
}

// Start cleanup on module load
if (typeof window === 'undefined') {
  startCleanup()
}

/**
 * Check if an email is rate limited
 * @returns Object with isLimited flag and optional retryAfter (seconds)
 */
export function checkRateLimit(email: string): {
  isLimited: boolean
  retryAfter?: number
  remainingAttempts?: number
} {
  const key = email.toLowerCase()
  const record = attempts.get(key)
  const now = Date.now()

  if (!record) {
    return { isLimited: false, remainingAttempts: MAX_ATTEMPTS }
  }

  // Check if currently locked out
  if (record.lockedUntil && now < record.lockedUntil) {
    return {
      isLimited: true,
      retryAfter: Math.ceil((record.lockedUntil - now) / 1000),
    }
  }

  // Check if window has expired (reset attempts)
  if (now - record.firstAttempt > WINDOW_MS) {
    attempts.delete(key)
    return { isLimited: false, remainingAttempts: MAX_ATTEMPTS }
  }

  // Check if max attempts reached (should be locked)
  if (record.count >= MAX_ATTEMPTS) {
    // Set lockout
    record.lockedUntil = now + LOCKOUT_MS
    return {
      isLimited: true,
      retryAfter: Math.ceil(LOCKOUT_MS / 1000),
    }
  }

  return {
    isLimited: false,
    remainingAttempts: MAX_ATTEMPTS - record.count,
  }
}

/**
 * Record a failed login attempt
 */
export function recordFailedAttempt(email: string): void {
  const key = email.toLowerCase()
  const now = Date.now()
  const record = attempts.get(key)

  if (!record || now - record.firstAttempt > WINDOW_MS) {
    // Start new window
    attempts.set(key, { count: 1, firstAttempt: now })
  } else {
    // Increment counter
    record.count++
    // If max attempts reached, set lockout
    if (record.count >= MAX_ATTEMPTS) {
      record.lockedUntil = now + LOCKOUT_MS
    }
  }
}

/**
 * Clear attempts on successful login
 */
export function clearAttempts(email: string): void {
  attempts.delete(email.toLowerCase())
}

/**
 * Get rate limit configuration (for client display)
 */
export function getRateLimitConfig() {
  return {
    maxAttempts: MAX_ATTEMPTS,
    windowMs: WINDOW_MS,
    lockoutMs: LOCKOUT_MS,
  }
}
