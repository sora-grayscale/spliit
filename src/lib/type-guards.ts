/**
 * Type guards and runtime validation utilities
 * SECURITY: Prevents dangerous type casting with runtime validation
 */

/**
 * Safe group statistics data type guard
 */
export interface SafeGroupStatsData extends Record<string, unknown> {
  totalExpenses: number
  totalParticipants: number
  averageExpenseAmount: number
  categoryBreakdown: Record<string, number>
  monthlyTrends: Array<{
    month: string
    amount: number
    count: number
  }>
  topSpenders: Array<{
    participantId: string
    amount: number
  }>
}

export function isGroupStatsData(data: unknown): data is SafeGroupStatsData {
  if (!data || typeof data !== 'object') return false

  const obj = data as Record<string, unknown>

  return (
    typeof obj.totalExpenses === 'number' &&
    typeof obj.totalParticipants === 'number' &&
    typeof obj.averageExpenseAmount === 'number' &&
    typeof obj.categoryBreakdown === 'object' &&
    Array.isArray(obj.monthlyTrends) &&
    Array.isArray(obj.topSpenders)
  )
}

/**
 * Safe participant statistics data type guard
 */
export interface SafeParticipantStatsData extends Record<string, unknown> {
  totalPaid: number
  totalOwed: number
  balance: number
  expenseCount: number
  averageExpense: number
  categoryPreferences: Record<string, number>
}

export function isParticipantStatsData(
  data: unknown,
): data is SafeParticipantStatsData {
  if (!data || typeof data !== 'object') return false

  const obj = data as Record<string, unknown>

  return (
    typeof obj.totalPaid === 'number' &&
    typeof obj.totalOwed === 'number' &&
    typeof obj.balance === 'number' &&
    typeof obj.expenseCount === 'number' &&
    typeof obj.averageExpense === 'number' &&
    typeof obj.categoryPreferences === 'object'
  )
}

/**
 * Group settings data type guard
 */
export interface GroupSettings extends Record<string, unknown> {
  currency?: string
  defaultSplitMode?: string
  notifications?: boolean
  theme?: string
}

export function isGroupSettings(data: unknown): data is GroupSettings {
  if (!data || typeof data !== 'object') return false

  const obj = data as Record<string, unknown>

  return (
    (obj.currency === undefined || typeof obj.currency === 'string') &&
    (obj.defaultSplitMode === undefined ||
      typeof obj.defaultSplitMode === 'string') &&
    (obj.notifications === undefined ||
      typeof obj.notifications === 'boolean') &&
    (obj.theme === undefined || typeof obj.theme === 'string')
  )
}

/**
 * Participant settings data type guard
 */
export interface ParticipantSettings extends Record<string, unknown> {
  displayName?: string
  notificationPreferences?: Record<string, boolean>
  defaultRole?: string
}

export function isParticipantSettings(
  data: unknown,
): data is ParticipantSettings {
  if (!data || typeof data !== 'object') return false

  const obj = data as Record<string, unknown>

  return (
    (obj.displayName === undefined || typeof obj.displayName === 'string') &&
    (obj.notificationPreferences === undefined ||
      (typeof obj.notificationPreferences === 'object' &&
        obj.notificationPreferences !== null)) &&
    (obj.defaultRole === undefined || typeof obj.defaultRole === 'string')
  )
}

/**
 * Safe encrypted balance data type guard
 */
export interface SafeEncryptedBalanceData extends Record<string, unknown> {
  balances: Record<string, { paid: number; paidFor: number; total: number }>
  reimbursements: Array<{ from: string; to: string; amount: number }>
  totalExpenses: number
  participantTotals: Record<string, number>
}

export function isEncryptedBalanceData(
  data: unknown,
): data is SafeEncryptedBalanceData {
  if (!data || typeof data !== 'object') return false

  const obj = data as Record<string, unknown>

  return (
    typeof obj.balances === 'object' &&
    obj.balances !== null &&
    Array.isArray(obj.reimbursements) &&
    typeof obj.totalExpenses === 'number' &&
    typeof obj.participantTotals === 'object' &&
    obj.participantTotals !== null
  )
}

// REFACTOR: Removed duplicate safeNumberConversion function
// Use the comprehensive version from validation-utils.ts instead

/**
 * Safe string conversion with validation
 */
export function safeStringConversion(value: unknown): string {
  if (typeof value === 'string') return value
  if (typeof value === 'number') return value.toString()
  if (value === null || value === undefined) return ''
  throw new Error(`Cannot safely convert ${typeof value} to string`)
}
