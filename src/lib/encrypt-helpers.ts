/**
 * E2EE Encryption helpers for group data
 *
 * These helpers encrypt/decrypt sensitive fields in group data.
 * The encryption key comes from the URL fragment and is never sent to the server.
 */

import { encrypt, decrypt, encryptNumber, decryptNumber } from './crypto'
import { GroupFormValues, ExpenseFormValues } from './schemas'

// Type for expense data with encrypted amounts (stored in DB)
export interface EncryptedExpenseData {
  title: string // encrypted
  notes?: string | null // encrypted
  amount: string // encrypted number
  originalAmount?: string // encrypted number
  paidFor: Array<{
    participant: string
    shares: string // encrypted number
  }>
}

// Types for encrypted data (stored in DB as base64 strings)
export interface EncryptedGroupFormValues {
  name: string // encrypted
  information?: string // encrypted
  currency: string // not encrypted (needed for display)
  currencyCode?: string | null // not encrypted
  participants: Array<{
    id?: string
    name: string // encrypted
  }>
}

export interface DecryptedGroup {
  id: string
  name: string
  information: string | null
  currency: string
  currencyCode: string | null
  participants: Array<{
    id: string
    name: string
  }>
}

/**
 * Encrypt group form values before sending to server
 */
export async function encryptGroupFormValues(
  values: GroupFormValues,
  encryptionKey: Uint8Array
): Promise<EncryptedGroupFormValues> {
  const encryptedName = await encrypt(values.name, encryptionKey)
  const encryptedInformation = values.information
    ? await encrypt(values.information, encryptionKey)
    : undefined

  const encryptedParticipants = await Promise.all(
    values.participants.map(async (p) => ({
      id: p.id,
      name: await encrypt(p.name, encryptionKey),
    }))
  )

  return {
    name: encryptedName,
    information: encryptedInformation,
    currency: values.currency,
    currencyCode: values.currencyCode,
    participants: encryptedParticipants,
  }
}

/**
 * Decrypt group data received from server
 */
export async function decryptGroup<
  T extends {
    id: string
    name: string
    information: string | null
    currency: string
    currencyCode: string | null
    participants: Array<{ id: string; name: string }>
  }
>(group: T, encryptionKey: Uint8Array): Promise<T> {
  try {
    const decryptedName = await decrypt(group.name, encryptionKey)
    const decryptedInformation = group.information
      ? await decrypt(group.information, encryptionKey)
      : null

    const decryptedParticipants = await Promise.all(
      group.participants.map(async (p) => ({
        ...p,
        name: await decrypt(p.name, encryptionKey),
      }))
    )

    return {
      ...group,
      name: decryptedName,
      information: decryptedInformation,
      participants: decryptedParticipants,
    }
  } catch (error) {
    // If decryption fails, return original data (might be unencrypted legacy data)
    console.warn('Decryption failed, returning original data:', error)
    return group
  }
}

/**
 * Check if a string looks like it might be encrypted
 */
export function looksEncrypted(value: string): boolean {
  // Encrypted data will be at least 20 characters (12 bytes IV + some ciphertext in base64)
  if (value.length < 20) return false
  // Check if it's valid URL-safe base64
  return /^[A-Za-z0-9_-]+$/.test(value)
}

/**
 * Encrypt expense form values before sending to server
 * This encrypts title, notes, amount, originalAmount, and shares
 */
export async function encryptExpenseFormValues(
  values: ExpenseFormValues,
  encryptionKey: Uint8Array
): Promise<ExpenseFormValues> {
  const encryptedTitle = await encrypt(values.title, encryptionKey)
  const encryptedNotes = values.notes
    ? await encrypt(values.notes, encryptionKey)
    : undefined

  // Encrypt amount (convert to number first if needed, then encrypt)
  const amountNum = typeof values.amount === 'string' ? parseFloat(values.amount) : values.amount
  const encryptedAmount = await encryptNumber(amountNum, encryptionKey)

  // Encrypt originalAmount if present
  let encryptedOriginalAmount: string | undefined
  if (values.originalAmount !== undefined && values.originalAmount !== '') {
    const origAmountNum = typeof values.originalAmount === 'string'
      ? parseFloat(values.originalAmount)
      : values.originalAmount
    encryptedOriginalAmount = await encryptNumber(origAmountNum, encryptionKey)
  }

  // Encrypt shares for each paidFor entry
  const encryptedPaidFor = await Promise.all(
    values.paidFor.map(async (pf) => {
      const sharesNum = typeof pf.shares === 'string' ? parseFloat(pf.shares) : pf.shares
      const encryptedShares = await encryptNumber(sharesNum, encryptionKey)
      return {
        ...pf,
        shares: encryptedShares,
      }
    })
  )

  return {
    ...values,
    title: encryptedTitle,
    notes: encryptedNotes,
    amount: encryptedAmount as unknown as number, // Type assertion for schema compatibility
    originalAmount: encryptedOriginalAmount as unknown as number | undefined,
    paidFor: encryptedPaidFor as unknown as ExpenseFormValues['paidFor'],
  }
}

