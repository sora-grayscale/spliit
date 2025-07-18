'use client'

import { useEffect, useState } from 'react'
import { PasswordCrypto, PasswordSession } from '@/lib/e2ee-crypto-refactored'
import { Lock } from 'lucide-react'
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card'

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
  const [decryptedData, setDecryptedData] = useState<DecryptedExpenseData | null>(null)
  const [isDecrypting, setIsDecrypting] = useState(false)

  useEffect(() => {
    // Use AbortController to prevent race conditions
    const abortController = new AbortController()
    let isMounted = true
    
    const decryptExpenseData = async () => {
      // Enhanced input validation
      if (!isValidString(encryptedData) || !isValidString(encryptionIv) || !isValidString(encryptionSalt)) {
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
        if (isMounted) setDecryptedData(null)
        return
      }

      // Check if operation was aborted
      if (abortController.signal.aborted) return

      try {
        if (isMounted) setIsDecrypting(true)
        
        // API compatibility check: Handle both old and new API signatures
        let result: DecryptedExpenseData | null = null
        
        try {
          result = await PasswordCrypto.decryptExpenseData(
            encryptedData,
            encryptionIv,
            password,
            encryptionSalt,
            groupId
          )
        } catch (apiError) {
          // Fallback: Try without groupId for backward compatibility
          if (apiError instanceof Error && (apiError.message?.includes('groupId') || apiError.message?.includes('parameter'))) {
            console.warn('Falling back to legacy API without groupId parameter')
            
            result = await (PasswordCrypto.decryptExpenseData as any)(
              encryptedData,
              encryptionIv,
              password,
              encryptionSalt
            )
          } else {
            throw apiError
          }
        }
        
        // Check if operation was aborted after decryption
        if (abortController.signal.aborted || !isMounted) return
        
        // Validate decryption result
        if (!result || !isValidString(result.title)) {
          console.warn('Decryption returned invalid data structure')
          if (isMounted) setDecryptedData(null)
          return
        }
        
        if (isMounted) setDecryptedData(result)
      } catch (error) {
        // Don't log errors if the operation was aborted
        if (!abortController.signal.aborted) {
          console.error('Failed to decrypt expense data:', error)
        }
        if (isMounted) setDecryptedData(null)
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
  }, [encryptedData, encryptionIv, encryptionSalt, groupId])

  // Enhanced fallback title handling
  const safeFallbackTitle = isValidString(fallbackTitle) ? fallbackTitle : 'Unknown Expense'
  
  // If we have encrypted data but no decryption available, show locked indicator
  if (isValidString(encryptedData) && !decryptedData && !isDecrypting) {
    const displayTitle = fallbackTitle === '[Encrypted]' ? 'Encrypted Expense' : safeFallbackTitle
    
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
              <p>This expense is encrypted with E2EE. Enter the correct password to view the details.</p>
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
    const displayTitle = isValidString(decryptedData.title) ? decryptedData.title : safeFallbackTitle
    
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
  const displayTitle = decryptedData && isValidString(decryptedData.title) 
    ? decryptedData.title 
    : safeFallbackTitle
    
  return <span className={className}>{displayTitle}</span>
}