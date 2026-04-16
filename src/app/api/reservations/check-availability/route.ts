import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkPropertyAvailability } from '@/lib/reservations/checkAvailability'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { property_id, check_in, check_out, exclude_reservation_id } = body

    // Validação básica
    if (!property_id || !check_in || !check_out) {
      return NextResponse.json(
        {
          error: 'property_id, check_in e check_out são obrigatórios',
          available: false,
          conflicting_reservations: [],
        },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Verificar disponibilidade
    const result = await checkPropertyAvailability(
      supabase,
      property_id,
      check_in,
      check_out,
      exclude_reservation_id
    )

    return NextResponse.json({
      available: result.available,
      conflicting_reservations: result.conflicting_reservations,
      message: result.message,
    })
  } catch (error: unknown) {
    console.error('[CheckAvailability API] Erro:', error)
    const message = error instanceof Error ? error.message : 'Erro ao verificar disponibilidade'
    return NextResponse.json(
      {
        error: message,
        available: false,
        conflicting_reservations: [],
      },
      { status: 500 }
    )
  }
}
