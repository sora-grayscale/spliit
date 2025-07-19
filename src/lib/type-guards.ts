/**
 * Type guards and runtime validation utilities
 * SECURITY: Prevents dangerous type casting with runtime validation
 */

/**
 * Safe group statistics data type guard
 */
export interface SafeGroupStatsData extends Record<string, unknown> {
  totalExpenses: number
  totalAmount: number
  averageExpense: number
  participantCount: number
  lastActivity?: string
}

export function isGroupStatsData(data: unknown): data is SafeGroupStatsData {
  if (!data || typeof data !== 'object') return false
  
  const obj = data as Record<string, unknown>
  
  return (
    typeof obj.totalExpenses === 'number' &&
    typeof obj.totalAmount === 'number' &&
    typeof obj.averageExpense === 'number' &&
    typeof obj.participantCount === 'number' &&
    (obj.lastActivity === undefined || typeof obj.lastActivity === 'string')
  )
}

/**
 * Safe participant statistics data type guard
 */
export interface SafeParticipantStatsData extends Record<string, unknown> {
  participantId: string
  totalPaid: number
  totalOwed: number
  netBalance: number
  expenseCount: number
}

export function isParticipantStatsData(data: unknown): data is SafeParticipantStatsData {
  if (!data || typeof data !== 'object') return false
  
  const obj = data as Record<string, unknown>
  
  return (
    typeof obj.participantId === 'string' &&
    typeof obj.totalPaid === 'number' &&
    typeof obj.totalOwed === 'number' &&
    typeof obj.netBalance === 'number' &&
    typeof obj.expenseCount === 'number'
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
    (obj.defaultSplitMode === undefined || typeof obj.defaultSplitMode === 'string') &&
    (obj.notifications === undefined || typeof obj.notifications === 'boolean') &&
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

export function isParticipantSettings(data: unknown): data is ParticipantSettings {
  if (!data || typeof data !== 'object') return false
  
  const obj = data as Record<string, unknown>
  
  return (
    (obj.displayName === undefined || typeof obj.displayName === 'string') &&
    (obj.notificationPreferences === undefined || 
     (typeof obj.notificationPreferences === 'object' && obj.notificationPreferences !== null)) &&
    (obj.defaultRole === undefined || typeof obj.defaultRole === 'string')
  )
}

/**
 * Safe encrypted balance data type guard
 */
export interface SafeEncryptedBalanceData extends Record<string, unknown> {
  participantId: string
  balance: number
  currency?: string
}

export function isEncryptedBalanceData(data: unknown): data is SafeEncryptedBalanceData {
  if (!data || typeof data !== 'object') return false
  
  const obj = data as Record<string, unknown>
  
  return (
    typeof obj.participantId === 'string' &&
    typeof obj.balance === 'number' &&
    (obj.currency === undefined || typeof obj.currency === 'string')
  )
}

/**
 * Safe number conversion with validation
 */
export function safeNumberConversion(value: unknown): number {
  if (typeof value === 'number') return value
  if (typeof value === 'string') {
    const parsed = parseFloat(value)
    if (!isNaN(parsed) && isFinite(parsed)) return parsed
  }
  throw new Error(`Cannot safely convert ${typeof value} to number: ${value}`)
}

/**
 * Safe string conversion with validation
 */
export function safeStringConversion(value: unknown): string {
  if (typeof value === 'string') return value
  if (typeof value === 'number') return value.toString()
  if (value === null || value === undefined) return ''
  throw new Error(`Cannot safely convert ${typeof value} to string: ${value}`)
}