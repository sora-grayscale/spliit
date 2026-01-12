'use client'

/**
 * Password Change Guard Component (Issue #4)
 * Redirects users to password change page if mustChangePassword is true
 */

import { useSession } from 'next-auth/react'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect } from 'react'

interface PasswordChangeGuardProps {
  children: React.ReactNode
  enabled?: boolean
}

// Routes that don't require password change check
const excludedRoutes = ['/auth/signin', '/auth/error', '/auth/change-password']

export function PasswordChangeGuard({
  children,
  enabled = false,
}: PasswordChangeGuardProps) {
  // Don't render the guard content if private instance mode is not enabled
  if (!enabled) {
    return <>{children}</>
  }

  return <PasswordChangeGuardContent>{children}</PasswordChangeGuardContent>
}

function PasswordChangeGuardContent({
  children,
}: {
  children: React.ReactNode
}) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (status !== 'authenticated') return
    if (excludedRoutes.some((route) => pathname.startsWith(route))) return

    if (session?.user?.mustChangePassword) {
      router.push('/auth/change-password')
    }
  }, [session, status, pathname, router])

  return <>{children}</>
}
