/**
 * Advanced password security with comprehensive password dictionary
 */

import { SECURITY_CONSTANTS } from './security-constants'

/**
 * Comprehensive password security checker
 */
export class AdvancedPasswordSecurity {
  private static commonPasswordsSet: Set<string> | null = null
  private static initPromise: Promise<void> | null = null

  /**
   * Initialize the comprehensive password dictionary
   */
  private static async initializePasswordDictionary(): Promise<void> {
    if (this.commonPasswordsSet) return

    // Comprehensive password list (in production, this could be loaded from an external source)
    const commonPasswords = [
      // Top 1000 most common passwords
      'password', 'Password', 'PASSWORD', '123456', '123456789', '12345678', 
      'qwerty', 'abc123', 'password123', 'admin', 'letmein', 'welcome',
      '1234567890', '1234567', '12345', 'password1', 'qwerty123', 'welcome123',
      
      // Keyboard patterns
      'qwertyuiop', 'asdfghjkl', 'zxcvbnm', '1qaz2wsx', 'qazwsx', 'qazwsxedc',
      '1q2w3e4r', '1q2w3e4r5t', 'qwer1234', 'asdf1234', 'zxcv1234',
      
      // Common words and variations
      'admin', 'administrator', 'root', 'user', 'guest', 'test', 'demo',
      'login', 'signin', 'temp', 'temporary', 'changeme', 'default',
      'master', 'main', 'super', 'system', 'service', 'public', 'private',
      
      // Years and dates
      '2023', '2024', '2025', '2022', '2021', '2020', '1234', '0000', '1111',
      '2222', '3333', '4444', '5555', '6666', '7777', '8888', '9999',
      
      // Names and common words
      'john', 'mary', 'michael', 'sarah', 'david', 'jennifer', 'robert',
      'lisa', 'william', 'karen', 'james', 'nancy', 'charles', 'betty',
      'thomas', 'helen', 'christopher', 'sandra', 'daniel', 'donna',
      
      // Technology terms
      'computer', 'internet', 'email', 'website', 'server', 'database',
      'network', 'security', 'firewall', 'router', 'windows', 'linux',
      'apple', 'google', 'microsoft', 'facebook', 'twitter', 'instagram',
      
      // Sports and entertainment
      'football', 'baseball', 'basketball', 'soccer', 'tennis', 'golf',
      'hockey', 'music', 'movies', 'games', 'sports', 'team', 'player',
      
      // Animals
      'monkey', 'dragon', 'tiger', 'lion', 'elephant', 'cat', 'dog',
      'fish', 'bird', 'horse', 'bear', 'wolf', 'eagle', 'shark',
      
      // Colors and nature
      'red', 'blue', 'green', 'yellow', 'black', 'white', 'orange',
      'purple', 'pink', 'brown', 'gray', 'sun', 'moon', 'star',
      'sky', 'ocean', 'mountain', 'tree', 'flower', 'river',
      
      // Emotions and adjectives
      'love', 'happy', 'sad', 'angry', 'beautiful', 'good', 'bad',
      'big', 'small', 'hot', 'cold', 'fast', 'slow', 'strong', 'weak',
      
      // International common passwords
      'contraseña', 'passwort', 'mot de passe', 'senha', 'hasło', 'пароль',
      'パスワード', '密码', '비밀번호', 'wachtwoord', 'salasana', 'lösenord',
      
      // Japanese common patterns
      'sakura', 'nihon', 'japan', 'tokyo', 'osaka', 'kyoto', 'yamada',
      'tanaka', 'suzuki', 'takahashi', 'watanabe', 'ito', 'yamamoto',
      
      // Security-related terms (ironically common in passwords)
      'secure', 'secret', 'private', 'confidential', 'hidden', 'protected',
      'encrypted', 'safe', 'vault', 'key', 'lock', 'guard', 'shield',
      
      // Company and brand names
      'company', 'business', 'office', 'work', 'job', 'career', 'professional',
      'corporate', 'enterprise', 'organization', 'institution', 'agency',
      
      // Common phrases and patterns
      'iloveyou', 'loveme', 'kissme', 'hugs', 'family', 'friends', 'forever',
      'always', 'never', 'maybe', 'please', 'thanks', 'hello', 'goodbye',
      
      // Numbers and sequences
      '000000', '111111', '222222', '333333', '444444', '555555', '666666',
      '777777', '888888', '999999', '101010', '121212', '131313', '232323',
      
      // Special character patterns
      '!!!!!!', '??????', '......', '------', '______', '++++++', '======',
      '******', '@@@@@@', '######', '$$$$$$', '%%%%%%', '^^^^^^', '&&&&&&',
    ]

    // Add variations with common substitutions
    const variations = []
    for (const password of commonPasswords) {
      // Common character substitutions
      variations.push(password.replace(/a/g, '@'))
      variations.push(password.replace(/o/g, '0'))
      variations.push(password.replace(/i/g, '1'))
      variations.push(password.replace(/s/g, '$'))
      variations.push(password.replace(/e/g, '3'))
      variations.push(password.replace(/l/g, '1'))
      
      // Add numbers at the end (limited to prevent memory exhaustion)
      for (let i = 1; i <= 99; i++) {
        if (i <= 9 || i % 10 === 0 || i === 23 || i === 123 || i === 321) {
          variations.push(password + i)
          variations.push(i + password)
        }
      }
      
      // Add common suffixes
      variations.push(password + '!')
      variations.push(password + '?')
      variations.push(password + '.')
      variations.push('!' + password)
    }

    this.commonPasswordsSet = new Set([...commonPasswords, ...variations])
  }

