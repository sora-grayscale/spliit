'use client'

import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card'
import { PasswordCrypto, PasswordSession } from '@/lib/e2ee-crypto-refactored'
import { Lock } from 'lucide-react'
import { useEffect, useState } from 'react'

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

  // Debug the initial props - only once per component instance
  console.debug('🔧 DecryptedExpenseContent mounted with props:', {
    encryptedData: encryptedData || 'null/empty',
    encryptionIv: encryptionIv || 'null/empty',
    fallbackTitle: fallbackTitle || 'null/empty',
    groupId,
  })

  useEffect(() => {
    // Reset state when props change
    setDecryptedData(null)
    setIsDecrypting(false)

    // Use AbortController to prevent race conditions
    const abortController = new AbortController()
    let isMounted = true

    const decryptExpenseData = async () => {
      console.debug('🔄 DecryptedExpenseContent useEffect executing:', {
        encryptedData: encryptedData ? 'present' : 'missing',
        encryptionIv: encryptionIv ? 'present' : 'missing',
        fallbackTitle,
        groupId,
      })

      // Check if this is a non-encrypted expense first
      if (!isValidString(encryptedData) || !isValidString(encryptionIv)) {
        // Non-encrypted expense: use fallback title immediately
        if (isMounted) {
          const displayTitle = isValidString(fallbackTitle)
            ? fallbackTitle
            : 'Untitled Expense'

          console.debug('📝 Setting non-encrypted expense title:', displayTitle)
          setDecryptedData({
            title: displayTitle,
            notes: undefined,
          })
        }
        return
      }

      // For encrypted expenses, we need encryption salt
      if (!isValidString(encryptionSalt)) {
        console.error('Encrypted expense missing encryption salt')
        if (isMounted) setDecryptedData(null)
        return
      }

      if (!isValidString(groupId)) {
        console.error('Invalid groupId provided to DecryptedExpenseContent')
        if (isMounted) setDecryptedData(null)
        return
      }

      const password = PasswordSession.getPassword(groupId)
      if (!isValidString(password)) {
        console.debug(
          '🔒 No password available for groupId:',
          groupId,
          'PasswordSession state:',
          {
            hasPassword: PasswordSession.hasPassword(groupId),
          },
        )
        if (isMounted) {
          // No password available - leave as null to show locked indicator
          setDecryptedData(null)
        }
        return
      }

      console.debug(
        '🔑 Password found for groupId:',
        groupId,
        'proceeding with decryption',
      )

      // Check if operation was aborted
      if (abortController.signal.aborted) return

      try {
        if (isMounted) setIsDecrypting(true)

        // Use modern API directly for reliable decryption
        let result: DecryptedExpenseData | null = null

        console.debug('🔐 Starting decryption with params:', {
          encryptedDataLength: encryptedData?.length || 0,
          ivLength: encryptionIv?.length || 0,
          saltLength: encryptionSalt?.length || 0,
          hasPassword: !!password,
          groupId: groupId,
        })

        try {
          console.debug('🚀 Using modern API for decryption')
          result = await PasswordCrypto.decryptExpenseData(
            encryptedData,
            encryptionIv,
            password,
            encryptionSalt,
            groupId,
          )
        } catch (error) {
          console.error('🚨 Decryption failed:', error)
          throw error
        }

        // Check if operation was aborted after decryption
        if (abortController.signal.aborted || !isMounted) return

        // Validate decryption result
        if (!result || !isValidString(result.title)) {
          console.warn(
            'Decryption returned invalid data structure, using fallback',
          )
          if (isMounted) {
            const fallback = isValidString(fallbackTitle)
              ? fallbackTitle
              : 'Untitled Expense'
            setDecryptedData({
              title: fallback,
              notes: undefined,
            })
          }
          return
        }

        console.debug('Decryption successful, setting result:', result)
        if (isMounted) {
          setDecryptedData(result)
          console.debug('✅ Decrypted data set:', result)
        }
      } catch (error) {
        // Don't log errors if the operation was aborted
        if (!abortController.signal.aborted) {
          console.error('Failed to decrypt expense data:', error)
        }
        if (isMounted) {
          // Set fallback instead of null for error cases
          const fallback = isValidString(fallbackTitle)
            ? fallbackTitle
            : 'Untitled Expense'
          console.debug('Decryption failed, using fallback:', fallback)
          setDecryptedData({
            title: fallback,
            notes: undefined,
          })
        }
      } finally {
        if (isMounted) setIsDecrypting(false)
      }
    }

    decryptExpenseData()

    // Cleanup function to prevent race conditions
    return () => {
      isMounted = false
      abortController.abort()
    }
  }, [encryptedData, encryptionIv, encryptionSalt, groupId, fallbackTitle])

  // Enhanced fallback title handling
  const safeFallbackTitle = isValidString(fallbackTitle)
    ? fallbackTitle
    : 'Untitled Expense'

  // Show locked indicator only for encrypted expenses without password
  const isEncryptedExpense =
    isValidString(encryptedData) && isValidString(encryptionIv)
  const hasPassword = PasswordSession.hasPassword(groupId)
  const shouldShowLocked =
    isEncryptedExpense && !decryptedData && !isDecrypting && !hasPassword

  console.debug('Lock indicator logic:', {
    isEncryptedExpense,
    hasPassword,
    hasDecryptedData: !!decryptedData,
    isDecrypting,
    shouldShowLocked,
  })

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

  console.debug('Final display logic:', {
    decryptedData,
    displayTitle,
    safeFallbackTitle,
    hasDecryptedData: !!decryptedData,
    hasDecryptedTitle: decryptedData && isValidString(decryptedData.title),
  })

  return <span className={className}>{displayTitle}</span>
}
