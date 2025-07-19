'use client'

import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card'
import { PasswordSession } from '@/lib/e2ee-crypto-refactored'
import { GlobalDecryptionManager } from '@/lib/global-decryption-manager'
import { Lock } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

interface EncryptedExpenseDataProps {
  groupId: string
  expenseTitle: string
  expenseNotes?: string | null
  categoryName?: string | null

  // Existing encryption fields
  encryptedData?: string | null
  encryptionIv?: string | null

  // Comprehensive encryption fields
  encryptedCategory?: string | null
  categoryIv?: string | null
  encryptedShares?: string | null
  sharesIv?: string | null

  encryptionSalt?: string | null
  isEncrypted?: boolean
  className?: string
  showNotes?: boolean
  showCategory?: boolean
}

interface DecryptedExpenseData {
  title: string
  notes?: string
  categoryName?: string
  shareData?: Record<string, any>
}

export function EncryptedExpenseData({
  groupId,
  expenseTitle,
  expenseNotes,
  categoryName,
  encryptedData,
  encryptionIv,
  encryptedCategory,
  categoryIv,
  encryptedShares,
  sharesIv,
  encryptionSalt,
  isEncrypted = false,
  className = '',
  showNotes = false,
  showCategory = false,
}: EncryptedExpenseDataProps) {
  const [decryptedData, setDecryptedData] =
    useState<DecryptedExpenseData | null>(null)
  const [isDecrypting, setIsDecrypting] = useState(false)
  const [decryptionError, setDecryptionError] = useState(false)

  const decryptExpenseData = useCallback(async () => {
    if (!isEncrypted || !encryptionSalt) {
      setDecryptedData({
        title: expenseTitle,
        notes: expenseNotes || undefined,
        categoryName: categoryName || undefined,
      })
      return
    }

    const password = PasswordSession.getPassword(groupId)
    if (!password) {
      setDecryptionError(true)
      return
    }

    // SECURITY: Only decrypt if we have basic encrypted data (title/notes)
    if (!encryptedData || !encryptionIv) {
      setDecryptedData({
        title: expenseTitle,
        notes: expenseNotes || undefined,
        categoryName: categoryName || undefined,
      })
      return
    }

    try {
      setIsDecrypting(true)
      setDecryptionError(false)

      // SECURITY: Use GlobalDecryptionManager for basic title/notes decryption
      const basicDecrypted = await GlobalDecryptionManager.decryptExpenseData(
        encryptedData,
        encryptionIv,
        encryptionSalt,
        groupId,
        expenseTitle
      )

      setDecryptedData({
        title: basicDecrypted.title,
        notes: basicDecrypted.notes || expenseNotes || undefined,
        categoryName: categoryName || undefined, // Category decryption handled separately if needed
      })
    } catch (error) {
      console.error('Failed to decrypt expense data:', error)
      setDecryptionError(true)
      setDecryptedData({
        title: expenseTitle,
        notes: expenseNotes || undefined,
        categoryName: categoryName || undefined,
      })
    } finally {
      setIsDecrypting(false)
    }
  }, [
    groupId,
    expenseTitle,
    expenseNotes,
    categoryName,
    encryptedData,
    encryptionIv,
    encryptionSalt,
    isEncrypted,
  ])

  useEffect(() => {
    decryptExpenseData()
  }, [decryptExpenseData])

  // For non-encrypted expenses, show the data directly
  if (!isEncrypted) {
    return (
      <div className={className}>
        <div className="font-medium">{expenseTitle}</div>
        {showNotes && expenseNotes && (
          <div className="text-sm text-muted-foreground mt-1">
            {expenseNotes}
          </div>
        )}
        {showCategory && categoryName && (
          <div className="text-xs text-muted-foreground mt-1">
            Category: {categoryName}
          </div>
        )}
      </div>
    )
  }

  // Show loading state while decrypting
  if (isDecrypting) {
    return <div className={className}>Decrypting...</div>
  }

  // Show encrypted indicator if no password is available
  if (decryptionError && !PasswordSession.hasPassword(groupId)) {
    return (
      <div className={className}>
        <HoverCard>
          <HoverCardTrigger asChild>
            <div className="inline-flex items-center cursor-help">
              <Lock className="w-3 h-3 mr-1 text-primary" />
              {expenseTitle || 'Encrypted Expense'}
            </div>
          </HoverCardTrigger>
          <HoverCardContent className="w-80">
            <div className="text-sm">
              <p className="font-semibold mb-1">Encrypted Expense Data</p>
              <p>
                This expense data is encrypted with E2EE. Enter the correct
                password to view the actual expense details.
              </p>
            </div>
          </HoverCardContent>
        </HoverCard>
      </div>
    )
  }

  // Show decrypted data or fallback
  return (
    <div className={className}>
      <div className="font-medium inline-flex items-center">
        {decryptedData?.title || expenseTitle}
        {isEncrypted && (
          <Lock className="w-3 h-3 ml-1 text-primary opacity-60" />
        )}
      </div>
      {showNotes && (decryptedData?.notes || expenseNotes) && (
        <div className="text-sm text-muted-foreground mt-1">
          {decryptedData?.notes || expenseNotes}
        </div>
      )}
      {showCategory && (decryptedData?.categoryName || categoryName) && (
        <div className="text-xs text-muted-foreground mt-1">
          Category: {decryptedData?.categoryName || categoryName}
        </div>
      )}
    </div>
  )
}

