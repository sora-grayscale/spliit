'use client'

/**
 * Admin Dashboard Client Component (Issue #4)
 */

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Check,
  Copy,
  Key,
  RotateCcw,
  Trash2,
  UserPlus,
  Users,
} from 'lucide-react'
import { signOut } from 'next-auth/react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

interface AdminDashboardProps {
  stats: {
    groupCount: number
    adminCount: number
    whitelistCount: number
  }
  admins: Array<{
    id: string
    email: string
    name: string | null
    createdAt: string
  }>
  whitelistUsers: Array<{
    id: string
    email: string
    name: string | null
    createdAt: string
  }>
  currentUserEmail: string
}

interface UserCredentials {
  email: string
  initialPassword: string
  isReset?: boolean
}

export function AdminDashboard({
  stats,
  admins,
  whitelistUsers,
  currentUserEmail,
}: AdminDashboardProps) {
  const router = useRouter()
  const [newUserEmail, setNewUserEmail] = useState('')
  const [newUserName, setNewUserName] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [userCredentials, setUserCredentials] =
    useState<UserCredentials | null>(null)
  const [copied, setCopied] = useState(false)
  const [resettingUserId, setResettingUserId] = useState<string | null>(null)

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsAdding(true)
    setError(null)
    setUserCredentials(null)

    try {
      const response = await fetch('/api/admin/whitelist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newUserEmail, name: newUserName }),
      })

      if (!response.ok) {
        const data = (await response.json()) as { error?: string }
        throw new Error(data.error || 'Failed to add user')
      }

      const data = (await response.json()) as { initialPassword: string }

      // Show the initial password to the admin
      setUserCredentials({
        email: newUserEmail,
        initialPassword: data.initialPassword,
      })

      setNewUserEmail('')
      setNewUserName('')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add user')
    } finally {
      setIsAdding(false)
    }
  }

  const copyCredentials = () => {
    if (userCredentials) {
      const text = `Email: ${userCredentials.email}\nInitial Password: ${userCredentials.initialPassword}`
      navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleResetPassword = async (userId: string, userEmail: string) => {
    if (
      !confirm(`Are you sure you want to reset the password for ${userEmail}?`)
    )
      return

    setResettingUserId(userId)
    setUserCredentials(null)

    try {
      const response = await fetch(`/api/admin/whitelist/${userId}`, {
        method: 'PATCH',
      })

      if (!response.ok) {
        const data = (await response.json()) as { error?: string }
        throw new Error(data.error || 'Failed to reset password')
      }

      const data = (await response.json()) as { initialPassword: string }

      // Show the new password to the admin
      setUserCredentials({
        email: userEmail,
        initialPassword: data.initialPassword,
        isReset: true,
      })
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to reset password')
    } finally {
      setResettingUserId(null)
    }
  }

  const handleRemoveUser = async (userId: string) => {
    if (!confirm('Are you sure you want to remove this user?')) return

    try {
      const response = await fetch(`/api/admin/whitelist/${userId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = (await response.json()) as { error?: string }
        throw new Error(data.error || 'Failed to remove user')
      }

      router.refresh()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to remove user')
    }
  }

  return (
    <div className="container mx-auto max-w-6xl p-6">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Manage users and monitor your private instance
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/auth/change-password">
              <Key className="h-4 w-4 mr-2" />
              Change Password
            </Link>
          </Button>
          <Button
            variant="outline"
            onClick={() => signOut({ callbackUrl: '/' })}
          >
            Sign Out
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="mb-8 grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Groups
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.groupCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Admins
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.adminCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Whitelist Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.whitelistCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Add User Form */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Add User to Whitelist
          </CardTitle>
          <CardDescription>
            Add a user to allow them to create groups on this instance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddUser} className="flex flex-wrap gap-4">
            <div className="flex-1 space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="user@example.com"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
                required
              />
            </div>
            <div className="flex-1 space-y-2">
              <Label htmlFor="name">Name (optional)</Label>
              <Input
                id="name"
                type="text"
                placeholder="John Doe"
                value={newUserName}
                onChange={(e) => setNewUserName(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button type="submit" disabled={isAdding}>
                {isAdding ? 'Adding...' : 'Add User'}
              </Button>
            </div>
          </form>
          {error && <p className="mt-2 text-sm text-destructive">{error}</p>}

          {/* Show initial password after adding user */}
          {userCredentials && !userCredentials.isReset && (
            <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-semibold text-green-800 dark:text-green-400">
                    User added successfully!
                  </h4>
                  <p className="mt-1 text-sm text-green-700 dark:text-green-300">
                    Share these credentials with the user. The password will
                    only be shown once.
                  </p>
                  <div className="mt-3 space-y-1 font-mono text-sm">
                    <p>
                      <span className="text-muted-foreground">Email:</span>{' '}
                      <span className="font-semibold">
                        {userCredentials.email}
                      </span>
                    </p>
                    <p>
                      <span className="text-muted-foreground">
                        Initial Password:
                      </span>{' '}
                      <span className="font-semibold">
                        {userCredentials.initialPassword}
                      </span>
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyCredentials}
                  className="shrink-0"
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4 mr-1" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-1" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                The user will be required to change their password on first
                login.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Whitelist Users Table */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Whitelist Users
          </CardTitle>
          <CardDescription>
            Users who can create groups on this instance
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Show reset password result */}
          {userCredentials && userCredentials.isReset && (
            <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-semibold text-blue-800 dark:text-blue-400">
                    Password reset successfully!
                  </h4>
                  <p className="mt-1 text-sm text-blue-700 dark:text-blue-300">
                    Share the new password with the user. It will only be shown
                    once.
                  </p>
                  <div className="mt-3 space-y-1 font-mono text-sm">
                    <p>
                      <span className="text-muted-foreground">Email:</span>{' '}
                      <span className="font-semibold">
                        {userCredentials.email}
                      </span>
                    </p>
                    <p>
                      <span className="text-muted-foreground">
                        New Password:
                      </span>{' '}
                      <span className="font-semibold">
                        {userCredentials.initialPassword}
                      </span>
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyCredentials}
                  className="shrink-0"
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4 mr-1" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-1" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                The user will be required to change their password on next
                login.
              </p>
            </div>
          )}

          {whitelistUsers.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              No whitelist users yet. Add users above.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Added</TableHead>
                  <TableHead className="w-[120px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {whitelistUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.email}</TableCell>
                    <TableCell>{user.name || '-'}</TableCell>
                    <TableCell>
                      {new Date(user.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            handleResetPassword(user.id, user.email)
                          }
                          disabled={resettingUserId === user.id}
                          title="Reset Password"
                        >
                          <RotateCcw
                            className={`h-4 w-4 ${resettingUserId === user.id ? 'animate-spin' : ''}`}
                          />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveUser(user.id)}
                          title="Remove User"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Admins Table */}
      <Card>
        <CardHeader>
          <CardTitle>Administrators</CardTitle>
          <CardDescription>Users with admin privileges</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {admins.map((admin) => (
                <TableRow key={admin.id}>
                  <TableCell className="font-medium">
                    {admin.email}
                    {admin.email === currentUserEmail && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        (you)
                      </span>
                    )}
                  </TableCell>
                  <TableCell>{admin.name || '-'}</TableCell>
                  <TableCell>
                    {new Date(admin.createdAt).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
