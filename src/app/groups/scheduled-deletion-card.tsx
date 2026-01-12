'use client'

import {
  RecentGroup,
  deleteRecentGroup,
} from '@/app/groups/recent-groups-helpers'
import { Button } from '@/components/ui/button'
import { trpc } from '@/trpc/client'
import { Loader2, RotateCcw, Trash2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { useState } from 'react'

const GRACE_PERIOD_DAYS = 7

interface ScheduledDeletionCardProps {
  group: RecentGroup
  deletedAt: string
  refreshGroupsFromStorage: () => void
}

export function ScheduledDeletionCard({
  group,
  deletedAt,
  refreshGroupsFromStorage,
}: ScheduledDeletionCardProps) {
  const t = useTranslations('Groups.ScheduledDeletion')
  const utils = trpc.useUtils()
  const [isRestoring, setIsRestoring] = useState(false)
  const [isPermanentlyDeleting, setIsPermanentlyDeleting] = useState(false)

  const { mutateAsync: restoreGroup } = trpc.groups.restore.useMutation()
  const { mutateAsync: permanentDelete } =
    trpc.groups.permanentDelete.useMutation()

  // Calculate days remaining
  const deletedDate = new Date(deletedAt)
  const expirationDate = new Date(deletedDate)
  expirationDate.setDate(expirationDate.getDate() + GRACE_PERIOD_DAYS)

  const now = new Date()
  const daysRemaining = Math.max(
    0,
    Math.ceil(
      (expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    ),
  )

  const handleRestore = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsRestoring(true)
    try {
      await restoreGroup({ groupId: group.id })
      await utils.groups.invalidate()
      refreshGroupsFromStorage()
    } catch (error) {
      console.error('Failed to restore group:', error)
      setIsRestoring(false)
    }
  }

  const handlePermanentDelete = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsPermanentlyDeleting(true)
    try {
      await permanentDelete({ groupId: group.id })
      deleteRecentGroup(group)
      await utils.groups.invalidate()
      refreshGroupsFromStorage()
    } catch (error) {
      console.error('Failed to permanently delete group:', error)
      setIsPermanentlyDeleting(false)
    }
  }

  return (
    <li>
      <div className="h-fit w-full py-3 px-4 rounded-lg border border-destructive/30 bg-destructive/5 shadow-sm">
        <div className="w-full flex flex-col gap-2">
          <div className="flex gap-2 justify-between items-start">
            <Link
              href={`/groups/${group.id}`}
              className="flex-1 overflow-hidden text-ellipsis font-medium"
            >
              {group.name}
            </Link>
            <span className="text-xs text-destructive font-medium">
              {t('daysRemaining', { count: daysRemaining })}
            </span>
          </div>

          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="flex-1"
              onClick={handleRestore}
              disabled={isRestoring || isPermanentlyDeleting}
            >
              {isRestoring ? (
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
              ) : (
                <RotateCcw className="w-3 h-3 mr-1" />
              )}
              {t('restore')}
            </Button>
            <Button
              size="sm"
              variant="destructive"
              className="flex-1"
              onClick={handlePermanentDelete}
              disabled={isRestoring || isPermanentlyDeleting}
            >
              {isPermanentlyDeleting ? (
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
              ) : (
                <Trash2 className="w-3 h-3 mr-1" />
              )}
              {t('deleteNow')}
            </Button>
          </div>
        </div>
      </div>
    </li>
  )
}
