import { detectPropertyFromEmailDomain } from './src/lib/email-parser/propertyDetector'

async function test() {
  console.log('Testing detectPropertyFromEmailDomain...')
  console.log('')

  const result = await detectPropertyFromEmailDomain(
    'reservations@booking.com',
    '00000000-0000-0000-0000-000000000001'
  )

  console.log('📧 Email: reservations@booking.com')
  console.log('🏢 Organization: 00000000-0000-0000-0000-000000000001')
  console.log('')
  console.log('Result:', result)
  console.log('')

  if (result) {
    console.log('✅ FIX WORKS! Property detected:', result)
  } else {
    console.log('❌ FIX NOT WORKING! property_id is null')
  }
}

test().catch(console.error)
