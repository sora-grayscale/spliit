'use client'

import { GroupForm } from '@/components/group-form'
import { generateMasterKey, keyToBase64 } from '@/lib/crypto'
import { encryptGroupFormValues } from '@/lib/encrypt-helpers'
import { GroupFormValues } from '@/lib/schemas'
import { trpc } from '@/trpc/client'
import { useRouter } from 'next/navigation'

export const CreateGroup = () => {
  const { mutateAsync } = trpc.groups.create.useMutation()
  const utils = trpc.useUtils()
  const router = useRouter()

  return (
    <GroupForm
      onSubmit={async (groupFormValues) => {
        // Generate encryption key for the new group
        const encryptionKey = generateMasterKey()
        const keyBase64 = keyToBase64(encryptionKey)

        // Encrypt group data before sending to server
        const encryptedValues = await encryptGroupFormValues(
          groupFormValues,
          encryptionKey
        )

        // Send encrypted data to server
        const { groupId } = await mutateAsync({
          groupFormValues: encryptedValues as GroupFormValues,
        })
        await utils.groups.invalidate()

        // Redirect with encryption key in URL fragment
        router.push(`/groups/${groupId}#${keyBase64}`)
      }}
    />
  )
}
