import type { SupabaseClient } from '@supabase/supabase-js'

export interface ReconciliationAvailabilityInput {
  supabase: SupabaseClient
  organizationId: string
  propertyId: string
  propertyListingId: string
  uid: string
  checkIn: string
  checkOut: string
  summary?: string
}

/** A historical match is insufficient: cancellation or date changes can uncover the feed dates. */
export async function hasActiveReconciledReservation(
  input: Omit<ReconciliationAvailabilityInput, 'uid' | 'summary'> & { calendarEventId: string }
): Promise<boolean> {
  const { data, error } = await input.supabase.from('reservations')
    .select('status, reservation_status, deleted_at, check_in, check_out')
    .eq('organization_id', input.organizationId)
    .eq('property_id', input.propertyId)
    .eq('property_listing_id', input.propertyListingId)
    .eq('calendar_event_id', input.calendarEventId)
    .maybeSingle()

  if (error) throw new Error(`Falha ao verificar reserva reconciliada: ${error.message}`)

  return Boolean(data &&
    data.status !== 'cancelled' && data.reservation_status !== 'cancelled' &&
    !data.deleted_at && data.check_in === input.checkIn && data.check_out === input.checkOut)
}

/** Keeps the property unavailable while an opaque iCal event awaits email data. */
export async function upsertReconciliationAvailability(
  input: ReconciliationAvailabilityInput
): Promise<void> {
  if (!input.uid.trim()) throw new Error('Cannot stage an iCal event without UID')

  const { error } = await input.supabase.from('calendar_blocks').upsert({
    organization_id: input.organizationId,
    property_id: input.propertyId,
    property_listing_id: input.propertyListingId,
    external_uid: input.uid,
    start_date: input.checkIn,
    end_date: input.checkOut,
    notes: input.summary || 'Aguardando reconciliação de reserva',
    block_type: 'platform_sync',
    updated_at: new Date().toISOString(),
  }, { onConflict: 'organization_id,property_listing_id,external_uid' })

  if (error) throw new Error(`Falha ao preservar disponibilidade durante reconciliação: ${error.message}`)
}
