import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Emergency endpoint to apply pending migrations
 * Only works with admin client (bypasses auth)
 */
export async function POST(request: NextRequest) {
  const adminClient = createAdminClient()

  try {
    console.log('[Migration] Applying reservation conflict fix...')

    // Apply the fix to check_reservation_conflict function
    const { error } = await adminClient.rpc('exec', {
      sql: `
CREATE OR REPLACE FUNCTION check_reservation_conflict()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM reservations r
    JOIN property_listings pl ON r.property_listing_id = pl.id
    WHERE pl.property_id = (
      SELECT property_id FROM property_listings WHERE id = NEW.property_listing_id
    )
    AND r.status = 'confirmed'
    AND r.id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
    AND (
      (NEW.check_in >= r.check_in AND NEW.check_in < r.check_out)
      OR (NEW.check_out > r.check_in AND NEW.check_out <= r.check_out)
      OR (NEW.check_in <= r.check_in AND NEW.check_out >= r.check_out)
    )
  ) THEN
    RAISE EXCEPTION 'Conflito de reserva detectado para estas datas';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
      `
    })

    if (error) {
      console.error('[Migration] RPC error:', error)
      // Try alternative approach
      console.log('[Migration] Trying alternative approach...')
      return NextResponse.json(
        {
          message: 'Migration needs manual application',
          instructions: 'Go to Supabase Dashboard → SQL Editor and run the SQL from supabase/migrations/20260330_02_fix_reservation_conflict_check.sql'
        },
        { status: 202 }
      )
    }

    console.log('[Migration] Fix applied successfully!')
    return NextResponse.json({ success: true, message: 'Migration applied' })
  } catch (err) {
    console.error('[Migration] Error:', err)
    return NextResponse.json(
      {
        error: 'Could not apply migration programmatically',
        instructions: 'Apply manually via Supabase Dashboard SQL Editor'
      },
      { status: 500 }
    )
  }
}
