'use client'

/**
 * Auth Provider for NextAuth.js (Issue #4)
 * Always wraps with SessionProvider for consistent behavior
 * The 'enabled' prop is kept for backward compatibility but SessionProvider
 * is always rendered to prevent useSession() errors on auth pages
 */

import { SessionProvider } from 'next-auth/react'
import { type ReactNode } from 'react'

interface AuthProviderProps {
  children: ReactNode
  enabled?: boolean // Kept for backward compatibility, no longer affects SessionProvider
}

export function AuthProvider({ children }: AuthProviderProps) {
  // Always wrap with SessionProvider to prevent useSession() errors
  // SessionProvider is harmless when auth is not actively used
  return <SessionProvider>{children}</SessionProvider>
}
