'use client'

import {
  deleteRecentGroup,
  unarchiveGroup,
  unstarGroup,
} from '@/app/groups/recent-groups-helpers'
import { GroupForm } from '@/components/group-form'
import { useToast } from '@/components/ui/use-toast'
import { trpc } from '@/trpc/client'
import { useRouter } from 'next/navigation'
import { useCurrentGroup } from '../current-group-context'

export const EditGroup = () => {
  const { groupId } = useCurrentGroup()
  const { data, isLoading } = trpc.groups.getDetails.useQuery({ groupId })
  const { mutateAsync } = trpc.groups.update.useMutation()
  const { mutateAsync: deleteGroup } = trpc.groups.delete.useMutation()
  const utils = trpc.useUtils()
  const router = useRouter()
  const { toast } = useToast()

  if (isLoading) return <></>

  return (
    <GroupForm
      group={data?.group}
      onSubmit={async (groupFormValues, participantId) => {
        await mutateAsync({ groupId, participantId, groupFormValues })
        await utils.groups.invalidate()

        // Show success notification with saved changes (excluding password fields)
        const savedChanges = []
        if (groupFormValues.name !== data?.group?.name) {
          savedChanges.push(`Group name: "${groupFormValues.name}"`)
        }
        if (groupFormValues.currency !== data?.group?.currency) {
          savedChanges.push(`Currency: ${groupFormValues.currency}`)
        }
        if (groupFormValues.information !== data?.group?.information) {
          savedChanges.push('Description')
        }

        // Check for participant changes (count and names)
        const originalParticipants = data?.group?.participants || []
        const newParticipants = groupFormValues.participants || []

        if (newParticipants.length !== originalParticipants.length) {
          savedChanges.push(`Participants (${newParticipants.length} members)`)
        } else {
          // Check for name changes if count is the same
          const participantNamesChanged = newParticipants.some(
            (newP, index) => {
              const originalP = originalParticipants[index]
              return newP.name !== originalP?.name
            },
          )

          if (participantNamesChanged) {
            savedChanges.push('Participant names')
          }
        }

        const changesText =
          savedChanges.length > 0
            ? `Changes: ${savedChanges.join(', ')}`
            : 'Group settings saved successfully'

        toast({
          title: 'Group settings saved successfully',
          description: changesText,
          duration: 4000,
        })
      }}
      onDelete={async (groupId) => {
        await deleteGroup({ groupId })
        // Remove from localStorage
        if (data?.group) {
          deleteRecentGroup({ id: data.group.id, name: data.group.name })
          unstarGroup(groupId)
          unarchiveGroup(groupId)
        }
        router.push('/groups')
      }}
      protectedParticipantIds={data?.participantsWithExpenses}
    />
  )
}
