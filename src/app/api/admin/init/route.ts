/**
 * Initialize Admin API (Issue #4)
 * Called on first deployment to create the initial admin user
 */

import { initializeAdmin, isPrivateInstance } from '@/lib/auth'
import { NextResponse } from 'next/server'

export async function POST() {
  try {
    if (!isPrivateInstance()) {
      return NextResponse.json(
        { message: 'Private instance mode is not enabled' },
        { status: 200 },
      )
    }

    await initializeAdmin()

    return NextResponse.json({
      success: true,
      message: 'Admin initialization complete',
    })
  } catch (error) {
    console.error('Error initializing admin:', error)
    return NextResponse.json(
      { error: 'Failed to initialize admin' },
      { status: 500 },
    )
  }
}

export async function GET() {
  // Allow GET for easier testing/calling
  return POST()
}
