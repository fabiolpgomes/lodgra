import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * API endpoint to check if a guest exists
 * Uses admin client to bypass RLS restrictions
 */
export async function POST(request: NextRequest) {
  try {
    const { email, organization_id } = await request.json()

    if (!email || !organization_id) {
      return NextResponse.json(
        { error: 'Email e organization_id são obrigatórios' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    const { data: existingGuest, error } = await supabase
      .from('guests')
      .select('id, first_name, last_name, email, phone')
      .eq('email', email)
      .eq('organization_id', organization_id)
      .single()

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows returned (expected when guest doesn't exist)
      console.error('Erro ao buscar guest:', error)
      return NextResponse.json(
        { error: 'Erro ao verificar guest' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      exists: !!existingGuest,
      guest: existingGuest || null,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido'
    console.error('Erro em /api/guests/check:', message)
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}
