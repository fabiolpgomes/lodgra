import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth/requireRole'
import { createClient } from '@/lib/supabase/server'
import { loadReservationReportData } from '@/lib/reports/reservationReportData'

export async function GET(request: NextRequest) {
  try {
    const auth = await requireRole(['admin', 'gestor', 'viewer', 'guest'])
    if (!auth.authorized) return auth.response!

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const propertyId = searchParams.get('propertyId') || ''

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'startDate e endDate são obrigatórios' },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    if (!auth.organizationId) {
      return NextResponse.json({ error: 'Organização não encontrada' }, { status: 403 })
    }
    const reservations = await loadReservationReportData({
      sessionClient: supabase,
      organizationId: auth.organizationId,
      startDate,
      endDate,
      propertyId,
    })

    // Return JSON data - client will generate PDF
    return NextResponse.json({
      reservations,
      startDate,
      endDate,
      propertyId,
      isAdmin: auth.role === 'admin',
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'PROPERTY_ACCESS_DENIED') {
      return NextResponse.json({ error: 'Acesso negado à propriedade' }, { status: 403 })
    }
    console.error('Error generating PDF:', error)
    return NextResponse.json(
      { error: 'Erro ao gerar relatório' },
      { status: 500 }
    )
  }
}
