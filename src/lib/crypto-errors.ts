/**
 * Custom error classes for cryptographic operations
 * Provides type-safe error handling without relying on string matching
 */

/**
 * Base class for all cryptographic errors
 */
export abstract class CryptoError extends Error {
  abstract readonly code: string

  constructor(
    message: string,
    public readonly cause?: Error,
  ) {
    super(message)
    this.name = this.constructor.name
  }
}

/**
 * Error thrown when API signature is incompatible
 */
export class ApiIncompatibilityError extends CryptoError {
  readonly code = 'API_INCOMPATIBILITY'

  constructor(
    message: string = 'API signature is incompatible',
    cause?: Error,
  ) {
    super(message, cause)
  }
}

/**
 * Error thrown when rate limiting is triggered
 */
export class RateLimitError extends CryptoError {
  readonly code = 'RATE_LIMIT_EXCEEDED'

  constructor(message: string = 'Rate limit exceeded', cause?: Error) {
    super(message, cause)
  }
}

/**
 * Error thrown when decryption fails
 */
export class DecryptionError extends CryptoError {
  readonly code = 'DECRYPTION_FAILED'

  constructor(message: string = 'Decryption failed', cause?: Error) {
    super(message, cause)
  }
}

/**
 * Error thrown when validation fails
 */
export class ValidationError extends CryptoError {
  readonly code = 'VALIDATION_FAILED'

  constructor(message: string = 'Validation failed', cause?: Error) {
    super(message, cause)
  }
}

/**
 * Type guard to check if an error is a CryptoError
 */
export function isCryptoError(error: unknown): error is CryptoError {
  return error instanceof CryptoError
}

/**
 * Type guard to check if an error is an ApiIncompatibilityError
 */
export function isApiIncompatibilityError(
  error: unknown,
): error is ApiIncompatibilityError {
  return error instanceof ApiIncompatibilityError
}

/**
 * Type guard to check if an error is a RateLimitError
 */
export function isRateLimitError(error: unknown): error is RateLimitError {
  return error instanceof RateLimitError
}

/**
 * Type guard to check if an error is a DecryptionError
 */
export function isDecryptionError(error: unknown): error is DecryptionError {
  return error instanceof DecryptionError
}

/**
 * Type guard to check if an error is a ValidationError
 */
export function isValidationError(error: unknown): error is ValidationError {
  return error instanceof ValidationError
}
