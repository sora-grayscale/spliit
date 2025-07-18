/**
 * Security-related constants
 */

export const SECURITY_CONSTANTS = {
  // Password requirements
  MIN_PASSWORD_LENGTH: 6,
  MAX_PASSWORD_LENGTH: 128,

  // Session management
  PASSWORD_SESSION_TIMEOUT: 30 * 60 * 1000, // 30 minutes
  PASSWORD_MEMORY_CLEAR_CYCLES: 10, // Number of overwrite cycles for secure memory clearing

  // Cryptographic settings
  PBKDF2_ITERATIONS: 100000,
  AES_KEY_LENGTH: 256,
  AES_IV_LENGTH: 12, // 96-bit IV for GCM
  SALT_LENGTH: 32, // 256-bit salt

  // Character set sizes for entropy calculation
  CHARSET_LOWERCASE: 26,
  CHARSET_UPPERCASE: 26,
  CHARSET_NUMBERS: 10,
  CHARSET_SYMBOLS: 32, // Estimate for common symbols

  // Rate limiting
  MAX_LOGIN_ATTEMPTS: 5,
  LOGIN_LOCKOUT_DURATION: 15 * 60 * 1000, // 15 minutes

  // Data validation
  MAX_GROUP_NAME_LENGTH: 50,
  MAX_PARTICIPANT_NAME_LENGTH: 50,
  MAX_EXPENSE_TITLE_LENGTH: 100,
  MAX_EXPENSE_NOTES_LENGTH: 1000,

  // File upload limits
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_FILE_TYPES: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/pdf',
  ],

  // Memory management
  MEMORY_CLEAR_DELAY: 100, // Delay between memory clear operations (ms)
  SECURE_RANDOM_BYTES: 32, // Default random bytes length

  // Memory clearing patterns
  FILL_BYTE_ZERO: 0x00, // Zero pattern for memory clearing
  FILL_BYTE_FF: 0xff, // All-ones pattern for memory clearing
  FILL_BYTE_AA: 0xaa, // Alternating pattern for memory clearing

  // Numeric limits
  MAX_UINT32: 0xffffffff, // Maximum 32-bit unsigned integer value

  // Timing attack prevention
  MIN_DECRYPTION_TIME_MS: 100, // Minimum time for decryption operations to prevent timing attacks
} as const

export type SecurityConstants = typeof SECURITY_CONSTANTS
