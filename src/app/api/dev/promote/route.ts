import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const email = searchParams.get('email')

  if (!email) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  console.log(`[DEV] Promoting ${email} to admin...`)

  // 1. Buscar a primeira organização disponível (ou criar uma se não houver)
  const { data: orgs } = await supabase.from('organizations').select('id').limit(1)
  let orgId = orgs?.[0]?.id

  if (!orgId) {
    // Se não houver organização, vamos tentar ver se existe no seed
    orgId = '00000000-0000-0000-0000-00000000e2e1'
    // Tenta criar essa org se ela não existir
    await supabase.from('organizations').upsert({ 
      id: orgId, 
      name: 'Lodgra Test Org',
      plan: 'professional',
      currency: 'EUR'
    })
  }

  const { data, error } = await supabase
    .from('user_profiles')
    .update({ 
      role: 'admin',
      organization_id: orgId,
      access_all_properties: true
    })
    .eq('email', email)
    .select()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (data && data.length > 0) {
    return NextResponse.json({ 
      success: true, 
      message: `User ${email} promoted to ADMIN successfully.`,
      user: data[0]
    })
  } else {
    return NextResponse.json({ 
      error: 'User not found. Make sure you registered with this email first.' 
    }, { status: 404 })
  }
}
