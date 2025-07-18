'use client'

import { PasswordUnlockDialog } from '@/components/password-unlock-dialog'
import { useToast } from '@/components/ui/use-toast'
import { PasswordSession } from '@/lib/e2ee-crypto'
import { trpc } from '@/trpc/client'
import { useTranslations } from 'next-intl'
import { PropsWithChildren, useEffect, useState } from 'react'
import { CurrentGroupProvider } from './current-group-context'
import { GroupHeader } from './group-header'
import { SaveGroupLocally } from './save-recent-group'

export function GroupLayoutClient({
  groupId,
  children,
}: PropsWithChildren<{ groupId: string }>) {
  const { data, isLoading } = trpc.groups.get.useQuery({ groupId })
  const t = useTranslations('Groups.NotFound')
  const { toast } = useToast()
  const [showPasswordDialog, setShowPasswordDialog] = useState(false)
  const [isUnlocked, setIsUnlocked] = useState(false)

  useEffect(() => {
    if (data && !data.group) {
      toast({
        description: t('text'),
        variant: 'destructive',
      })
    }

    // Check if group is encrypted and password is needed
    if (data?.group?.isEncrypted && !isUnlocked) {
      const hasPassword = PasswordSession.hasPassword(groupId)
      if (!hasPassword) {
        setShowPasswordDialog(true)
      } else {
        setIsUnlocked(true)
      }
    }
  }, [data, groupId, isUnlocked])

  const props =
    isLoading || !data?.group
      ? { isLoading: true as const, groupId, group: undefined }
      : { isLoading: false as const, groupId, group: data.group }

  if (isLoading) {
    return (
      <CurrentGroupProvider {...props}>
        <GroupHeader />
        {children}
      </CurrentGroupProvider>
    )
  }

  return (
    <CurrentGroupProvider {...props}>
      <GroupHeader />
      {isUnlocked || !data?.group?.isEncrypted ? children : null}
      <SaveGroupLocally />

      {data?.group?.isEncrypted && (
        <PasswordUnlockDialog
          isOpen={showPasswordDialog}
          onClose={() => setShowPasswordDialog(false)}
          onUnlock={() => {
            setIsUnlocked(true)
            setShowPasswordDialog(false)
          }}
          groupName={data.group.name}
          groupId={groupId}
          encryptionSalt={data.group.encryptionSalt || ''}
          testEncryptedData={data.group.testEncryptedData || undefined}
          testIv={data.group.testIv || undefined}
        />
      )}
    </CurrentGroupProvider>
  )
}
