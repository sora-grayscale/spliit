/**
 * Initialize Admin API (Issue #4)
 * Called on first deployment to create the initial admin user
 *
 * Security: This endpoint is safe because initializeAdmin() only creates
 * an admin if one doesn't already exist. Repeated calls are no-ops.
 * GET method removed for security best practices (state-changing operation).
 */

import { initializeAdmin, isPrivateInstance } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function POST() {
  try {
    if (!isPrivateInstance()) {
      return NextResponse.json(
        { message: 'Private instance mode is not enabled' },
        { status: 200 },
      )
    }

    // Check if admin already exists before attempting initialization
    const adminEmail = process.env.ADMIN_EMAIL
    if (adminEmail) {
      const existingAdmin = await prisma.admin.findUnique({
        where: { email: adminEmail },
      })
      if (existingAdmin) {
        return NextResponse.json({
          success: true,
          message: 'Admin already exists',
          alreadyExists: true,
        })
      }
    }

    await initializeAdmin()

    return NextResponse.json({
      success: true,
      message: 'Admin initialization complete',
      alreadyExists: false,
    })
  } catch (error) {
    console.error('Error initializing admin:', error)
    return NextResponse.json(
      { error: 'Failed to initialize admin' },
      { status: 500 },
    )
  }
}

// GET method removed for security - state-changing operations should use POST only
