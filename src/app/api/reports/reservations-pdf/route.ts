import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth/requireRole'
import { createClient } from '@/lib/supabase/server'
import { getUserPropertyIds } from '@/lib/auth/getUserProperties'

/* eslint-disable @typescript-eslint/no-explicit-any */
interface Reservation extends Record<string, any> {
  id: string
  check_in: string
  check_out: string
  status: string
  total_amount: number | null
  currency: string
  number_of_guests: number
  property_listings: Record<string, any>
  guests: Record<string, any> | null
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export async function GET(request: NextRequest) {
  try {
    const auth = await requireRole(['admin', 'gestor', 'viewer', 'guest'])
    if (!auth.authorized) return auth.response!

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const propertyId = searchParams.get('propertyId') || ''
    const roleParam = searchParams.get('role') || auth.role || 'viewer'

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'startDate e endDate são obrigatórios' },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const userPropertyIds = await getUserPropertyIds(supabase)
    const isAdmin = roleParam === 'admin'

    // Build query
    let reservationsQuery = supabase
      .from('reservations')
      .select(`
        id,
        check_in,
        check_out,
        status,
        total_amount,
        currency,
        number_of_guests,
        property_listings!inner(
          properties!inner(
            id,
            name,
            city
          )
        ),
        guests(
          first_name,
          last_name,
          email
        )
      `)
      .eq('status', 'confirmed')
      .lte('check_in', endDate)
      .gte('check_out', startDate)
      .order('check_in', { ascending: true })

    // Filter by property
    if (propertyId) {
      reservationsQuery = reservationsQuery.eq('property_listings.property_id', propertyId)
    }
    if (userPropertyIds) {
      reservationsQuery = reservationsQuery.in('property_listings.property_id', userPropertyIds)
    }

    const { data: reservations, error } = await reservationsQuery

    if (error) {
      console.error('Error fetching reservations:', error)
      return NextResponse.json({ error: 'Erro ao buscar reservas' }, { status: 500 })
    }

    // Return JSON data - client will generate PDF
    return NextResponse.json({
      reservations: reservations as Reservation[],
      startDate,
      endDate,
      propertyId,
      isAdmin,
    })
  } catch (error) {
    console.error('Error generating PDF:', error)
    return NextResponse.json(
      { error: 'Erro ao gerar relatório' },
      { status: 500 }
    )
  }
}

