/**
 * Password security utilities
 */

import { SECURITY_CONSTANTS } from './security-constants'
import { getUnbiasedRandomInt } from './crypto-utils'

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
    lowercase: /[a-z]/.test(password) ? SECURITY_CONSTANTS.CHARSET_LOWERCASE : 0,
    uppercase: /[A-Z]/.test(password) ? SECURITY_CONSTANTS.CHARSET_UPPERCASE : 0,
    numbers: /[0-9]/.test(password) ? SECURITY_CONSTANTS.CHARSET_NUMBERS : 0,
    symbols: /[^A-Za-z0-9]/.test(password) ? SECURITY_CONSTANTS.CHARSET_SYMBOLS : 0,
  }
  
  const poolSize = Object.values(charSets).reduce((sum, size) => sum + size, 0)
  
  if (poolSize === 0) return 0
  
  return Math.log2(Math.pow(poolSize, password.length))
}

/**
 * Weak password patterns with improved detection
 */
interface WeakPattern {
  pattern: RegExp
  message: string
  severity: 'low' | 'medium' | 'high'
}

const WEAK_PATTERNS: ReadonlyArray<WeakPattern> = [
  { pattern: /(.)\1{2,}/, message: 'Contains repeated characters', severity: 'medium' },
  { pattern: /(.)\1{4,}/, message: 'Contains excessive repeated characters', severity: 'high' },
  { pattern: /123|234|345|456|567|678|789|890|012/, message: 'Contains sequential numbers', severity: 'medium' },
  { pattern: /abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz/i, message: 'Contains sequential letters', severity: 'medium' },
  { pattern: /qwerty|asdf|zxcv|1234|password|admin|user|test|guest|root|welcome|letmein/i, message: 'Contains common patterns', severity: 'high' },
  { pattern: /^[a-z]+$/i, message: 'Contains only letters', severity: 'high' },
  { pattern: /^[0-9]+$/, message: 'Contains only numbers', severity: 'high' },
  { pattern: /^.{1,3}$/, message: 'Too short', severity: 'high' },
] as const

/**
 * Check for common weak patterns
 */
function hasWeakPatterns(password: string): string[] {
  return WEAK_PATTERNS
    .filter(({ pattern }) => pattern.test(password))
    .map(({ message }) => message)
}

/**
 * Comprehensive common passwords list
 */
const COMMON_PASSWORDS = new Set([
  // Basic passwords
  'password', 'Password', 'PASSWORD', 'password123', 'Password123',
  '123456', '123456789', '12345678', '1234567890', '1234567',
  'qwerty', 'QWERTY', 'qwerty123', 'asdf', 'zxcv',
  
  // Administrative
  'admin', 'administrator', 'root', 'user', 'guest', 'test',
  'demo', 'temp', 'temporary', 'welcome', 'login',
  
  // Common words
  'monkey', 'dragon', 'sunshine', 'princess', 'football', 'baseball',
  'master', 'jordan', 'harley', 'ranger', 'secret', 'shadow',
  'mustang', 'buster', 'daniel', 'robert', 'matthew', 'jordan',
  
  // Keyboard patterns
  'qwerty', 'asdfgh', 'zxcvbn', '1qaz2wsx', 'qazwsx', 'qwertyuiop',
  
  // Years and dates
  '2023', '2024', '2025', '1234', '0000', '1111', '2222',
  
  // Japanese common
  'sakura', 'nihon', 'japan', 'tokyo', 'yamada', 'tanaka',
  
  // Other languages
  'contraseña', 'passwort', 'mot de passe', 'senha', 'hasło',
])

/**
 * Check against comprehensive common passwords list
 */
