import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth/requireRole'
import { createAdminClient } from '@/lib/supabase/admin'
import { writeAuditLog } from '@/lib/audit'

interface OrphanedUser {
  id: string
  email: string
}

/**
 * POST /api/admin/cleanup-orphaned-users
 *
 * Finds and removes orphaned users (exist in auth.users but not in user_profiles)
 *
 * Query params:
 * - action: "list" (default) or "delete"
 *
 * Response:
 * - action=list: { orphaned_count: number, orphaned_users: OrphanedUser[] }
 * - action=delete: { deleted_count: number, deleted_users: OrphanedUser[] }
 */
export async function POST(request: NextRequest) {
  const auth = await requireRole(['admin'])
  if (!auth.authorized) return auth.response!

  const { searchParams } = request.nextUrl
  const action = searchParams.get('action') || 'list'

  if (!['list', 'delete'].includes(action)) {
    return NextResponse.json(
      { error: 'Invalid action. Must be "list" or "delete"' },
      { status: 400 }
    )
  }

  const adminClient = createAdminClient()

  try {
    // Get all users from auth.users (using Admin API)
    const { data: authUsers, error: authError } = await adminClient.auth.admin.listUsers()

    if (authError) {
      return NextResponse.json(
        { error: `Failed to fetch auth users: ${authError.message}` },
        { status: 500 }
      )
    }

    // Get all users from user_profiles
    const { data: profileUsers, error: profileError } = await adminClient
      .from('user_profiles')
      .select('id')

    if (profileError) {
      return NextResponse.json(
        { error: `Failed to fetch user profiles: ${profileError.message}` },
        { status: 500 }
      )
    }

    // Find orphaned users (in auth.users but not in user_profiles)
    const profileIds = new Set((profileUsers || []).map(u => u.id))
    const orphanedUsers: OrphanedUser[] = (authUsers?.users || [])
      .filter(u => !profileIds.has(u.id))
      .map(u => ({
        id: u.id,
        email: u.email || 'unknown',
      }))

    // If list action, return the orphaned users
    if (action === 'list') {
      return NextResponse.json({
        orphaned_count: orphanedUsers.length,
        orphaned_users: orphanedUsers,
        message: `Found ${orphanedUsers.length} orphaned user(s). Use action=delete to remove them.`,
      })
    }

    // Delete action: remove orphaned users from auth
    if (orphanedUsers.length === 0) {
      return NextResponse.json({
        deleted_count: 0,
        deleted_users: [],
        message: 'No orphaned users found.',
      })
    }

    const deletedUsers: OrphanedUser[] = []
    const errors: { id: string; email: string; error: string }[] = []

    for (const user of orphanedUsers) {
      try {
        const { error: deleteError } = await adminClient.auth.admin.deleteUser(user.id)

        if (deleteError) {
          errors.push({
            id: user.id,
            email: user.email,
            error: deleteError.message,
          })
        } else {
          deletedUsers.push(user)
        }
      } catch (err) {
        errors.push({
          id: user.id,
          email: user.email,
          error: err instanceof Error ? err.message : 'Unknown error',
        })
      }
    }

    // Log the cleanup operation
    await writeAuditLog({
      userId: auth.userId!,
      action: 'delete',
      resourceType: 'user',
      resourceId: 'orphaned-batch',
      details: {
        deleted_count: deletedUsers.length,
        deleted_users: deletedUsers.map(u => u.email),
        error_count: errors.length,
        errors: errors,
      },
    })

    return NextResponse.json({
      deleted_count: deletedUsers.length,
      deleted_users: deletedUsers,
      errors: errors.length > 0 ? errors : undefined,
      message: `Deleted ${deletedUsers.length} orphaned user(s)${errors.length > 0 ? `, ${errors.length} error(s)` : ''}.`,
    })
  } catch (err) {
    console.error('Error cleaning up orphaned users:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
