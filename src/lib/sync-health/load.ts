import type { createAdminClient } from '@/lib/supabase/admin'
import { buildSyncHealth, PLACEHOLDER_GUEST, UNLINKED_EVENT_HOURS, type SyncHealth } from './actions'

type AdminClient = Awaited<ReturnType<typeof createAdminClient>>
type Named = { name: string | null } | Array<{ name: string | null }> | null
type ActiveProperty = { is_active: boolean | null } | Array<{ is_active: boolean | null }> | null
type Platform = { name: string | null; display_name: string | null } | Array<{ name: string | null; display_name: string | null }> | null

const one = <T,>(value: T | T[] | null): T | null => Array.isArray(value) ? value[0] ?? null : value
const LIMIT = 50
const PLATFORM_SOURCES = ['airbnb', 'booking', 'vrbo', 'flatio']

export class SyncHealthUnavailableError extends Error {
  constructor() { super('SYNC_HEALTH_UNAVAILABLE') }
}

/** Loads one tenant's sync state and turns it into actions. Throws when any source cannot be read. */
export async function loadSyncHealth(db: AdminClient, organizationId: string, locale: string, now = new Date()): Promise<SyncHealth> {
  const today = now.toISOString().slice(0, 10)
  const unlinkedBefore = new Date(now.getTime() - UNLINKED_EVENT_HOURS * 3_600_000).toISOString()
  const trustSince = new Date(now.getTime() - 30 * 86_400_000).toISOString()

  const [org, gmail, queued, listings, placeholders, events, messages, recent, states] = await Promise.all([
    db.from('organizations').select('email_ical_reconciliation_enabled').eq('id', organizationId).maybeSingle(),
    db.from('email_connections').select('email, last_sync_at').eq('organization_id', organizationId).limit(1),
    db.from('raw_emails').select('created_at').eq('organization_id', organizationId)
      .in('processing_status', ['pending', 'retry', 'processing']).order('created_at', { ascending: true }).limit(1),
    db.from('property_listings')
      .select('id, property_id, last_sync_error, last_synced_at, platforms(name, display_name), properties:properties!property_listings_property_org_fk(name, is_active)')
      .eq('organization_id', organizationId).eq('is_active', true).eq('sync_enabled', true)
      .gt('sync_error_count', 0).limit(LIMIT),
    db.from('reservations')
      .select('id, property_id, source, booking_reference, check_in, check_out, created_at, first_name, guest_name, properties:properties!reservations_property_org_fk(name)')
      .eq('organization_id', organizationId).is('deleted_at', null).neq('reservation_status', 'cancelled')
      .gte('check_out', today).or(`first_name.eq.${PLACEHOLDER_GUEST},guest_name.eq.${PLACEHOLDER_GUEST}`)
      .order('check_in', { ascending: true }).limit(LIMIT),
    db.from('calendar_events')
      .select('id, property_id, source_platform, check_in, check_out, created_at, properties:properties!calendar_events_property_org_fk(name)')
      .eq('organization_id', organizationId).eq('status', 'unmatched').eq('event_kind', 'reservation')
      .is('reservation_id', null).gte('check_out', today).lte('created_at', unlinkedBefore)
      .order('check_in', { ascending: true }).limit(LIMIT),
    db.from('raw_emails').select('id, subject, sender, received_at, provider_message_id, recipient, last_error')
      .eq('organization_id', organizationId).eq('processing_status', 'needs_review')
      .order('received_at', { ascending: false }).limit(LIMIT),
    db.from('reservations').select('first_name, guest_name, total_amount')
      .eq('organization_id', organizationId).is('deleted_at', null).in('source', PLATFORM_SOURCES)
      .gte('created_at', trustSince).limit(1000),
    db.from('sync_action_states').select('action_key').eq('organization_id', organizationId).not('dismissed_at', 'is', null),
  ])
  if ([org, gmail, queued, listings, placeholders, events, messages, recent, states].some(result => result.error)) {
    throw new SyncHealthUnavailableError()
  }

  return buildSyncHealth({
    locale, now,
    reconciliationEnabled: Boolean(org.data?.email_ical_reconciliation_enabled),
    gmail: gmail.data?.[0] ? { email: gmail.data[0].email, last_sync_at: gmail.data[0].last_sync_at } : null,
    oldestQueuedAt: queued.data?.[0]?.created_at ?? null,
    failingListings: (listings.data ?? [])
      .filter(row => one(row.properties as ActiveProperty)?.is_active !== false)
      .map(row => {
        const platform = one(row.platforms as Platform)
        return {
          id: row.id, property_id: row.property_id, last_sync_error: row.last_sync_error, last_synced_at: row.last_synced_at,
          property_name: one(row.properties as Named)?.name ?? null,
          platform: platform?.display_name || platform?.name || null,
        }
      }),
    placeholderReservations: (placeholders.data ?? []).map(row => ({
      id: row.id, property_id: row.property_id, source: row.source, booking_reference: row.booking_reference,
      check_in: row.check_in, check_out: row.check_out, created_at: row.created_at,
      property_name: one(row.properties as Named)?.name ?? null,
    })),
    unlinkedReservationEvents: (events.data ?? []).map(row => ({
      id: row.id, property_id: row.property_id, source_platform: row.source_platform,
      check_in: row.check_in, check_out: row.check_out, created_at: row.created_at,
      property_name: one(row.properties as Named)?.name ?? null,
    })),
    reviewMessages: messages.data ?? [],
    recentPlatformReservations: recent.data ?? [],
    dismissedKeys: new Set((states.data ?? []).map(row => row.action_key)),
  })
}