/**
 * Hook for batch decryption of multiple expense data
 */
export function useDecryptedExpenseData(
  groupId: string,
  expenses: Array<{
    id: string
    title: string
    notes?: string | null
    categoryName?: string | null
    encryptedData?: string | null
    encryptionIv?: string | null
    encryptedCategory?: string | null
    categoryIv?: string | null
  }>,
  encryptionSalt?: string | null,
  isEncrypted?: boolean,
) {
  const [decryptedExpenses, setDecryptedExpenses] = useState<
    Map<string, DecryptedExpenseData>
  >(new Map())
  const [isDecrypting, setIsDecrypting] = useState(false)

  const decryptExpenseData = useCallback(async () => {
    if (!isEncrypted || !encryptionSalt || expenses.length === 0) {
      const expenseMap = new Map<string, DecryptedExpenseData>()
      expenses.forEach((expense) => {
        expenseMap.set(expense.id, {
          title: expense.title,
          notes: expense.notes || undefined,
          categoryName: expense.categoryName || undefined,
        })
      })
      setDecryptedExpenses(expenseMap)
      return
    }

    const password = PasswordSession.getPassword(groupId)
    if (!password) {
      return
    }

    try {
      setIsDecrypting(true)

      const expenseMap = new Map<string, DecryptedExpenseData>()

      // SECURITY: Use GlobalDecryptionManager for batch decryption
      for (const expense of expenses) {
        try {
          if (expense.encryptedData && expense.encryptionIv) {
            // Use GlobalDecryptionManager for centralized rate-limited decryption
            const decryptedData = await GlobalDecryptionManager.decryptExpenseData(
              expense.encryptedData,
              expense.encryptionIv,
              encryptionSalt,
              groupId,
              expense.title
            )
            
            expenseMap.set(expense.id, {
              title: decryptedData.title,
              notes: decryptedData.notes || expense.notes || undefined,
              categoryName: expense.categoryName || undefined,
            })
          } else {
            // Non-encrypted expense
            expenseMap.set(expense.id, {
              title: expense.title,
              notes: expense.notes || undefined,
              categoryName: expense.categoryName || undefined,
            })
          }
        } catch (error) {
          console.error(`Failed to decrypt expense ${expense.id}:`, error)
          // Fallback to original data
          expenseMap.set(expense.id, {
            title: expense.title,
            notes: expense.notes || undefined,
            categoryName: expense.categoryName || undefined,
          })
        }
      }

      setDecryptedExpenses(expenseMap)
    } catch (error) {
      console.error('Failed to decrypt expense data:', error)
      // Fallback to original data
      const expenseMap = new Map<string, DecryptedExpenseData>()
      expenses.forEach((expense) => {
        expenseMap.set(expense.id, {
          title: expense.title,
          notes: expense.notes || undefined,
          categoryName: expense.categoryName || undefined,
        })
      })
      setDecryptedExpenses(expenseMap)
    } finally {
      setIsDecrypting(false)
    }
  }, [groupId, expenses, encryptionSalt, isEncrypted])

  useEffect(() => {
    decryptExpenseData()
  }, [decryptExpenseData])

  return {
    decryptedExpenses,
    isDecrypting,
    getDecryptedExpense: (expenseId: string, fallback: DecryptedExpenseData) =>
      decryptedExpenses.get(expenseId) || fallback,
  }
}
