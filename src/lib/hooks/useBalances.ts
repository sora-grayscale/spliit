'use client'

import { useEncryption } from '@/components/encryption-provider'
import { decryptExpenses } from '@/lib/encrypt-helpers'
import { getBalances, getSuggestedReimbursements, getPublicBalances, Balances, Reimbursement } from '@/lib/balances'
import { trpc } from '@/trpc/client'
import { useEffect, useMemo, useRef, useState } from 'react'

/**
 * Hook for calculating balances on the client side
 * This handles decryption of amounts for encrypted groups
 */
export function useBalances(groupId: string) {
  const { encryptionKey, isLoading: isKeyLoading, hasKey } = useEncryption()

  // Fetch all expenses for this group (without pagination for balance calculation)
  const { data: expensesData, isLoading: expensesAreLoading } =
    trpc.groups.expenses.listAll.useQuery({ groupId })

  const rawExpenses = expensesData?.expenses

  // Handle async decryption
  const [decryptedExpenses, setDecryptedExpenses] = useState<
    typeof rawExpenses
  >(undefined)
  const lastDecryptedRef = useRef<{ key: string; withKey: boolean } | null>(null)

  useEffect(() => {
    const expenseIds = rawExpenses?.map((e) => e.id).join(',') || ''
    const shouldDecryptWithKey = hasKey && encryptionKey !== null

    // Skip if already processed with same state
    if (
      lastDecryptedRef.current?.key === expenseIds &&
      lastDecryptedRef.current?.withKey === shouldDecryptWithKey
    ) {
      return
    }

    async function decrypt() {
      if (!rawExpenses) {
        setDecryptedExpenses(undefined)
        return
      }

      // If no encryption key, use original data
      if (!isKeyLoading && !hasKey) {
        setDecryptedExpenses(rawExpenses)
        lastDecryptedRef.current = { key: expenseIds, withKey: false }
        return
      }

      if (!encryptionKey) {
        return // Still loading
      }

      try {
        const decrypted = await decryptExpenses(rawExpenses, encryptionKey)
        setDecryptedExpenses(decrypted)
        lastDecryptedRef.current = { key: expenseIds, withKey: true }
      } catch (error) {
        console.warn('Failed to decrypt expenses for balance calculation:', error)
        setDecryptedExpenses(rawExpenses)
        lastDecryptedRef.current = { key: expenseIds, withKey: true }
      }
    }

    decrypt()
  }, [rawExpenses, encryptionKey, isKeyLoading, hasKey])

  // Calculate balances from decrypted expenses
  const { balances, reimbursements } = useMemo(() => {
    if (!decryptedExpenses || decryptedExpenses.length === 0) {
      return { balances: {} as Balances, reimbursements: [] as Reimbursement[] }
    }

    const calculatedBalances = getBalances(decryptedExpenses)
    const calculatedReimbursements = getSuggestedReimbursements(calculatedBalances)
    const publicBalances = getPublicBalances(calculatedReimbursements)

    return {
      balances: publicBalances,
      reimbursements: calculatedReimbursements,
    }
  }, [decryptedExpenses])

  const isLoading = expensesAreLoading || isKeyLoading || !decryptedExpenses

  return {
    balances,
    reimbursements,
    isLoading,
    expenses: decryptedExpenses,
  }
}
