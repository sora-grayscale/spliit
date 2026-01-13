'use client'

/**
 * Auth Provider for NextAuth.js (Issue #4)
 * Only wraps with SessionProvider when Private Instance Mode is enabled
 * This avoids requiring NEXTAUTH_SECRET when auth is not used
 */

import { SessionProvider } from 'next-auth/react'
import { type ReactNode } from 'react'

interface AuthProviderProps {
  children: ReactNode
  enabled?: boolean // When true, wraps children with SessionProvider
}

export function AuthProvider({ children, enabled = false }: AuthProviderProps) {
  // Only use SessionProvider when Private Instance Mode is enabled
  // This avoids requiring NEXTAUTH_SECRET/NEXTAUTH_URL for public instances
  if (!enabled) {
    return <>{children}</>
  }
  return <SessionProvider>{children}</SessionProvider>
}
