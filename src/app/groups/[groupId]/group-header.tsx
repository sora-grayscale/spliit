'use client'

import { GroupTabs } from '@/app/groups/[groupId]/group-tabs'
import { ShareButton } from '@/app/groups/[groupId]/share-button'
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card'
import { Skeleton } from '@/components/ui/skeleton'
import { Lock } from 'lucide-react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { useCurrentGroup } from './current-group-context'

export const GroupHeader = () => {
  const { isLoading, groupId, group } = useCurrentGroup()
  const tE2EE = useTranslations('E2EE')

  return (
    <div className="flex flex-col justify-between gap-3">
      <h1 className="font-bold text-2xl">
        <Link href={`/groups/${groupId}`}>
          {isLoading ? (
            <Skeleton className="mt-1.5 mb-1.5 h-5 w-32" />
          ) : (
            <div className="flex items-center gap-2">
              {group.isEncrypted && (
                <HoverCard>
                  <HoverCardTrigger asChild>
                    <Lock className="w-5 h-5 text-primary cursor-help" />
                  </HoverCardTrigger>
                  <HoverCardContent className="w-80">
                    <div className="text-sm">
                      <p className="font-semibold mb-1">
                        {tE2EE('groupTooltipTitle')}
                      </p>
                      <p>{tE2EE('groupTooltipDescription')}</p>
                    </div>
                  </HoverCardContent>
                </HoverCard>
              )}
              {group.name}
            </div>
          )}
        </Link>
      </h1>

      <div className="flex gap-2 justify-between">
        <GroupTabs groupId={groupId} />
        {group && <ShareButton group={group} />}
      </div>
    </div>
  )
}
