'use client'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Lock, ExternalLink } from 'lucide-react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'

interface EncryptionRequiredProps {
  groupId: string
}

export function EncryptionRequired({ groupId }: EncryptionRequiredProps) {
  const t = useTranslations('Encryption')

  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <Card className="max-w-md mx-4">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900 flex items-center justify-center">
            <Lock className="w-6 h-6 text-amber-600 dark:text-amber-400" />
          </div>
          <CardTitle>{t('required.title')}</CardTitle>
          <CardDescription className="text-base">
            {t('required.description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground text-center">
            {t('required.help')}
          </p>
          <div className="flex flex-col gap-2">
            <Button asChild variant="outline">
              <Link href="/groups">
                {t('required.backToGroups')}
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