/**
 * Decrypt expense data received from server
 * This decrypts title, notes, amount, originalAmount, and shares
 */
export async function decryptExpense<
  T extends {
    title: string
    notes?: string | null
    amount: string | number
    originalAmount?: string | number | null
    paidFor?: Array<{ shares: string | number; participant?: { id: string; name: string } }>
  }
>(expense: T, encryptionKey: Uint8Array): Promise<T> {
  try {
    const decryptedTitle = looksEncrypted(expense.title)
      ? await decrypt(expense.title, encryptionKey)
      : expense.title
    const decryptedNotes = expense.notes && looksEncrypted(expense.notes)
      ? await decrypt(expense.notes, encryptionKey)
      : expense.notes

    // Decrypt amount
    let decryptedAmount: number
    if (typeof expense.amount === 'string' && looksEncrypted(expense.amount)) {
      decryptedAmount = await decryptNumber(expense.amount, encryptionKey)
    } else if (typeof expense.amount === 'string') {
      decryptedAmount = parseFloat(expense.amount)
    } else {
      decryptedAmount = expense.amount
    }

    // Decrypt originalAmount if present
    let decryptedOriginalAmount: number | null = null
    if (expense.originalAmount !== undefined && expense.originalAmount !== null) {
      if (typeof expense.originalAmount === 'string' && looksEncrypted(expense.originalAmount)) {
        decryptedOriginalAmount = await decryptNumber(expense.originalAmount, encryptionKey)
      } else if (typeof expense.originalAmount === 'string') {
        decryptedOriginalAmount = parseFloat(expense.originalAmount)
      } else {
        decryptedOriginalAmount = expense.originalAmount
      }
    }

    const result: Record<string, unknown> = {
      ...expense,
      title: decryptedTitle,
      notes: decryptedNotes,
      amount: decryptedAmount,
      originalAmount: decryptedOriginalAmount,
    }

    // Decrypt paidBy participant name if present
    const paidBy = (expense as Record<string, unknown>).paidBy as
      | { id: string; name: string }
      | undefined
    if (paidBy && typeof paidBy === 'object' && 'name' in paidBy && looksEncrypted(paidBy.name)) {
      result.paidBy = {
        ...paidBy,
        name: await decrypt(paidBy.name, encryptionKey),
      }
    }

    // Decrypt paidFor shares and participant names if present
    const paidFor = expense.paidFor
    if (paidFor && Array.isArray(paidFor)) {
      result.paidFor = await Promise.all(
        paidFor.map(async (pf) => {
          // Decrypt shares
          let decryptedShares: number
          if (typeof pf.shares === 'string' && looksEncrypted(pf.shares)) {
            decryptedShares = await decryptNumber(pf.shares, encryptionKey)
          } else if (typeof pf.shares === 'string') {
            decryptedShares = parseFloat(pf.shares)
          } else {
            decryptedShares = pf.shares
          }

          // Decrypt participant name if present
          let decryptedParticipant = pf.participant
          if (pf.participant && looksEncrypted(pf.participant.name)) {
            decryptedParticipant = {
              ...pf.participant,
              name: await decrypt(pf.participant.name, encryptionKey),
            }
          }

          return {
            ...pf,
            shares: decryptedShares,
            participant: decryptedParticipant,
          }
        })
      )
    }

    return result as T
  } catch (error) {
    console.warn('Expense decryption failed, returning original data:', error)
    return expense
  }
}

/**
 * Decrypt multiple expenses
 */
export async function decryptExpenses<
  T extends {
    title: string
    notes?: string | null
    amount: string | number
    originalAmount?: string | number | null
    paidFor?: Array<{ shares: string | number; participant?: { id: string; name: string } }>
  }
>(expenses: T[], encryptionKey: Uint8Array): Promise<T[]> {
  return Promise.all(expenses.map((e) => decryptExpense(e, encryptionKey)))
}

/**
 * Decrypt activity data
 */
export async function decryptActivity<
  T extends {
    data: string | null
  }
>(activity: T, encryptionKey: Uint8Array): Promise<T> {
  if (!activity.data || !looksEncrypted(activity.data)) {
    return activity
  }

  try {
    const decryptedData = await decrypt(activity.data, encryptionKey)
    return {
      ...activity,
      data: decryptedData,
    }
  } catch (error) {
    return activity
  }
}

/**
 * Decrypt multiple activities
 */
export async function decryptActivities<
  T extends {
    data: string | null
  }
>(activities: T[], encryptionKey: Uint8Array): Promise<T[]> {
  return Promise.all(activities.map((a) => decryptActivity(a, encryptionKey)))
}
