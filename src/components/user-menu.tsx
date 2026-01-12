'use client'

/**
 * User Menu Component for Private Instance Mode (Issue #4)
 */

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Key, LogIn, LogOut, Settings, User } from 'lucide-react'
import { signOut, useSession } from 'next-auth/react'
import Link from 'next/link'

interface UserMenuProps {
  enabled?: boolean
}

export function UserMenu({ enabled = false }: UserMenuProps) {
  // Don't render if private instance mode is not enabled
  if (!enabled) {
    return null
  }

  return <UserMenuContent />
}

function UserMenuContent() {
  const { data: session, status } = useSession()

  // Show loading state
  if (status === 'loading') {
    return (
      <Button variant="ghost" size="icon" disabled>
        <User className="h-5 w-5 animate-pulse" />
      </Button>
    )
  }

  // Not authenticated - show sign in button
  if (!session?.user) {
    return (
      <Button variant="ghost" size="sm" asChild>
        <Link href="/auth/signin" className="flex items-center gap-1">
          <LogIn className="h-4 w-4" />
          <span className="hidden sm:inline">Sign In</span>
        </Link>
      </Button>
    )
  }

  // Authenticated - show user menu
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <User className="h-5 w-5" />
          <span className="sr-only">User menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="px-2 py-1.5">
          <p className="text-sm font-medium">{session.user.name || 'User'}</p>
          <p className="text-xs text-muted-foreground">{session.user.email}</p>
        </div>
        <DropdownMenuSeparator />
        {session.user.isAdmin && (
          <DropdownMenuItem asChild>
            <Link href="/admin" className="flex items-center">
              <Settings className="mr-2 h-4 w-4" />
              Admin Dashboard
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem asChild>
          <Link href="/auth/change-password" className="flex items-center">
            <Key className="mr-2 h-4 w-4" />
            Change Password
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => signOut({ callbackUrl: '/' })}
          className="text-destructive focus:text-destructive"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
