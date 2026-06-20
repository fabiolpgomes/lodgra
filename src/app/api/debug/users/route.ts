import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const adminClient = createAdminClient()
    const searchParams = new URL(request.url).searchParams
    const name = searchParams.get('name')

    if (!name) {
      return NextResponse.json({ error: 'name parameter required' }, { status: 400 })
    }

    // Buscar usuários com este nome
    const { data: users, error } = await adminClient
      .from('user_profiles')
      .select('id, full_name, role, guest_type')
      .ilike('full_name', `%${name}%`)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      search: name,
      users: users || [],
      count: users?.length || 0,
    })
  } catch (error) {
    console.error('Debug error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
