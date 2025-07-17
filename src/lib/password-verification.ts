/**
 * Password verification and testing utilities
 */

import { SECURITY_CONSTANTS } from './security-constants'
import { KeyDerivation } from './key-derivation'
import { EncryptionService, EncryptedData } from './encryption'
import { validateCryptoInputs } from './crypto-utils'

/**
 * Password verification service
 */
export class PasswordVerification {
  
  /**
   * Create a test payload for password verification with enhanced security
   */
  static async createPasswordTest(
    password: string,
    salt: string
  ): Promise<EncryptedData> {
    validateCryptoInputs({ password, salt })
    
    const key = await KeyDerivation.deriveKeyFromPassword(password, salt)
    // Use static test data to prevent timing analysis
    const testData = JSON.stringify({ 
      test: 'password_verification', 
      version: '1.0',
      timestamp: 0, // Static timestamp to prevent timing leaks
      static: true 
    })
    return await EncryptionService.encryptData(testData, key)
  }

  /**
   * Verify password by attempting to decrypt a test payload
   */
  static async verifyPassword(
    testEncryptedData: string,
    testIv: string,
    password: string,
    salt: string
  ): Promise<boolean> {
    validateCryptoInputs({ testEncryptedData, testIv, password, salt })
    
    try {
      const key = await KeyDerivation.deriveKeyFromPassword(password, salt)
      await EncryptionService.decryptData(testEncryptedData, testIv, key)
      return true
    } catch {
      return false
    }
  }
}