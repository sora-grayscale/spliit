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

interface EncryptedGroupNameProps {
  groupId: string
  groupName: string
  encryptedName?: string | null
  nameIv?: string | null
  encryptionSalt?: string | null
  isEncrypted?: boolean
  className?: string
}

export function EncryptedGroupName({
  groupId,
  groupName,
  encryptedName,
  nameIv,
  encryptionSalt,
  isEncrypted = false,
  className = '',
}: EncryptedGroupNameProps) {
  const [decryptedName, setDecryptedName] = useState<string | null>(null)
  const [isDecrypting, setIsDecrypting] = useState(false)
  const [decryptionError, setDecryptionError] = useState(false)

  const decryptGroupName = useCallback(async () => {
    if (!isEncrypted || !encryptedName || !nameIv || !encryptionSalt) {
      setDecryptedName(groupName)
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
        await ComprehensiveEncryptionService.decryptGroupBasicData(
          {
            encryptedName,
            nameIv,
            encryptionVersion: 1,
            encryptionFields: ['name'],
          },
          password,
          encryptionSalt,
        )

      setDecryptedName(decryptedData.name)
    } catch (error) {
      console.error('Failed to decrypt group name:', error)
      setDecryptionError(true)
      setDecryptedName(groupName) // Fallback to original name
    } finally {
      setIsDecrypting(false)
    }
  }, [groupId, groupName, encryptedName, nameIv, encryptionSalt, isEncrypted])

  useEffect(() => {
    decryptGroupName()
  }, [decryptGroupName])

  // For non-encrypted groups, show the name directly
  if (!isEncrypted) {
    return <span className={className}>{groupName}</span>
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
              <Lock className="w-4 h-4 mr-1 text-primary" />
              {groupName || 'Encrypted Group'}
            </span>
          </HoverCardTrigger>
          <HoverCardContent className="w-80">
            <div className="text-sm">
              <p className="font-semibold mb-1">Encrypted Group Name</p>
              <p>
                This group name is encrypted with E2EE. Enter the correct
                password to view the actual group name.
              </p>
            </div>
          </HoverCardContent>
        </HoverCard>
      </span>
    )
  }

  // Show decrypted name or fallback
  return <span className={className}>{decryptedName || groupName}</span>
}
