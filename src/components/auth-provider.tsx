'use client'

/**
 * Auth Provider for NextAuth.js (Issue #4)
 * Only renders SessionProvider when PRIVATE_INSTANCE is enabled
 */

import { SessionProvider } from 'next-auth/react'
import { type ReactNode } from 'react'

interface AuthProviderProps {
  children: ReactNode
  enabled?: boolean
}

export function AuthProvider({ children, enabled = false }: AuthProviderProps) {
  // Only wrap with SessionProvider if private instance mode is enabled
  if (!enabled) {
    return <>{children}</>
  }

  return <SessionProvider>{children}</SessionProvider>
}
