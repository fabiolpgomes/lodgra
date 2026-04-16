/**
 * Apply the reservation conflict fix directly to Supabase
 * Run with: node scripts/apply-fix-reservation-conflict.js
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const adminClient = createClient(supabaseUrl, serviceRoleKey)

async function applyFix() {
  const sql = `
CREATE OR REPLACE FUNCTION check_reservation_conflict()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if there's already a confirmed reservation in the period
  IF EXISTS (
    SELECT 1 FROM reservations r
    JOIN property_listings pl ON r.property_listing_id = pl.id
    WHERE pl.property_id = (
      SELECT property_id
      FROM property_listings
      WHERE id = NEW.property_listing_id
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

  console.log('Applying reservation conflict fix...')
  const { data, error } = await adminClient.rpc('exec_sql', { sql })

  if (error) {
    console.error('❌ Error applying fix:', error.message)
    process.exit(1)
  }

  console.log('✅ Fix applied successfully!')
}

// Alternative: use direct SQL execution if exec_sql doesn't exist
async function applyFixDirect() {
  console.log('Applying fix directly via SQL...')

  const { error } = await adminClient.from('_sql').insert({
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
    AND ((NEW.check_in >= r.check_in AND NEW.check_in < r.check_out)
         OR (NEW.check_out > r.check_in AND NEW.check_out <= r.check_out)
         OR (NEW.check_in <= r.check_in AND NEW.check_out >= r.check_out))
  ) THEN
    RAISE EXCEPTION 'Conflito de reserva detectado para estas datas';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
    `
  })

  if (error) {
    console.error('Note: Direct SQL table not available. You need to apply the migration manually in Supabase dashboard.')
    return false
  }

  return true
}

applyFix().catch(async () => {
  console.log('exec_sql RPC not available, trying direct approach...')
  const applied = await applyFixDirect()
  if (!applied) {
    console.error('\n⚠️  Please apply the migration manually:')
    console.error('1. Go to Supabase Dashboard → SQL Editor')
    console.error('2. Copy the SQL from: supabase/migrations/20260330_02_fix_reservation_conflict_check.sql')
    console.error('3. Run it in the SQL Editor')
  }
})
