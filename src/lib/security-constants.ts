/**
 * Security-related constants
 */

export const SECURITY_CONSTANTS = {
  // Password requirements
  MIN_PASSWORD_LENGTH: 6,
  MAX_PASSWORD_LENGTH: 128,
  
  // Session management
  PASSWORD_SESSION_TIMEOUT: 30 * 60 * 1000, // 30 minutes
  
  // Cryptographic settings
  PBKDF2_ITERATIONS: 100000,
  AES_KEY_LENGTH: 256,
  
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
  ALLOWED_FILE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'],
} as const

export type SecurityConstants = typeof SECURITY_CONSTANTS