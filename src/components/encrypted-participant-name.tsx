'use client'

import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card'
import { ComprehensiveEncryptionService } from '@/lib/comprehensive-encryption'
import { PasswordSession } from '@/lib/e2ee-crypto-refactored'
import { Lock } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

interface EncryptedParticipantNameProps {
  groupId: string
  participantName: string
  encryptedName?: string | null
  nameIv?: string | null
  encryptionSalt?: string | null
  isEncrypted?: boolean
  className?: string
}

export function EncryptedParticipantName({
  groupId,
  participantName,
  encryptedName,
  nameIv,
  encryptionSalt,
  isEncrypted = false,
  className = '',
}: EncryptedParticipantNameProps) {
  const [decryptedName, setDecryptedName] = useState<string | null>(null)
  const [isDecrypting, setIsDecrypting] = useState(false)
  const [decryptionError, setDecryptionError] = useState(false)

  const decryptParticipantName = useCallback(async () => {
    if (!isEncrypted || !encryptedName || !nameIv || !encryptionSalt) {
      setDecryptedName(participantName)
      return
    }

    const password = PasswordSession.getPassword(groupId)
    if (!password) {
      setDecryptionError(true)
      return
    }

    try {
      setIsDecrypting(true)
      setDecryptionError(false)

      const decryptedData =
        await ComprehensiveEncryptionService.decryptParticipantData(
          [
            {
              encryptedName,
              nameIv,
              encryptionVersion: 1,
            },
          ],
          password,
          encryptionSalt,
        )

      if (decryptedData.length > 0) {
        setDecryptedName(decryptedData[0].name)
      } else {
        setDecryptionError(true)
      }
    } catch (error) {
      console.error('Failed to decrypt participant name:', error)
      setDecryptionError(true)
      setDecryptedName(participantName) // Fallback to original name
    } finally {
      setIsDecrypting(false)
    }
  }, [
    groupId,
    participantName,
    encryptedName,
    nameIv,
    encryptionSalt,
    isEncrypted,
  ])

  useEffect(() => {
    decryptParticipantName()
  }, [decryptParticipantName])

  // For non-encrypted participants, show the name directly
  if (!isEncrypted) {
    return <span className={className}>{participantName}</span>
  }

  // Show loading state while decrypting
  if (isDecrypting) {
    return <span className={className}>Decrypting...</span>
  }

  // Show encrypted indicator if no password is available
  if (decryptionError && !PasswordSession.hasPassword(groupId)) {
    return (
      <span className={className}>
        <HoverCard>
          <HoverCardTrigger asChild>
            <span className="inline-flex items-center cursor-help">
              <Lock className="w-3 h-3 mr-1 text-primary" />
              {participantName || 'Encrypted Participant'}
            </span>
          </HoverCardTrigger>
          <HoverCardContent className="w-80">
            <div className="text-sm">
              <p className="font-semibold mb-1">Encrypted Participant Name</p>
              <p>
                This participant name is encrypted with E2EE. Enter the correct
                password to view the actual participant name.
              </p>
            </div>
          </HoverCardContent>
        </HoverCard>
      </span>
    )
  }

  // Show decrypted name or fallback
  return (
    <span className={className}>
      {decryptedName || participantName}
    </span>
  )
}

/**
 * Hook for batch decryption of multiple participant names
 */
export function useDecryptedParticipantNames(
  groupId: string,
  participants: Array<{
    id?: string
    name: string
    encryptedName?: string | null
    nameIv?: string | null
  }>,
  encryptionSalt?: string | null,
  isEncrypted?: boolean,
) {
  const [decryptedNames, setDecryptedNames] = useState<Map<string, string>>(
    new Map(),
  )
  const [isDecrypting, setIsDecrypting] = useState(false)

  const decryptParticipantNames = useCallback(async () => {
    if (!isEncrypted || !encryptionSalt || participants.length === 0) {
      const nameMap = new Map<string, string>()
      participants.forEach((p) => {
        nameMap.set(p.id || p.name, p.name)
      })
      setDecryptedNames(nameMap)
      return
    }

    const password = PasswordSession.getPassword(groupId)
    if (!password) {
      return
    }

    try {
      setIsDecrypting(true)

      const encryptedParticipants = participants
        .filter((p) => p.encryptedName && p.nameIv)
        .map((p) => ({
          id: p.id,
          encryptedName: p.encryptedName!,
          nameIv: p.nameIv!,
          encryptionVersion: 1,
        }))

      if (encryptedParticipants.length === 0) {
        return
      }

      const decryptedData =
        await ComprehensiveEncryptionService.decryptParticipantData(
          encryptedParticipants,
          password,
          encryptionSalt,
        )

      const nameMap = new Map<string, string>()
      decryptedData.forEach((p) => {
        nameMap.set(p.id || p.name, p.name)
      })

      // Add non-encrypted participants
      participants.forEach((p) => {
        if (!p.encryptedName) {
          nameMap.set(p.id || p.name, p.name)
        }
      })

      setDecryptedNames(nameMap)
    } catch (error) {
      console.error('Failed to decrypt participant names:', error)
      // Fallback to original names
      const nameMap = new Map<string, string>()
      participants.forEach((p) => {
        nameMap.set(p.id || p.name, p.name)
      })
      setDecryptedNames(nameMap)
    } finally {
      setIsDecrypting(false)
    }
  }, [groupId, participants, encryptionSalt, isEncrypted])

  useEffect(() => {
    decryptParticipantNames()
  }, [decryptParticipantNames])

  return {
    decryptedNames,
    isDecrypting,
    getDecryptedName: (participantId: string, fallback: string) =>
      decryptedNames.get(participantId) || fallback,
  }
}
