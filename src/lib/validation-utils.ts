/**
 * Centralized validation utilities for type safety and reusability
 * SECURITY: Provides consistent validation across the application
 */

/**
 * Validate share value with runtime type checking
 * @param value - The value to validate
 * @param participantId - Optional participant ID for error context
 * @returns The validated number
 * @throws Error if validation fails
 */
export function validateShareValue(
  value: unknown,
  participantId?: string,
): number {
  // Type check
  if (typeof value !== 'number') {
    const contextMsg = participantId ? ` for participant ${participantId}` : ''
    throw new Error(
      `Invalid share value type${contextMsg}: expected number, got ${typeof value}`,
    )
  }

  // NaN check
  if (isNaN(value)) {
    const contextMsg = participantId ? ` for participant ${participantId}` : ''
    throw new Error(`Invalid share value${contextMsg}: value is NaN`)
  }

  // Finite check
  if (!isFinite(value)) {
    const contextMsg = participantId ? ` for participant ${participantId}` : ''
    throw new Error(`Invalid share value${contextMsg}: value is not finite`)
  }

  // FLEXIBILITY FIX: Allow zero shares for legitimate use cases (e.g., observers)
  // Zero shares may be valid for participants who observe but don't pay/receive
  if (value < 0) {
    const contextMsg = participantId ? ` for participant ${participantId}` : ''
    throw new Error(
      `Invalid share value${contextMsg}: value cannot be negative, got ${value}`,
    )
  }

  // Maximum reasonable value check (prevent overflow)
  if (value > Number.MAX_SAFE_INTEGER / 1000) {
    const contextMsg = participantId ? ` for participant ${participantId}` : ''
    throw new Error(
      `Invalid share value${contextMsg}: value too large, got ${value}`,
    )
  }

  return value
}

/**
 * Validate amount value with comprehensive checks
 * @param value - The value to validate
 * @param context - Optional context for error messages
 * @returns The validated number
 * @throws Error if validation fails
 */
export function validateAmountValue(value: unknown, context?: string): number {
  // Type check
  if (typeof value !== 'number') {
    const contextMsg = context ? ` for ${context}` : ''
    throw new Error(
      `Invalid amount value type${contextMsg}: expected number, got ${typeof value}`,
    )
  }

  // NaN check
  if (isNaN(value)) {
    const contextMsg = context ? ` for ${context}` : ''
    throw new Error(`Invalid amount value${contextMsg}: value is NaN`)
  }

  // Finite check
  if (!isFinite(value)) {
    const contextMsg = context ? ` for ${context}` : ''
    throw new Error(`Invalid amount value${contextMsg}: value is not finite`)
  }

  // Range check (amounts can be negative for income/refunds)
  const maxAmount = 10_000_000 // 10 million limit as per existing validation
  if (Math.abs(value) > maxAmount) {
    const contextMsg = context ? ` for ${context}` : ''
    throw new Error(
      `Invalid amount value${contextMsg}: absolute value exceeds ${maxAmount}, got ${value}`,
    )
  }

  return value
}

/**
 * Validate percentage value
 * @param value - The value to validate
 * @param context - Optional context for error messages
 * @returns The validated number
 * @throws Error if validation fails
 */
export function validatePercentageValue(
  value: unknown,
  context?: string,
): number {
  // Type check
  if (typeof value !== 'number') {
    const contextMsg = context ? ` for ${context}` : ''
    throw new Error(
      `Invalid percentage value type${contextMsg}: expected number, got ${typeof value}`,
    )
  }

  // NaN check
  if (isNaN(value)) {
    const contextMsg = context ? ` for ${context}` : ''
    throw new Error(`Invalid percentage value${contextMsg}: value is NaN`)
  }

  // Finite check
  if (!isFinite(value)) {
    const contextMsg = context ? ` for ${context}` : ''
    throw new Error(
      `Invalid percentage value${contextMsg}: value is not finite`,
    )
  }

  // Range check (0-100)
  if (value < 0 || value > 100) {
    const contextMsg = context ? ` for ${context}` : ''
    throw new Error(
      `Invalid percentage value${contextMsg}: value must be between 0 and 100, got ${value}`,
    )
  }

  return value
}

/**
 * Validate participant ID
 * @param value - The value to validate
 * @param context - Optional context for error messages
 * @returns The validated string
 * @throws Error if validation fails
 */
