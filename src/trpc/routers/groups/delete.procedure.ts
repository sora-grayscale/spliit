import { deleteGroup } from '@/lib/api'
import { baseProcedure } from '@/trpc/init'
import { z } from 'zod'

export const deleteGroupProcedure = baseProcedure
  .input(z.object({ groupId: z.string() }))
  .mutation(async ({ input: { groupId } }) => {
    await deleteGroup(groupId)
    return { success: true }
  })