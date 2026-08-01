#!/usr/bin/env node

/**
 * Create test user for Epic 43 demo
 * Usage: node scripts/create-test-user.js
 */

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function createTestUser() {
  try {
    console.log('🔐 Creating test user...')

    // Create user
    const { data: user, error: userError } = await supabase.auth.admin.createUser({
      email: 'teste@epic43.demo',
      password: 'Epic43Demo!@#123',
      email_confirm: true,
      user_metadata: {
        name: 'Testador Epic 43',
        role: 'property_owner',
      },
    })

    if (userError) {
      console.error('❌ Error creating user:', userError.message)
      process.exit(1)
    }

    console.log('✅ User created:', user.id)

    // Create test property
    const { data: property, error: propError } = await supabase
      .from('properties')
      .insert({
        owner_id: user.id,
        name: 'Demo Epic 43 - Calendar Preview',
        location: 'São Paulo, Brazil',
        type: 'apartment',
        status: 'active',
        created_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (propError) {
      console.error('❌ Error creating property:', propError.message)
      process.exit(1)
    }

    console.log('✅ Property created:', property.id)

    // Create demo pricing rules
    const { error: priceError } = await supabase
      .from('pricing_rules')
      .insert({
        property_id: property.id,
        base_price: 150,
        weekly_discount_percent: 10,
        monthly_discount_percent: 20,
        loyalty_discount_percent: 5,
        created_at: new Date().toISOString(),
      })

    if (priceError) {
      console.error('⚠️  Warning: Could not create pricing rules:', priceError.message)
    } else {
      console.log('✅ Pricing rules created')
    }

    // Create demo availability settings
    const { error: availError } = await supabase
      .from('property_availability')
      .insert({
        property_id: property.id,
        min_nights: 2,
        max_nights: 30,
        advance_notice_days: 1,
        allow_last_minute_bookings: false,
        availability_window_months: 12,
        allow_bookings_beyond_window: false,
        created_at: new Date().toISOString(),
      })

    if (availError) {
      console.error('⚠️  Warning: Could not create availability:', availError.message)
    } else {
      console.log('✅ Availability settings created')
    }

    console.log('\n' + '='.repeat(50))
    console.log('🎉 TEST USER CREATED SUCCESSFULLY!')
    console.log('='.repeat(50))
    console.log('\n📧 Email:    teste@epic43.demo')
    console.log('🔑 Password: Epic43Demo!@#123')
    console.log('\n🏠 Property ID:', property.id)
    console.log('\n📱 Access URL:')
    console.log('  https://home-stay-git-preview-epic43-phase3-fabiolpgomes-projects.vercel.app/login')
    console.log('\n✅ After login, go to:')
    console.log('  https://home-stay-git-preview-epic43-phase3-fabiolpgomes-projects.vercel.app/[locale]/calendar/' + property.id)
    console.log('='.repeat(50) + '\n')

  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
}

createTestUser()
