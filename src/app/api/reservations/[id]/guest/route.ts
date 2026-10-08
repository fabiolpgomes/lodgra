import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const PLACEHOLDER_GUEST = 'Hóspede'

const schema = z.object({
  guest_name: z.string().trim().min(2).max(200).refine(name => name !== PLACEHOLDER_GUEST, 'Indique o nome real do hóspede'),
  number_of_guests: z.number().int().min(1).max(50).optional(),
  total_price: z.number().finite().min(0).max(1_000_000).optional(),
})

/**
 * Completes the guest of a synced reservation (name, guests, total) without touching any other field —
 * used by the sync panel drawer. RLS on the user's session scopes it to the tenant.
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sessão expirada. Entre novamente.' }, { status: 401 })

  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Dados inválidos' }, { status: 400 })
  const { guest_name, number_of_guests, total_price } = parsed.data

  const { data: reservation, error: readError } = await supabase.from('reservations')
    .select('id, guest_id').eq('id', id).is('deleted_at', null).maybeSingle()
  if (readError) return NextResponse.json({ error: 'Não foi possível ler a reserva.' }, { status: 503 })
  if (!reservation) return NextResponse.json({ error: 'Reserva não encontrada.' }, { status: 404 })

  const [firstName, ...rest] = guest_name.split(/\s+/)
  const update: Record<string, unknown> = {
    guest_name, first_name: firstName, last_name: rest.join(' '), updated_at: new Date().toISOString(),
  }
  if (number_of_guests !== undefined) update.number_of_guests = number_of_guests
  if (total_price !== undefined) { update.total_price = total_price; update.total_amount = total_price }

  const { error: updateError } = await supabase.from('reservations').update(update).eq('id', id)
  if (updateError) return NextResponse.json({ error: 'Não foi possível guardar. Tente novamente.' }, { status: 503 })

  // The iCal importer creates a placeholder guest record; give it the real name too.
  if (reservation.guest_id) {
    await supabase.from('guests').update({ first_name: firstName, last_name: rest.join(' '), updated_at: new Date().toISOString() })
      .eq('id', reservation.guest_id).eq('first_name', PLACEHOLDER_GUEST)
  }
  return NextResponse.json({ success: true })
}
