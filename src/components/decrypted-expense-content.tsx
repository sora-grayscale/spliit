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
    const decryptExpenseData = async () => {
      if (!encryptedData || !encryptionIv || !encryptionSalt) {
        return
      }

      const password = PasswordSession.getPassword(groupId)
      if (!password) {
        return
      }

      try {
        setIsDecrypting(true)
        const result = await PasswordCrypto.decryptExpenseData(
          encryptedData,
          encryptionIv,
          password,
          encryptionSalt,
          groupId
        )
        setDecryptedData(result)
      } catch (error) {
        console.error('Failed to decrypt expense data:', error)
        // Fall back to encrypted indicator
      } finally {
        setIsDecrypting(false)
      }
    }

    decryptExpenseData()
  }, [encryptedData, encryptionIv, encryptionSalt, groupId])

  // If we have encrypted data but no decryption available, show locked indicator
  if (encryptedData && !decryptedData && !isDecrypting) {
    return (
      <span className={className}>
        <HoverCard>
          <HoverCardTrigger asChild>
            <Lock className="w-3 h-3 inline mr-1 text-primary cursor-help" />
          </HoverCardTrigger>
          <HoverCardContent className="w-80">
            <div className="text-sm">
              <p className="font-semibold mb-1">End-to-End Encrypted Expense</p>
              <p>This expense is encrypted with E2EE. Enter the correct password to view the details.</p>
            </div>
          </HoverCardContent>
        </HoverCard>
        {fallbackTitle === '[Encrypted]' ? 'Encrypted Expense' : fallbackTitle}
      </span>
    )
  }

  // If decrypting, show loading state
  if (isDecrypting) {
    return <span className={className}>Decrypting...</span>
  }

  // Show decrypted content or fallback
  if (showNotes && decryptedData?.notes) {
    return (
      <span className={className}>
        <div>{decryptedData.title || fallbackTitle}</div>
        <div className="text-sm text-muted-foreground mt-1">{decryptedData.notes}</div>
      </span>
    )
  }
  
  return <span className={className}>{decryptedData?.title || fallbackTitle}</span>
}