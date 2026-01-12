/**
 * NextAuth.js configuration for Private Instance Mode (Issue #4)
 */

import { prisma } from '@/lib/prisma'
import { PrismaAdapter } from '@auth/prisma-adapter'
import bcrypt from 'bcryptjs'
import NextAuth, { type NextAuthConfig } from 'next-auth'
import Credentials from 'next-auth/providers/credentials'

// Extend the session type to include our custom properties
declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      name?: string | null
      isAdmin: boolean
      mustChangePassword: boolean
    }
  }
  interface User {
    isAdmin: boolean
    mustChangePassword: boolean
  }
}

const authConfig: NextAuthConfig = {
  adapter: PrismaAdapter(prisma) as NextAuthConfig['adapter'],
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const email = credentials.email as string
        const password = credentials.password as string

        // Check if user is an admin
        const admin = await prisma.admin.findUnique({
          where: { email },
        })

        if (admin) {
          const isValidPassword = await bcrypt.compare(password, admin.password)
          if (isValidPassword) {
            return {
              id: admin.id,
              email: admin.email,
              name: admin.name,
              isAdmin: true,
              mustChangePassword: admin.mustChangePassword,
            }
          }
        }

        // Check if user is in whitelist
        const whitelistUser = await prisma.whitelistUser.findUnique({
          where: { email },
        })

        if (whitelistUser && whitelistUser.password) {
          const isValidPassword = await bcrypt.compare(
            password,
            whitelistUser.password,
          )
          if (isValidPassword) {
            return {
              id: whitelistUser.id,
              email: whitelistUser.email,
              name: whitelistUser.name,
              isAdmin: false,
              mustChangePassword: whitelistUser.mustChangePassword,
            }
          }
        }

        return null
      },
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async jwt({ token, user, trigger, session: updateData }) {
      if (user) {
        ;(token as Record<string, unknown>).isAdmin = user.isAdmin
        ;(token as Record<string, unknown>).mustChangePassword =
          user.mustChangePassword
      }
      // Handle session update - always refresh from database for security
      // Never trust client-sent values for security-critical flags
      if (trigger === 'update' && token.sub) {
        const admin = await prisma.admin.findUnique({
          where: { id: token.sub },
          select: { mustChangePassword: true },
        })
        if (admin) {
          ;(token as Record<string, unknown>).mustChangePassword =
            admin.mustChangePassword
        } else {
          const whitelistUser = await prisma.whitelistUser.findUnique({
            where: { id: token.sub },
            select: { mustChangePassword: true },
          })
          if (whitelistUser) {
            ;(token as Record<string, unknown>).mustChangePassword =
              whitelistUser.mustChangePassword
          }
        }
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub as string
        session.user.isAdmin =
          ((token as Record<string, unknown>).isAdmin as boolean) ?? false
        session.user.mustChangePassword =
          ((token as Record<string, unknown>).mustChangePassword as boolean) ??
          false
      }
      return session
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
}

export const { handlers, signIn, signOut, auth } = NextAuth(authConfig)

/**
 * Check if private instance mode is enabled
 */
export function isPrivateInstance(): boolean {
  return process.env.PRIVATE_INSTANCE === 'true'
}

/**
 * Initialize admin user from environment variables
 * Call this on server startup if PRIVATE_INSTANCE is enabled
 */
export async function initializeAdmin(): Promise<void> {
  if (!isPrivateInstance()) {
    return
  }

  const adminEmail = process.env.ADMIN_EMAIL
  const adminPassword = process.env.ADMIN_PASSWORD

  if (!adminEmail || !adminPassword) {
    console.warn(
      'PRIVATE_INSTANCE is enabled but ADMIN_EMAIL or ADMIN_PASSWORD is not set',
    )
    return
  }

  // Check if admin already exists
  const existingAdmin = await prisma.admin.findUnique({
    where: { email: adminEmail },
  })

  if (existingAdmin) {
    return // Admin already exists
  }

  // Create initial admin with mustChangePassword flag
  const hashedPassword = await bcrypt.hash(adminPassword, 12)
  await prisma.admin.create({
    data: {
      email: adminEmail,
      password: hashedPassword,
      name: 'Admin',
      mustChangePassword: true,
    },
  })

  console.log(`Initial admin created: ${adminEmail}`)
}

/**
 * Check if a user is authorized to access the application
 */
export async function isAuthorizedUser(email: string): Promise<boolean> {
  if (!isPrivateInstance()) {
    return true // Public instance - everyone is authorized
  }

  // Check if admin
  const admin = await prisma.admin.findUnique({
    where: { email },
  })
  if (admin) return true

  // Check if in whitelist
  const whitelistUser = await prisma.whitelistUser.findUnique({
    where: { email },
  })
  if (whitelistUser) return true

  return false
}

/**
 * Check if a user is an admin
 */
export async function isAdminUser(email: string): Promise<boolean> {
  const admin = await prisma.admin.findUnique({
    where: { email },
  })
  return !!admin
}
