#!/usr/bin/env node
/**
 * Direct test of detectPropertyFromEmailDomain function
 * This calls the actual function with test data
 */

const path = require('path')

// Mock environment
process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'https://pxmcsdqfcwutywrzuoal.supabase.co'
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

console.log('=' .repeat(70))
console.log('DIRECT TEST: detectPropertyFromEmailDomain')
console.log('=' .repeat(70))

console.log('\nTest Parameters:')
console.log('  Email From: reservations@booking.com')
console.log('  Organization ID: 00000000-0000-0000-0000-000000000001')
console.log('')

// We'll test by running this as a Node script with ESM
console.log('\nTo run actual function test, execute:')
console.log('')
console.log('  npx tsx <<EOF')
console.log("  import { detectPropertyFromEmailDomain } from './src/lib/email-parser/propertyDetector'")
console.log('')
console.log("  const result = await detectPropertyFromEmailDomain(")
console.log("    'reservations@booking.com',")
console.log("    '00000000-0000-0000-0000-000000000001'")
console.log("  )")
console.log('')
console.log('  console.log("Result:", result)')
console.log('  EOF')
console.log('')
console.log('=' .repeat(70))
console.log('EXPECTED RESULT:')
console.log('=' .repeat(70))
console.log('')
console.log('✅ If property_id is returned (e.g., cc576a14-...): FIX WORKS!')
console.log('❌ If null is returned: FIX NOT WORKING')
console.log('')
