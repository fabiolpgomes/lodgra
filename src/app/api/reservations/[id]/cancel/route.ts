import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getUserAccess } from '@/lib/auth/getUserAccess'
import { cancelReservation } from '@/lib/reservations/cancelReservation'
import { createClient } from '@/lib/supabase/server'

const cancellationSchema = z.object({
  reason: z.string().trim().max(500).optional().nullable(),
  cancellation_reason: z.string().trim().max(500).optional().nullable(),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient()
  const access = await getUserAccess(supabase)

  if (!access) {
    return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 })
  }

  const parsedBody = cancellationSchema.safeParse(await request.json().catch(() => ({})))
  if (!parsedBody.success) {
    return NextResponse.json(
      { success: false, error: 'Motivo do cancelamento inválido' },
      { status: 400 },
    )
  }

  const { id } = await params
  const reason = parsedBody.data.cancellation_reason ?? parsedBody.data.reason ?? null
  const result = await cancelReservation(supabase, access, id, reason)

  if (result.ok === false) {
    return NextResponse.json({ success: false, error: result.error }, { status: result.status })
  }

  return NextResponse.json({
    success: true,
    reservation_id: result.reservationId,
    status: 'cancelled',
    already_cancelled: result.alreadyCancelled,
  })
}
