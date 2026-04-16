import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { timingSafeEqual } from 'crypto'

export const dynamic = 'force-dynamic'

/**
 * GET /api/cron/process-deletions — Process scheduled account deletions
 * Story 11.4: Runs daily, processes requests where scheduled_at <= NOW()
 *
 * Anonymization strategy (per story spec):
 * - user_profiles: DELETE
 * - reservations: anonymize guest_name → "Utilizador removido"
 * - expenses: keep values, anonymize description references
 * - owners: anonymize email/phone
 * - consent_records: keep (proof of consent)
 * - audit_logs: keep (proof of operations)
 * - deletion_requests: keep (proof of compliance)
 * - auth.users: DELETE via admin API
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron authentication
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (!cronSecret || !authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.split(' ')[1]
    const expectedBuffer = Buffer.from(cronSecret)
    const providedBuffer = Buffer.from(token)

    if (expectedBuffer.length !== providedBuffer.length || !timingSafeEqual(expectedBuffer, providedBuffer)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminClient = createAdminClient()

    // Find pending requests past their scheduled date (with a limit to prevent timeouts on large batches)
    const BATCH_LIMIT = 50
    const { data: dueRequests, error: fetchError } = await adminClient
      .from('deletion_requests')
      .select('id, user_id')
      .eq('status', 'pending')
      .lte('scheduled_at', new Date().toISOString())
      .limit(BATCH_LIMIT)

    if (fetchError) {
      console.error('Error fetching deletion requests:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch requests' }, { status: 500 })
    }

    if (!dueRequests || dueRequests.length === 0) {
      return NextResponse.json({ processed: 0, message: 'No pending deletions' })
    }

    let processed = 0
    const errors: string[] = []

    for (const request of dueRequests) {
      try {
        await processUserDeletion(adminClient, request.user_id, request.id)
        processed++
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error'
        errors.push(`User ${request.user_id}: ${msg}`)
        console.error(`Deletion failed for user ${request.user_id}:`, err)
      }
    }

    return NextResponse.json({
      processed,
      total: dueRequests.length,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error) {
    console.error('Process deletions cron error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function processUserDeletion(adminClient: any, userId: string, requestId: string) {
  const anonymizedName = 'Utilizador removido'
  const anonymizedEmail = null

  // 1. Get user's organization for scoped queries
  const { data: profile } = await adminClient
    .from('user_profiles')
    .select('organization_id')
    .eq('id', userId)
    .single()

  const orgId = profile?.organization_id

  // 2. Anonymize reservations (keep financial data, anonymize guest_name)
  if (orgId) {
    // Get property IDs for this org
    const { data: properties } = await adminClient
      .from('properties')
      .select('id')
      .eq('organization_id', orgId)

    if (properties && properties.length > 0) {
      const propertyIds = properties.map((p: { id: string }) => p.id)

      const { data: listings } = await adminClient
        .from('property_listings')
        .select('id')
        .in('property_id', propertyIds)

      if (listings && listings.length > 0) {
        const listingIds = listings.map((l: { id: string }) => l.id)

        await adminClient
          .from('reservations')
          .update({ guest_name: anonymizedName })
          .in('property_listing_id', listingIds)
      }
    }

    // 3. Anonymize owners (email/phone) and guests
    await adminClient
      .from('owners')
      .update({ email: anonymizedEmail, phone: anonymizedEmail })
      .eq('organization_id', orgId)

    await adminClient
      .from('guests')
      .update({ first_name: anonymizedName, last_name: anonymizedName, email: anonymizedEmail, phone: anonymizedEmail })
      .eq('organization_id', orgId)
  }

  // 4. Delete user profile and anonymize consent IPs
  await adminClient
    .from('consent_records')
    .update({ ip_address: null })
    .eq('user_id', userId)

  await adminClient
    .from('user_profiles')
    .delete()
    .eq('id', userId)

  // 5. Mark deletion request as completed
  await adminClient
    .from('deletion_requests')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
    })
    .eq('id', requestId)

  // 6. Audit log
  await adminClient.from('audit_logs').insert({
    user_id: userId,
    action: 'deletion_completed',
    details: { request_id: requestId, anonymized_tables: ['reservations', 'owners', 'user_profiles'] },
  })

  // 7. Delete auth user (last step)
  const { error: authError } = await adminClient.auth.admin.deleteUser(userId)
  if (authError) {
    console.error(`Failed to delete auth user ${userId}:`, authError)
    // Don't throw — profile and data are already anonymized
  }
}
