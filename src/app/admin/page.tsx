/**
 * Admin Dashboard (Issue #4)
 */

import { auth, isPrivateInstance } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { AdminDashboard } from './admin-dashboard'

export default async function AdminPage() {
  // Check if private instance mode is enabled
  if (!isPrivateInstance()) {
    redirect('/')
  }

  // Check authentication
  const session = await auth()
  if (!session?.user) {
    redirect('/auth/signin?callbackUrl=/admin')
  }

  // Check if user is admin
  if (!session.user.isAdmin) {
    redirect('/')
  }

  // Get stats
  const [groupCount, adminCount, whitelistCount] = await Promise.all([
    prisma.group.count({ where: { deletedAt: null } }),
    prisma.admin.count(),
    prisma.whitelistUser.count(),
  ])

  // Get recent admins (only select necessary fields for security)
  const admins = await prisma.admin.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
  })

  // Get whitelist users (only select necessary fields for security)
  const whitelistUsers = await prisma.whitelistUser.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
  })

  return (
    <AdminDashboard
      stats={{
        groupCount,
        adminCount,
        whitelistCount,
      }}
      admins={admins.map((a) => ({
        ...a,
        createdAt: a.createdAt.toISOString(),
      }))}
      whitelistUsers={whitelistUsers.map((u) => ({
        ...u,
        createdAt: u.createdAt.toISOString(),
      }))}
      currentUserEmail={session.user.email}
    />
  )
}
