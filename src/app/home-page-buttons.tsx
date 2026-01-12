'use client'

/**
 * Home Page Buttons for Private Instance Mode (Issue #4)
 * Shows signin button when not authenticated, groups button when authenticated
 */

import { Button } from '@/components/ui/button'
import { Github, LogIn } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'

export function HomePageButtons() {
  const { data: session, status } = useSession()
  const t = useTranslations()

  if (status === 'loading') {
    return (
      <div className="flex gap-2">
        <Button disabled>
          <span className="animate-pulse">Loading...</span>
        </Button>
      </div>
    )
  }

  if (session?.user) {
    // Authenticated - show groups button
    return (
      <div className="flex gap-2">
        <Button asChild>
          <Link href="/groups">{t('Homepage.button.groups')}</Link>
        </Button>
        <Button asChild variant="secondary">
          <Link href="https://github.com/sora-grayscale/spliit">
            <Github className="w-4 h-4 mr-2" />
            {t('Homepage.button.github')}
          </Link>
        </Button>
      </div>
    )
  }

  // Not authenticated - show signin button
  return (
    <div className="flex gap-2">
      <Button asChild>
        <Link href="/auth/signin">
          <LogIn className="w-4 h-4 mr-2" />
          Sign In
        </Link>
      </Button>
      <Button asChild variant="secondary">
        <Link href="https://github.com/sora-grayscale/spliit">
          <Github className="w-4 h-4 mr-2" />
          {t('Homepage.button.github')}
        </Link>
      </Button>
    </div>
  )
}
