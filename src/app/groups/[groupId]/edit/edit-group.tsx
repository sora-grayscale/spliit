'use client'

import {
  deleteRecentGroup,
  unarchiveGroup,
  unstarGroup,
} from '@/app/groups/recent-groups-helpers'
import { GroupForm } from '@/components/group-form'
import { useToast } from '@/components/ui/use-toast'
import {
  detectGroupChanges,
  formatChangeMessage,
} from '@/lib/group-change-detector'
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

        // Detect changes using optimized utility function
        const changeDetection = detectGroupChanges(data?.group, {
          ...groupFormValues,
          information: groupFormValues.information || '',
        })
        const changesText = formatChangeMessage(changeDetection.changes)

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
