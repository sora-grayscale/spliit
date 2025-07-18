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
 * Versioned crypto API for explicit capability detection
 */
export interface VersionedCryptoApi {
  apiVersion: string
  capabilities: {
    modernDecryptSignature: boolean
    modernVerifySignature: boolean
    groupIdSupport: boolean
    rateLimiting: boolean
  }
  decryptExpenseData: ModernDecryptExpenseData
  verifyPassword: ModernVerifyPassword
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
 * Type guard to check if a crypto API supports modern versioned signature
 * Uses explicit API version and capability detection instead of function.length
 */
export function hasModernSignature(api: unknown): api is VersionedCryptoApi {
  if (!api || typeof api !== 'object') return false
  const cryptoApi = api as Record<string, unknown>

  // Primary check: Look for apiVersion property (most reliable)
  if (typeof cryptoApi.apiVersion === 'string') {
    const version = cryptoApi.apiVersion
    // Support semantic versioning - any 2.x version is modern
    return version.startsWith('2.') || version.startsWith('3.')
  }

  // Secondary check: Look for capabilities object
  if (cryptoApi.capabilities && typeof cryptoApi.capabilities === 'object') {
    const caps = cryptoApi.capabilities as Record<string, unknown>
    return caps.modernDecryptSignature === true
  }

  // Final check: Assume legacy API for safety
  // Since apiVersion and capabilities are not available, and function.length
  // is unreliable in production builds, we default to legacy behavior
  // This ensures compatibility and prevents runtime errors

  return false
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

/**
 * Enhanced API compatibility detector that uses multiple detection strategies
 */
export function detectApiCapabilities(api: unknown): {
  hasModernSignature: boolean
  version: string | null
  capabilities: Record<string, boolean>
} {
  if (!api || typeof api !== 'object') {
    return {
      hasModernSignature: false,
      version: null,
      capabilities: {},
    }
  }

  const cryptoApi = api as Record<string, unknown>

  // Extract version information
  const version =
    typeof cryptoApi.apiVersion === 'string' ? cryptoApi.apiVersion : null

  // Extract capabilities
  const capabilities =
    cryptoApi.capabilities && typeof cryptoApi.capabilities === 'object'
      ? { ...(cryptoApi.capabilities as Record<string, boolean>) }
      : {}

  // Determine if this is a modern API
  const isModernApi = hasModernSignature(api)

  return {
    hasModernSignature: isModernApi,
    version,
    capabilities,
  }
}
