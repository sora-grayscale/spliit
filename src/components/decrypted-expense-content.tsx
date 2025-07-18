'use client'

import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card'
import { PasswordCrypto, PasswordSession } from '@/lib/e2ee-crypto-refactored'
import { Lock } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'

interface DecryptedExpenseContentProps {
  encryptedData?: string | null
  encryptionIv?: string | null
  encryptionSalt?: string | null
  groupId: string
  fallbackTitle: string
  className?: string
  showNotes?: boolean
}

// Type guard to ensure safe string handling
function isValidString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

interface DecryptedExpenseData {
  title: string
  notes?: string
}

export function DecryptedExpenseContent({
  encryptedData,
  encryptionIv,
  encryptionSalt,
  groupId,
  fallbackTitle,
  className,
  showNotes = false,
}: DecryptedExpenseContentProps) {
  const [decryptedData, setDecryptedData] =
    useState<DecryptedExpenseData | null>(null)
  const [isDecrypting, setIsDecrypting] = useState(false)

  // Memoize fallback title to prevent unnecessary re-renders
  const memoizedFallbackTitle = useMemo(() => {
    return isValidString(fallbackTitle) ? fallbackTitle : 'Untitled Expense'
  }, [fallbackTitle])

  // Memoize the decryption function to prevent recreation on every render
  const decryptExpenseData = useCallback(
    async (
      abortController: AbortController,
      isMounted: { current: boolean },
    ) => {
      // Check if this is a non-encrypted expense first
      if (!isValidString(encryptedData) || !isValidString(encryptionIv)) {
        // Non-encrypted expense: use fallback title immediately
        if (isMounted.current) {
          setDecryptedData({
            title: memoizedFallbackTitle,
            notes: undefined,
          })
        }
        return
      }

      // For encrypted expenses, we need encryption salt
      if (!isValidString(encryptionSalt)) {
        if (isMounted.current) setDecryptedData(null)
        return
      }

      if (!isValidString(groupId)) {
        if (isMounted.current) setDecryptedData(null)
        return
      }

      const password = PasswordSession.getPassword(groupId)
      if (!isValidString(password)) {
        if (isMounted.current) {
          // No password available - leave as null to show locked indicator
          setDecryptedData(null)
        }
        return
      }

      // Check if operation was aborted
      if (abortController.signal.aborted) return

      try {
        if (isMounted.current) setIsDecrypting(true)

        // Use modern API directly for reliable decryption
        let result: DecryptedExpenseData | null = null

        try {
          result = await PasswordCrypto.decryptExpenseData(
            encryptedData,
            encryptionIv,
            password,
            encryptionSalt,
            groupId,
          )
        } catch (error) {
          throw error
        }

        // Check if operation was aborted after decryption
        if (abortController.signal.aborted || !isMounted.current) return

        // Validate decryption result
        if (!result || !isValidString(result.title)) {
          if (isMounted.current) {
            setDecryptedData({
              title: memoizedFallbackTitle,
              notes: undefined,
            })
          }
          return
        }

        if (isMounted.current) {
          setDecryptedData(result)
        }
      } catch (error) {
        // Don't log errors if the operation was aborted
        if (!abortController.signal.aborted) {
          console.error('Failed to decrypt expense data:', error)
        }
        if (isMounted.current) {
          // Set fallback instead of null for error cases
          setDecryptedData({
            title: memoizedFallbackTitle,
            notes: undefined,
          })
        }
      } finally {
        if (isMounted.current) setIsDecrypting(false)
      }
    },
    [
      encryptedData,
      encryptionIv,
      encryptionSalt,
      groupId,
      memoizedFallbackTitle,
    ],
  )

  useEffect(() => {
    // Reset state when props change
    setDecryptedData(null)
    setIsDecrypting(false)

    // Use AbortController to prevent race conditions
    const abortController = new AbortController()
    const isMounted = { current: true }

    decryptExpenseData(abortController, isMounted)

    // Cleanup function to prevent race conditions
    return () => {
      isMounted.current = false
      abortController.abort()
    }
  }, [decryptExpenseData])

  // Use memoized fallback title
  const safeFallbackTitle = memoizedFallbackTitle

  // Show locked indicator only for encrypted expenses without password
  const isEncryptedExpense =
    isValidString(encryptedData) && isValidString(encryptionIv)
  const hasPassword = PasswordSession.hasPassword(groupId)
  const shouldShowLocked =
    isEncryptedExpense && !decryptedData && !isDecrypting && !hasPassword

  if (shouldShowLocked) {
    const displayTitle =
      fallbackTitle === '[Encrypted]' ||
      fallbackTitle === '' ||
      !isValidString(fallbackTitle)
        ? 'Encrypted Expense'
        : safeFallbackTitle

    return (
      <span className={className}>
        <HoverCard>
          <HoverCardTrigger asChild>
            <span className="inline-flex items-center">
              <Lock className="w-3 h-3 mr-1 text-primary cursor-help" />
              {displayTitle}
            </span>
          </HoverCardTrigger>
          <HoverCardContent className="w-80">
            <div className="text-sm">
              <p className="font-semibold mb-1">End-to-End Encrypted Expense</p>
              <p>
                This expense is encrypted with E2EE. Enter the correct password
                to view the details.
              </p>
            </div>
          </HoverCardContent>
        </HoverCard>
      </span>
    )
  }

  // If decrypting, show loading state
  if (isDecrypting) {
    return <span className={className}>Decrypting...</span>
  }

  // Enhanced notes display logic with proper undefined checks
  if (showNotes && decryptedData) {
    const hasValidNotes = isValidString(decryptedData.notes)
    const displayTitle = isValidString(decryptedData.title)
      ? decryptedData.title
      : safeFallbackTitle

    return (
      <span className={className}>
        <span className="block">{displayTitle}</span>
        {hasValidNotes && (
          <span className="block text-sm text-muted-foreground mt-1">
            {decryptedData.notes}
          </span>
        )}
      </span>
    )
  }

  // Safe title display with fallback
  const displayTitle =
    decryptedData && isValidString(decryptedData.title)
      ? decryptedData.title
      : safeFallbackTitle

  return <span className={className}>{displayTitle}</span>
}
