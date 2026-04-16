import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendDailySummary } from '@/lib/email/resend'

export const dynamic = 'force-dynamic'

interface ReservationRow {
  id: string
  check_in: string
  check_out: string
  status: string
  number_of_guests: number | null
  total_amount: number | null
  currency: string | null
  property_listings: { properties: { name: string }[] }[]
  guests: { first_name: string; last_name: string; email: string | null } | null
}

export async function GET(request: NextRequest) {
  try {
    // Verificar autenticação
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()

    // Data de hoje
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayStr = today.toISOString().split('T')[0]

    // Buscar check-ins de hoje
    const { data: checkIns } = await supabase
      .from('reservations')
      .select(`
        id,
        check_in,
        check_out,
        status,
        number_of_guests,
        total_amount,
        currency,
        property_listings!inner(
          properties!inner(
            name
          )
        ),
        guests(
          first_name,
          last_name,
          email
        )
      `)
      .eq('status', 'confirmed')
      .eq('check_in', todayStr)

    // Buscar check-outs de hoje
    const { data: checkOuts } = await supabase
      .from('reservations')
      .select(`
        id,
        check_in,
        check_out,
        status,
        number_of_guests,
        property_listings!inner(
          properties!inner(
            name
          )
        ),
        guests(
          first_name,
          last_name,
          email
        )
      `)
      .eq('status', 'confirmed')
      .eq('check_out', todayStr)

    // Preparar dados para o email
    const checkInNotifications = ((checkIns as unknown as ReservationRow[]) || []).map((r) => {
      const checkIn = new Date(r.check_in)
      const checkOut = new Date(r.check_out)
      const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24))

      return {
        guestName: r.guests ? `${r.guests.first_name} ${r.guests.last_name}` : 'Sem nome',
        guestEmail: r.guests?.email ?? undefined,
        propertyName: r.property_listings[0]?.properties[0]?.name ?? '',
        checkIn: r.check_in,
        checkOut: r.check_out,
        nights,
        guests: r.number_of_guests || 1,
        totalAmount: r.total_amount?.toString(),
        currency: r.currency ?? undefined,
      }
    })

    const checkOutNotifications = ((checkOuts as unknown as ReservationRow[]) || []).map((r) => {
      const checkIn = new Date(r.check_in)
      const checkOut = new Date(r.check_out)
      const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24))

      return {
        guestName: r.guests ? `${r.guests.first_name} ${r.guests.last_name}` : 'Sem nome',
        guestEmail: r.guests?.email ?? undefined,
        propertyName: r.property_listings[0]?.properties[0]?.name ?? '',
        checkIn: r.check_in,
        checkOut: r.check_out,
        nights,
        guests: r.number_of_guests || 1,
      }
    })

    // Enviar email de resumo diário
    let emailResult = null
    if (checkInNotifications.length > 0 || checkOutNotifications.length > 0) {
      emailResult = await sendDailySummary({
        date: todayStr,
        checkIns: checkInNotifications,
        checkOuts: checkOutNotifications,
      })
    }

    const result = {
      success: true,
      date: todayStr,
      checkIns: {
        count: checkIns?.length || 0,
        reservations: checkIns || [],
      },
      checkOuts: {
        count: checkOuts?.length || 0,
        reservations: checkOuts || [],
      },
      emailSent: !!emailResult,
      timestamp: new Date().toISOString(),
    }

    console.log('Check-ins hoje:', result.checkIns.count)
    console.log('Check-outs hoje:', result.checkOuts.count)
    console.log('Email enviado:', result.emailSent)

    return NextResponse.json(result)

  } catch (error: unknown) {
    console.error('Erro no cron job de check-ins:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro no cron job' },
      { status: 500 }
    )
  }
}