export function validateParticipantId(
  value: unknown,
  context?: string,
): string {
  // Type check
  if (typeof value !== 'string') {
    const contextMsg = context ? ` for ${context}` : ''
    throw new Error(
      `Invalid participant ID type${contextMsg}: expected string, got ${typeof value}`,
    )
  }

  // Empty check
  if (!value.trim()) {
    const contextMsg = context ? ` for ${context}` : ''
    throw new Error(`Invalid participant ID${contextMsg}: value is empty`)
  }

  // Length check (reasonable limits)
  if (value.length > 100) {
    const contextMsg = context ? ` for ${context}` : ''
    throw new Error(
      `Invalid participant ID${contextMsg}: value too long (max 100 chars)`,
    )
  }

  // SECURITY FIX: Restrict to alphanumeric characters and safe separators only
  // Removed dots to prevent path traversal attacks - use hyphens and underscores only
  const validFormat = /^[a-zA-Z0-9_-]+$/.test(value)
  if (!validFormat) {
    const contextMsg = context ? ` for ${context}` : ''
    throw new Error(
      `Invalid participant ID${contextMsg}: invalid format (only alphanumeric, dashes, underscores allowed)`,
    )
  }

  return value
}

/**
 * Validate group ID
 * @param value - The value to validate
 * @param context - Optional context for error messages
 * @returns The validated string
 * @throws Error if validation fails
 */
export function validateGroupId(value: unknown, context?: string): string {
  // Type check
  if (typeof value !== 'string') {
    const contextMsg = context ? ` for ${context}` : ''
    throw new Error(
      `Invalid group ID type${contextMsg}: expected string, got ${typeof value}`,
    )
  }

  // Empty check
  if (!value.trim()) {
    const contextMsg = context ? ` for ${context}` : ''
    throw new Error(`Invalid group ID${contextMsg}: value is empty`)
  }

  // Length check (reasonable limits)
  if (value.length > 100) {
    const contextMsg = context ? ` for ${context}` : ''
    throw new Error(
      `Invalid group ID${contextMsg}: value too long (max 100 chars)`,
    )
  }

  // SECURITY FIX: Restrict to alphanumeric characters and safe separators only
  // Removed dots to prevent path traversal attacks - use hyphens and underscores only
  const validFormat = /^[a-zA-Z0-9_-]+$/.test(value)
  if (!validFormat) {
    const contextMsg = context ? ` for ${context}` : ''
    throw new Error(
      `Invalid group ID${contextMsg}: invalid format (only alphanumeric, dashes, underscores allowed)`,
    )
  }

  return value
}

/**
 * Validate array of share values
 * @param shares - Array of share objects to validate
 * @returns The validated array
 * @throws Error if validation fails
 */
export function validateShareArray(
  shares: Array<{ participant: string; shares: unknown }>,
): Array<{ participant: string; shares: number }> {
  if (!Array.isArray(shares)) {
    throw new Error('Invalid shares: expected array')
  }

  if (shares.length === 0) {
    throw new Error('Invalid shares: array is empty')
  }

  return shares.map((share, index) => {
    if (!share || typeof share !== 'object') {
      throw new Error(`Invalid share at index ${index}: expected object`)
    }

    const participantId = validateParticipantId(
      share.participant,
      `share at index ${index}`,
    )
    const shareValue = validateShareValue(
      share.shares,
      `participant ${participantId}`,
    )

    return {
      participant: participantId,
      shares: shareValue,
    }
  })
}

/**
 * Safe number conversion with validation
 * @param value - The value to convert
 * @param context - Optional context for error messages
 * @returns The converted number
 * @throws Error if conversion fails
 */
export function safeNumberConversion(value: unknown, context?: string): number {
  if (typeof value === 'number') {
    return validateAmountValue(value, context)
  }

  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (trimmed === '') {
      const contextMsg = context ? ` for ${context}` : ''
      throw new Error(`Invalid number conversion${contextMsg}: empty string`)
    }

    const parsed = Number(trimmed)
    return validateAmountValue(parsed, context)
  }

  const contextMsg = context ? ` for ${context}` : ''
  throw new Error(
    `Invalid number conversion${contextMsg}: cannot convert ${typeof value} to number`,
  )
}
