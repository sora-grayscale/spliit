'use client'

import { GroupForm } from '@/components/group-form'
import { trpc } from '@/trpc/client'
import { useCurrentGroup } from '../current-group-context'
import { useRouter } from 'next/navigation'
import { deleteRecentGroup, unstarGroup, unarchiveGroup } from '@/app/groups/recent-groups-helpers'

export const EditGroup = () => {
  const { groupId } = useCurrentGroup()
  const { data, isLoading } = trpc.groups.getDetails.useQuery({ groupId })
  const { mutateAsync } = trpc.groups.update.useMutation()
  const { mutateAsync: deleteGroup } = trpc.groups.delete.useMutation()
  const utils = trpc.useUtils()
  const router = useRouter()

  if (isLoading) return <></>

  return (
    <GroupForm
      group={data?.group}
      onSubmit={async (groupFormValues, participantId) => {
        await mutateAsync({ groupId, participantId, groupFormValues })
        await utils.groups.invalidate()
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
