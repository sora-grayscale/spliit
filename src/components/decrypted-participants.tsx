'use client'

import { DecryptedPaymentService } from '@/lib/decrypted-payment-service'
import { useCallback, useEffect, useState } from 'react'
import { Fragment } from 'react'
import { useTranslations } from 'next-intl'

interface DecryptedParticipantsProps {
  expense: {
    id: string
    amount: number
    paidBy: { id: string; name: string }
    paidFor: Array<{
      participant: { id: string; name: string }
      shares: number
    }>
    encryptedPaidBy?: string | null
    paidByIv?: string | null
    encryptedPaidFor?: string | null
    paidForIv?: string | null
    encryptionVersion?: number | null
  }
  groupId: string
  isGroupEncrypted: boolean
}

interface DecryptedPaymentData {
  paidBy: {
    id: string
    name: string
  }
  paidFor: Array<{
    participant: {
      id: string
      name: string
    }
    shares: number
  }>
}

export function DecryptedParticipants({ 
  expense, 
  groupId, 
  isGroupEncrypted 
}: DecryptedParticipantsProps) {
  const t = useTranslations('ExpenseCard')
  const [decryptedPayment, setDecryptedPayment] = useState<DecryptedPaymentData | null>(null)
  const [isDecrypting, setIsDecrypting] = useState(false)
  
  const decryptPaymentData = useCallback(async () => {
    // If not encrypted or no encrypted payment data, use original data
    if (!isGroupEncrypted || !DecryptedPaymentService.hasEncryptedPaymentData(expense)) {
      setDecryptedPayment({
        paidBy: expense.paidBy,
        paidFor: expense.paidFor,
      })
      return
    }
    
    try {
      setIsDecrypting(true)
      const result = await DecryptedPaymentService.decryptExpensePaymentData(expense, groupId)
      setDecryptedPayment(result)
    } catch (error) {
      console.warn('Failed to decrypt payment data:', error)
      // Use fallback data
      setDecryptedPayment(DecryptedPaymentService.getFallbackPaymentData())
    } finally {
      setIsDecrypting(false)
    }
  }, [expense, groupId, isGroupEncrypted])

  useEffect(() => {
    decryptPaymentData()
  }, [decryptPaymentData])

  if (isDecrypting) {
    return <span className="text-muted-foreground">Decrypting participants...</span>
  }

  if (!decryptedPayment) {
    return <span className="text-muted-foreground">Loading participants...</span>
  }

  const key = expense.amount > 0 ? 'paidBy' : 'receivedBy'
  const paidFor = decryptedPayment.paidFor.map((paidFor, index) => (
    <Fragment key={index}>
      {index !== 0 && <>, </>}
      <strong>{paidFor.participant.name}</strong>
    </Fragment>
  ))

  const participants = t.rich(key, {
    strong: (chunks) => <strong>{chunks}</strong>,
    paidBy: decryptedPayment.paidBy.name,
    paidFor: () => paidFor,
    forCount: decryptedPayment.paidFor.length,
  })

  return <>{participants}</>
}