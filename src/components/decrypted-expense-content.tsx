'use client'

import { useEffect, useState } from 'react'
import { PasswordCrypto, PasswordSession } from '@/lib/e2ee-crypto'
import { Lock } from 'lucide-react'

interface DecryptedExpenseContentProps {
  encryptedData?: string | null
  encryptionIv?: string | null
  encryptionSalt?: string | null
  groupId: string
  fallbackTitle: string
  className?: string
}

interface DecryptedExpenseData {
  title: string
  notes: string
}

export function DecryptedExpenseContent({
  encryptedData,
  encryptionIv,
  encryptionSalt,
  groupId,
  fallbackTitle,
  className,
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
        const key = await PasswordCrypto.deriveKeyFromPassword(password, encryptionSalt)
        const decryptedJson = await PasswordCrypto.decryptData(encryptedData, encryptionIv, key)
        const parsed = JSON.parse(decryptedJson) as DecryptedExpenseData
        setDecryptedData(parsed)
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
        <Lock className="w-3 h-3 inline mr-1" />
        {fallbackTitle === '[Encrypted]' ? 'Encrypted Expense' : fallbackTitle}
      </span>
    )
  }

  // If decrypting, show loading state
  if (isDecrypting) {
    return <span className={className}>Decrypting...</span>
  }

  // Show decrypted content or fallback
  return <span className={className}>{decryptedData?.title || fallbackTitle}</span>
}