function isCommonPassword(password: string): boolean {
  return COMMON_PASSWORDS.has(password) || COMMON_PASSWORDS.has(password.toLowerCase())
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
  
  // Generate targeted feedback
  if (length < SECURITY_CONSTANTS.MIN_PASSWORD_LENGTH) {
    feedback.push(`Password must be at least ${SECURITY_CONSTANTS.MIN_PASSWORD_LENGTH} characters`)
  }
  if (length > 0 && length < 8) {
    feedback.push('Use at least 8 characters for better security')
  }
  if (length > 0 && length < 12 && (!hasSymbols || entropy < 40)) {
    feedback.push('Consider using 12+ characters or adding symbols')
  }
  
  // Character set recommendations
  const missingTypes = []
  if (!hasLowercase) missingTypes.push('lowercase letters')
  if (!hasUppercase) missingTypes.push('uppercase letters')
  if (!hasNumbers) missingTypes.push('numbers')
  if (!hasSymbols) missingTypes.push('symbols (!@#$%^&*)')
  
  if (missingTypes.length > 0) {
    feedback.push(`Add ${missingTypes.join(', ')}`)
  }
  
  // Entropy-based feedback
  if (entropy < 30) {
    feedback.push('Increase password complexity to improve security')
  } else if (entropy < 50 && length < 10) {
    feedback.push('Consider longer password or more character variety')
  }
  
  const isSecure = score >= 3 && entropy >= 50 && !isCommon && weakPatterns.length === 0 && length >= 8
  
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
 * Comprehensive password validation with enhanced security checks
 */
export function validatePassword(password: string): PasswordValidation {
  const strength = analyzePasswordStrength(password)
  const errors: string[] = []
  const warnings: string[] = []
  
  // Input validation
  if (typeof password !== 'string') {
    errors.push('Password must be a string')
    return { isValid: false, errors, warnings, strength }
  }
  
  // Length validation
  if (strength.length < SECURITY_CONSTANTS.MIN_PASSWORD_LENGTH) {
    errors.push(`Password must be at least ${SECURITY_CONSTANTS.MIN_PASSWORD_LENGTH} characters long`)
  }
  
  if (strength.length > SECURITY_CONSTANTS.MAX_PASSWORD_LENGTH) {
    errors.push(`Password must not exceed ${SECURITY_CONSTANTS.MAX_PASSWORD_LENGTH} characters`)
  }
  
  // Security validation
  if (isCommonPassword(password)) {
    errors.push('This password is commonly used and should be avoided')
  }
  
  // Character composition requirements
  const missingCharTypes: string[] = []
  if (!strength.hasLowercase) missingCharTypes.push('lowercase letters')
  if (!strength.hasUppercase) missingCharTypes.push('uppercase letters')
  if (!strength.hasNumbers) missingCharTypes.push('numbers')
  
  if (missingCharTypes.length >= 3) {
    errors.push(`Password must contain at least one of: ${missingCharTypes.join(', ')}`)
  } else if (missingCharTypes.length >= 1) {
    warnings.push(`Consider adding: ${missingCharTypes.join(', ')}`)
  }
  
  // Entropy-based warnings
  if (strength.entropy < 25) {
    warnings.push('Password has very low entropy (highly predictable)')
  } else if (strength.entropy < 40) {
    warnings.push('Password has low entropy (somewhat predictable)')
  }
  
  // Strength-based warnings
  if (strength.score === 0) {
    warnings.push('Password is extremely weak')
  } else if (strength.score === 1) {
    warnings.push('Password is very weak')
  } else if (strength.score === 2) {
    warnings.push('Password is weak')
  }
  
  // Specific pattern warnings
  if (!strength.hasSymbols && strength.length < 12) {
    warnings.push('Consider adding special characters or increasing length')
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    strength,
  }
}

/**
 * Character sets for password generation
 */
const PASSWORD_CHARS = {
  lowercase: 'abcdefghijklmnopqrstuvwxyz',
  uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  numbers: '0123456789',
  symbols: '!@#$%^&*()_+-=[]{}|;:,.<>?~`',
} as const


/**
 * Fisher-Yates shuffle using unbiased secure random
 */
function secureShuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = getUnbiasedRandomInt(i + 1)
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

/**
 * Generate a cryptographically secure password
 */
export function generateSecurePassword(length: number = 16): string {
  if (length < 4) {
    throw new Error('Password length must be at least 4 characters')
  }
  
  if (length > SECURITY_CONSTANTS.MAX_PASSWORD_LENGTH) {
    throw new Error(`Password length cannot exceed ${SECURITY_CONSTANTS.MAX_PASSWORD_LENGTH} characters`)
  }
  
  const { lowercase, uppercase, numbers, symbols } = PASSWORD_CHARS
  const allChars = lowercase + uppercase + numbers + symbols
  
  const passwordArray: string[] = []
  
  // Ensure at least one character from each required set
  passwordArray.push(lowercase[getUnbiasedRandomInt(lowercase.length)])
  passwordArray.push(uppercase[getUnbiasedRandomInt(uppercase.length)])
  passwordArray.push(numbers[getUnbiasedRandomInt(numbers.length)])
  passwordArray.push(symbols[getUnbiasedRandomInt(symbols.length)])
  
  // Fill the rest with random characters from all sets
  for (let i = 4; i < length; i++) {
    passwordArray.push(allChars[getUnbiasedRandomInt(allChars.length)])
  }
  
  // Securely shuffle the password array
  const shuffledPassword = secureShuffleArray(passwordArray)
  
  return shuffledPassword.join('')
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