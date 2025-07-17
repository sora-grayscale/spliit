'use client'

import { GroupForm } from '@/components/group-form'
import { trpc } from '@/trpc/client'
import { useRouter } from 'next/navigation'
import { PasswordCrypto } from '@/lib/e2ee-crypto'
import { GroupFormValues } from '@/lib/schemas'

export const CreateGroup = () => {
  const { mutateAsync } = trpc.groups.create.useMutation()
  const utils = trpc.useUtils()
  const router = useRouter()

  return (
    <GroupForm
      onSubmit={async (groupFormValues) => {
        let processedGroupFormValues: GroupFormValues = { ...groupFormValues }
        
        // If encryption is enabled, generate salt and create test data
        if (groupFormValues.isEncrypted && groupFormValues.password) {
          const salt = PasswordCrypto.generateSalt()
          const testData = PasswordCrypto.createTestData()
          
          // Encrypt test data to verify password later
          const { encryptedData: testEncryptedData, iv: testIv } = 
            await PasswordCrypto.encryptData(testData, 
              await PasswordCrypto.deriveKeyFromPassword(groupFormValues.password, salt)
            )
          
          processedGroupFormValues = {
            ...groupFormValues,
            encryptionSalt: salt,
            testEncryptedData,
            testIv,
            // Remove password from server request for security
            password: undefined
          }
        }
        
        const { groupId } = await mutateAsync({ groupFormValues: processedGroupFormValues })
        await utils.groups.invalidate()
        router.push(`/groups/${groupId}`)
      }}
    />
  )
}
