/**
 * Type definitions for legacy cryptographic API compatibility
 * Provides type-safe access to legacy API methods without using 'as any'
 */

/**
 * Legacy decryptExpenseData signature (4 parameters)
 */
export interface LegacyDecryptExpenseData {
  (
    encryptedData: string,
    iv: string,
    password: string,
    salt: string,
  ): Promise<{ title: string; notes?: string }>
}

/**
 * Modern decryptExpenseData signature (5 parameters with groupId)
 */
export interface ModernDecryptExpenseData {
  (
    encryptedData: string,
    iv: string,
    password: string,
    salt: string,
    groupId?: string,
  ): Promise<{ title: string; notes?: string }>
}

/**
 * Legacy verifyPassword signature (4 parameters)
 */
export interface LegacyVerifyPassword {
  (
    testEncryptedData: string,
    testIv: string,
    password: string,
    salt: string,
  ): Promise<boolean>
}

/**
 * Modern verifyPassword signature (5 parameters with groupId)
 */
export interface ModernVerifyPassword {
  (
    testEncryptedData: string,
    testIv: string,
    password: string,
    salt: string,
    groupId?: string,
  ): Promise<boolean>
}

/**
 * Unified crypto API that supports both legacy and modern signatures
 */
export interface CryptoApi {
  decryptExpenseData: ModernDecryptExpenseData
  verifyPassword: ModernVerifyPassword
}

/**
 * Legacy crypto API with old signatures
 */
export interface LegacyCryptoApi {
  decryptExpenseData: LegacyDecryptExpenseData
  verifyPassword: LegacyVerifyPassword
}

/**
 * Type guard to check if a crypto API supports the modern signature
 */
export function hasModernSignature(
  api: unknown,
): api is { decryptExpenseData: ModernDecryptExpenseData } {
  if (!api || typeof api !== 'object') return false
  const cryptoApi = api as Record<string, unknown>

  if (typeof cryptoApi.decryptExpenseData !== 'function') return false

  // Check if the function accepts 5 parameters by examining its length
  // Note: This is not foolproof but better than string matching
  return cryptoApi.decryptExpenseData.length >= 5
}

/**
 * Safely cast a crypto API to legacy format
 */
export function toLegacyCrypto(api: unknown): LegacyCryptoApi {
  if (!api || typeof api !== 'object') {
    throw new Error('Invalid crypto API object')
  }

  return api as LegacyCryptoApi
}
