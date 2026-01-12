import { permanentlyDeleteGroup } from '@/lib/api'
import { baseProcedure } from '@/trpc/init'
import { z } from 'zod'

export const permanentDeleteGroupProcedure = baseProcedure
  .input(
    z.object({
      groupId: z.string().min(1),
    }),
  )
  .mutation(async ({ input: { groupId } }) => {
    await permanentlyDeleteGroup(groupId)
  })
