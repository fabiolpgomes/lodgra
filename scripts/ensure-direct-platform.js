/**
 * Ensures the 'direct' platform exists in the database
 * Run with: node scripts/ensure-direct-platform.js
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const adminClient = createClient(supabaseUrl, serviceRoleKey)

async function ensureDirectPlatform() {
  // Check if 'direct' platform exists
  const { data: existing, error: checkError } = await adminClient
    .from('platforms')
    .select('id, name')
    .eq('name', 'direct')
    .maybeSingle()

  if (checkError) {
    console.error('❌ Error checking platform:', checkError.message)
    process.exit(1)
  }

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
