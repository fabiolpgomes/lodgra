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
