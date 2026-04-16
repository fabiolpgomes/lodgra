/**
 * Ensures the 'direct' platform exists in the database
 * Run with: npx ts-node scripts/ensure-direct-platform.ts
 */

import { createAdminClient } from '../src/lib/supabase/admin'

async function ensureDirectPlatform() {
  const adminClient = createAdminClient()

  // Check if 'direct' platform exists
  const { data: existing } = await adminClient
    .from('platforms')
    .select('id, name')
    .eq('name', 'direct')
    .maybeSingle()

  if (existing) {
    console.log('✅ Platform "direct" already exists:', existing.id)
    return
  }

  // Create 'direct' platform
  console.log('Creating "direct" platform...')
  const { data: created, error } = await adminClient
    .from('platforms')
    .insert({
      name: 'direct',
      display_name: 'Reserva Directa',
      is_active: true,
    })
    .select('id')
    .single()

  if (error) {
    console.error('❌ Error creating platform:', error.message)
    process.exit(1)
  }

  console.log('✅ Platform "direct" created successfully:', created.id)
}

ensureDirectPlatform().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