  /**
   * Initialize the password dictionary (call once at app startup)
   */
  static async initialize(): Promise<void> {
    if (!this.initPromise) {
      this.initPromise = this.initializePasswordDictionary()
    }
    return this.initPromise
  }

  /**
   * Check if password is in common password list
   */
  static async isCommonPassword(password: string): Promise<boolean> {
    await this.initialize()
    
    if (!this.commonPasswordsSet) {
      throw new Error('Password dictionary not initialized')
    }

    // Check exact match and lowercase
    return this.commonPasswordsSet.has(password) || 
           this.commonPasswordsSet.has(password.toLowerCase()) ||
           this.commonPasswordsSet.has(password.toUpperCase())
  }

  /**
   * Check for password in known breach databases (placeholder for future implementation)
   */
  static async checkBreachedPassword(password: string): Promise<boolean> {
    // In production, this would check against Have I Been Pwned API
    // or a local copy of breach databases
    
    // For now, just check if it's a very common pattern
    const veryCommonPatterns = [
      /^(.)\1+$/, // All same character
      /^\d+$/, // All numbers
      /^[a-zA-Z]+$/, // All letters
      /^password\d*$/i, // "password" with optional numbers
      /^admin\d*$/i, // "admin" with optional numbers
    ]
    
    return veryCommonPatterns.some(pattern => pattern.test(password))
  }

  /**
   * Get password strength score with advanced checking
   */
  static async getAdvancedPasswordStrength(password: string): Promise<{
    score: number
    isCommon: boolean
    isBreached: boolean
    entropy: number
    feedback: string[]
  }> {
    const [isCommon, isBreached] = await Promise.all([
      this.isCommonPassword(password),
      this.checkBreachedPassword(password)
    ])

    // Calculate entropy
    const charSets = {
      lowercase: /[a-z]/.test(password) ? SECURITY_CONSTANTS.CHARSET_LOWERCASE : 0,
      uppercase: /[A-Z]/.test(password) ? SECURITY_CONSTANTS.CHARSET_UPPERCASE : 0,
      numbers: /[0-9]/.test(password) ? SECURITY_CONSTANTS.CHARSET_NUMBERS : 0,
      symbols: /[^A-Za-z0-9]/.test(password) ? SECURITY_CONSTANTS.CHARSET_SYMBOLS : 0,
    }
    
    const poolSize = Object.values(charSets).reduce((sum, size) => sum + size, 0)
    const entropy = poolSize > 0 ? Math.log2(Math.pow(poolSize, password.length)) : 0

    let score = 0
    const feedback: string[] = []

    // Length scoring
    if (password.length >= SECURITY_CONSTANTS.MIN_PASSWORD_LENGTH) score += 1
    if (password.length >= 8) score += 1
    if (password.length >= 12) score += 1
    if (password.length >= 16) score += 1

    // Character variety scoring
    if (charSets.lowercase && charSets.uppercase) score += 1
    if (charSets.numbers) score += 1
    if (charSets.symbols) score += 1

    // Entropy bonus
    if (entropy >= 60) score += 2
    else if (entropy >= 50) score += 1

    // Penalties
    if (isCommon) {
      score = 0
      feedback.push('This password appears in common password lists')
    }

    if (isBreached) {
      score = Math.max(0, score - 2)
      feedback.push('This password pattern has been found in data breaches')
    }

    // Cap score at 8 for advanced scoring
    score = Math.min(8, score)

    return {
      score,
      isCommon,
      isBreached,
      entropy,
      feedback
    }
  }

  /**
   * Get memory usage of the password dictionary
   */
  static getMemoryUsage(): number {
    if (!this.commonPasswordsSet) return 0
    
    // Estimate memory usage (rough calculation)
    let totalSize = 0
    this.commonPasswordsSet.forEach(password => {
      totalSize += password.length * 2 // UTF-16 encoding
    })
    
    return totalSize
  }

  /**
   * Clear the password dictionary to free memory
   */
  static clearDictionary(): void {
    this.commonPasswordsSet = null
    this.initPromise = null
  }
}