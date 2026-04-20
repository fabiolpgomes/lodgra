const { createClient } = require('@supabase/supabase-js')
const dotenv = require('dotenv')
const path = require('path')
const fs = require('fs')

// Load .env.local manually because we are running a standalone script
const envPath = path.resolve(__dirname, '../.env.local')
const envConfig = dotenv.parse(fs.readFileSync(envPath))

const supabaseUrl = envConfig.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = envConfig.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function promoteUser(email) {
  console.log(`Promoting ${email} to admin...`)
  
  const { data, error } = await supabase
    .from('user_profiles')
    .update({ role: 'admin' })
    .eq('email', email)
    .select()

  if (error) {
    console.error('Error updating user profile:', error)
    process.exit(1)
  }

  if (data && data.length > 0) {
    console.log('Success! User promoted to admin.')
    console.log(data[0])
  } else {
    console.log('User not found in user_profiles. Make sure the user has registered and logged in at least once.')
  }
}

const email = process.argv[2] || 'teste@example.com'
promoteUser(email)
