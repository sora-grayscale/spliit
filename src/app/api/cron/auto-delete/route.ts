import {
  autoDeleteInactiveGroups,
  cleanupExpiredGroups,
} from '@/lib/auto-delete'
import { env } from '@/lib/env'
import { NextRequest, NextResponse } from 'next/server'

/**
 * Cron endpoint for auto-deleting inactive groups
 * - Soft-deletes groups inactive for AUTO_DELETE_INACTIVE_DAYS
 * - Permanently deletes groups past DELETE_GRACE_PERIOD_DAYS grace period
 *
 * Authentication: Requires CRON_SECRET in Authorization header
 * Usage: curl -X POST -H "Authorization: Bearer $CRON_SECRET" /api/cron/auto-delete
 */
export async function POST(request: NextRequest) {
  // Verify CRON_SECRET if configured
  if (env.CRON_SECRET) {
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')

    if (token !== env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  try {
    const results = {
      autoDelete: { softDeleted: 0, groupIds: [] as string[] },
      cleanup: { permanentlyDeleted: 0, groupIds: [] as string[] },
      timestamp: new Date().toISOString(),
    }

    // Step 1: Soft-delete inactive groups (if enabled)
    if (env.AUTO_DELETE_INACTIVE_DAYS > 0) {
      results.autoDelete = await autoDeleteInactiveGroups(
        env.AUTO_DELETE_INACTIVE_DAYS,
      )
    }

    // Step 2: Permanently delete groups past grace period
    results.cleanup = await cleanupExpiredGroups(env.DELETE_GRACE_PERIOD_DAYS)

    return NextResponse.json({
      success: true,
      results,
    })
  } catch (error) {
    console.error('Auto-delete cron error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}

// Also allow GET for Vercel Cron compatibility
export async function GET(request: NextRequest) {
  return POST(request)
}
