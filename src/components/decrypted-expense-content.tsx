'use client'

import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card'
import { PasswordSession } from '@/lib/e2ee-crypto-refactored'
import { GlobalDecryptionManager } from '@/lib/global-decryption-manager'
import { Lock } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

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
  const isMountedRef = useRef(true)

  // Memoize fallback title to prevent unnecessary re-renders
  const memoizedFallbackTitle = useMemo(() => {
    return isValidString(fallbackTitle) ? fallbackTitle : 'Untitled Expense'
  }, [fallbackTitle])

  // SECURITY: Debounce decryption attempts to prevent rapid successive calls
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
  
  // SECURITY: Memoize the decryption function using GlobalDecryptionManager
  const decryptExpenseData = useCallback(
    async (
      abortController: AbortController,
      isMountedRef: React.MutableRefObject<boolean>,
    ) => {
      // Check if this is a non-encrypted expense first
      if (!isValidString(encryptedData) || !isValidString(encryptionIv)) {
        // Non-encrypted expense: use fallback title immediately
        if (isMountedRef.current) {
          setDecryptedData({
            title: memoizedFallbackTitle,
            notes: undefined,
          })
        }
        return
      }

      // For encrypted expenses, we need encryption salt
      if (!isValidString(encryptionSalt)) {
        if (isMountedRef.current) setDecryptedData(null)
        return
      }

      if (!isValidString(groupId)) {
        if (isMountedRef.current) setDecryptedData(null)
        return
      }

      const password = PasswordSession.getPassword(groupId)
      if (!isValidString(password)) {
        if (isMountedRef.current) {
          // No password available - leave as null to show locked indicator
          setDecryptedData(null)
        }
        return
      }

      // Check if operation was aborted
      if (abortController.signal.aborted) return

      try {
        if (isMountedRef.current) setIsDecrypting(true)

        // SECURITY: Use GlobalDecryptionManager for rate-limited, cached decryption
        const result = await GlobalDecryptionManager.decryptExpenseData(
          encryptedData,
          encryptionIv,
          encryptionSalt,
          groupId,
          memoizedFallbackTitle
        )

        // Check if operation was aborted after decryption
        if (abortController.signal.aborted || !isMountedRef.current) return

        // Validate decryption result
        if (!result || !isValidString(result.title)) {
          if (isMountedRef.current) {
            setDecryptedData({
              title: memoizedFallbackTitle,
              notes: undefined,
            })
          }
          return
        }

        if (isMountedRef.current) {
          setDecryptedData(result)
        }
      } catch (error) {
        // SECURITY FIX: Enhanced error logging without sensitive data exposure
        if (!abortController.signal.aborted) {
          if (error instanceof Error) {
            if (error.message.includes('Rate limit')) {
              console.warn('Decryption rate limit exceeded, using fallback title')
            } else if (error.message.includes('Authentication')) {
              console.warn('Decryption authentication failed, using fallback title')
            } else {
              console.warn('Decryption failed:', error.message)
            }
          } else {
            console.warn('Unexpected decryption error')
          }
        }
        if (isMountedRef.current) {
          // Set fallback instead of null for error cases
          setDecryptedData({
            title: memoizedFallbackTitle,
            notes: undefined,
          })
        }
      } finally {
        if (isMountedRef.current) setIsDecrypting(false)
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
    isMountedRef.current = true

    // Use AbortController to prevent race conditions
    const abortController = new AbortController()

    // SECURITY: Clear any existing debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    // SECURITY: Debounce decryption calls to prevent rapid successive attempts
    debounceTimerRef.current = setTimeout(() => {
      if (!abortController.signal.aborted) {
        decryptExpenseData(abortController, isMountedRef)
      }
    }, 200) // Increased debounce delay for security

    // Cleanup function to prevent race conditions
    return () => {
      isMountedRef.current = false
      abortController.abort()
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
        debounceTimerRef.current = null
      }
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
