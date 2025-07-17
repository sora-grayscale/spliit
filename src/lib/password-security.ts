/**
 * Password security utilities
 */

import { SECURITY_CONSTANTS } from './security-constants'

export interface PasswordStrength {
  score: number // 0-4 (very weak to very strong)
  feedback: string[]
  entropy: number
  hasLowercase: boolean
  hasUppercase: boolean
  hasNumbers: boolean
  hasSymbols: boolean
  length: number
  isSecure: boolean
}

export interface PasswordValidation {
  isValid: boolean
  errors: string[]
  warnings: string[]
  strength: PasswordStrength
}

/**
 * Calculate password entropy
 */
function calculateEntropy(password: string): number {
  const charSets = {
    lowercase: /[a-z]/.test(password) ? 26 : 0,
    uppercase: /[A-Z]/.test(password) ? 26 : 0,
    numbers: /[0-9]/.test(password) ? 10 : 0,
    symbols: /[^A-Za-z0-9]/.test(password) ? 32 : 0, // Estimate for common symbols
  }
  
  const poolSize = Object.values(charSets).reduce((sum, size) => sum + size, 0)
  
  if (poolSize === 0) return 0
  
  return Math.log2(Math.pow(poolSize, password.length))
}

/**
 * Check for common weak patterns
 */
function hasWeakPatterns(password: string): string[] {
  const weakPatterns: Array<{ pattern: RegExp; message: string }> = [
    { pattern: /(.)\1{2,}/, message: 'Contains repeated characters' },
    { pattern: /123|234|345|456|567|678|789|890/, message: 'Contains sequential numbers' },
    { pattern: /abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz/i, message: 'Contains sequential letters' },
    { pattern: /qwerty|asdf|zxcv|1234|password|admin|user|test/i, message: 'Contains common patterns' },
  ]
  
  return weakPatterns
    .filter(({ pattern }) => pattern.test(password))
    .map(({ message }) => message)
}

/**
 * Check against common passwords list (simplified)
 */
function isCommonPassword(password: string): boolean {
  const commonPasswords = [
    'password', '123456', '123456789', 'qwerty', 'abc123', 'password123',
    'admin', 'user', 'test', 'guest', 'root', 'welcome', 'letmein',
    'monkey', 'dragon', 'sunshine', 'princess', 'football', 'baseball',
  ]
  
  return commonPasswords.includes(password.toLowerCase())
}

/**
 * Analyze password strength
 */
export function analyzePasswordStrength(password: string): PasswordStrength {
  const length = password.length
  const hasLowercase = /[a-z]/.test(password)
  const hasUppercase = /[A-Z]/.test(password)
  const hasNumbers = /[0-9]/.test(password)
  const hasSymbols = /[^A-Za-z0-9]/.test(password)
  
  const entropy = calculateEntropy(password)
  const weakPatterns = hasWeakPatterns(password)
  const isCommon = isCommonPassword(password)
  
  let score = 0
  const feedback: string[] = []
  
  // Length scoring
  if (length >= SECURITY_CONSTANTS.MIN_PASSWORD_LENGTH) score += 1
  if (length >= 8) score += 1
  if (length >= 12) score += 1
  
  // Character variety scoring
  if (hasLowercase && hasUppercase) score += 1
  if (hasNumbers) score += 1
  if (hasSymbols) score += 1
  
  // Entropy bonus
  if (entropy >= 50) score += 1
  
  // Penalties
  if (weakPatterns.length > 0) {
    score = Math.max(0, score - weakPatterns.length)
    feedback.push(...weakPatterns)
  }
  
  if (isCommon) {
    score = 0
    feedback.push('This is a commonly used password')
  }
  
  // Cap score at 4
  score = Math.min(4, score)
  
  // Generate feedback
  if (length < SECURITY_CONSTANTS.MIN_PASSWORD_LENGTH) {
    feedback.push(`Password must be at least ${SECURITY_CONSTANTS.MIN_PASSWORD_LENGTH} characters`)
  }
  if (!hasLowercase) feedback.push('Add lowercase letters')
  if (!hasUppercase) feedback.push('Add uppercase letters')
  if (!hasNumbers) feedback.push('Add numbers')
  if (!hasSymbols) feedback.push('Add symbols (!@#$%^&*)')
  if (length > 0 && length < 8) feedback.push('Use at least 8 characters')
  if (entropy < 30) feedback.push('Increase password complexity')
  
  const isSecure = score >= 3 && entropy >= 40 && !isCommon && weakPatterns.length === 0
  
  return {
    score,
    feedback,
    entropy,
    hasLowercase,
    hasUppercase,
    hasNumbers,
    hasSymbols,
    length,
    isSecure,
  }
}

/**
 * Validate password according to security requirements
 */
export function validatePassword(password: string): PasswordValidation {
  const strength = analyzePasswordStrength(password)
  const errors: string[] = []
  const warnings: string[] = []
  
  // Required validation
  if (strength.length < SECURITY_CONSTANTS.MIN_PASSWORD_LENGTH) {
    errors.push(`Password must be at least ${SECURITY_CONSTANTS.MIN_PASSWORD_LENGTH} characters long`)
  }
  
  if (strength.length > SECURITY_CONSTANTS.MAX_PASSWORD_LENGTH) {
    errors.push(`Password must not exceed ${SECURITY_CONSTANTS.MAX_PASSWORD_LENGTH} characters`)
  }
  
  // Security warnings
  if (strength.score < 2) {
    warnings.push('Password is very weak')
  } else if (strength.score < 3) {
    warnings.push('Password is weak')
  }
  
  if (strength.entropy < 30) {
    warnings.push('Password has low entropy (predictable)')
  }
  
  if (!strength.hasUppercase || !strength.hasLowercase || !strength.hasNumbers) {
    warnings.push('Consider using a mix of uppercase, lowercase, and numbers')
  }
  
  if (!strength.hasSymbols) {
    warnings.push('Consider adding special characters for better security')
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    strength,
  }
}

/**
 * Generate a secure password suggestion
 */
export function generateSecurePassword(length: number = 16): string {
  const lowercase = 'abcdefghijklmnopqrstuvwxyz'
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const numbers = '0123456789'
  const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?'
  
  const allChars = lowercase + uppercase + numbers + symbols
  
  let password = ''
  
  // Ensure at least one character from each set
  password += lowercase[Math.floor(Math.random() * lowercase.length)]
  password += uppercase[Math.floor(Math.random() * uppercase.length)]
  password += numbers[Math.floor(Math.random() * numbers.length)]
  password += symbols[Math.floor(Math.random() * symbols.length)]
  
  // Fill the rest randomly
  for (let i = 4; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)]
  }
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('')
}

/**
 * Get password strength label
 */
export function getPasswordStrengthLabel(score: number): string {
  switch (score) {
    case 0: return 'Very Weak'
    case 1: return 'Weak'
    case 2: return 'Fair'
    case 3: return 'Good'
    case 4: return 'Strong'
    default: return 'Unknown'
  }
}

/**
 * Get password strength color
 */
export function getPasswordStrengthColor(score: number): string {
  switch (score) {
    case 0: return '#ef4444' // red-500
    case 1: return '#f97316' // orange-500
    case 2: return '#eab308' // yellow-500
    case 3: return '#22c55e' // green-500
    case 4: return '#16a34a' // green-600
    default: return '#6b7280' // gray-500
  }
}