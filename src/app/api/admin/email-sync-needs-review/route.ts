import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createAdminClient()

    const daysParam = request.nextUrl.searchParams.get('days')
    const days = parseInt(daysParam || '7', 10)

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // Buscar casos que precisam revisão
    const { data: cases, error } = await supabase
      .from('email_extractions')
      .select(
        `
        id,
        guest_name,
        property_identifier_raw,
        check_in,
        check_out,
        created_at,
        match_status
      `
      )
      .eq('match_status', 'needs_review')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) throw error

    // Formatar resposta
    const formattedCases = cases.map(case_ => ({
      id: case_.id,
      guestName: case_.guest_name,
      propertyName: case_.property_identifier_raw,
      checkIn: case_.check_in,
      checkOut: case_.check_out,
      createdAt: case_.created_at,
      reason: !case_.property_identifier_raw
        ? 'Propriedade não identificada no email'
        : 'Múltiplas reservas na mesma data',
    }))

    return NextResponse.json({
      count: formattedCases.length,
      cases: formattedCases,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[Email Sync Needs Review] Error:', error)
    return NextResponse.json({ error: 'Failed to fetch cases' }, { status: 500 })
  }
}
