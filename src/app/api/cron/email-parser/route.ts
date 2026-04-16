import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getValidAccessToken, fetchUnreadEmails, ConnectionRow } from '@/lib/email-parser/gmail-client'
import { detectPlatform, ALL_KNOWN_SENDERS } from '@/lib/email-parser/platforms'
import { parseReservationEmail } from '@/lib/email-parser/parser'
import { sendOwnerReservationNotification } from '@/lib/email/resend'

export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5 minutos

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const results = { processed: 0, created: 0, skipped: 0, errors: 0 }

  try {
    // Buscar todas as orgs com ligação Gmail activa
    const { data: connections, error: connErr } = await supabase
      .from('email_connections')
      .select('id, organization_id, email, access_token, refresh_token, token_expiry')

    if (connErr || !connections?.length) {
      return NextResponse.json({ ...results, message: 'Sem ligações Gmail activas' })
    }

    for (const conn of connections as ConnectionRow[]) {
      try {
        await processOrg(supabase, conn, results)
      } catch (err) {
        console.error(`[email-parser] Erro na org ${conn.organization_id}:`, err)
        results.errors++
      }
    }

    // Actualizar last_sync_at de todas as orgs processadas
    await supabase
      .from('email_connections')
      .update({ last_sync_at: new Date().toISOString() })
      .in('organization_id', connections.map(c => c.organization_id))

    return NextResponse.json({ success: true, ...results })
  } catch (err) {
    console.error('[email-parser] Erro geral:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

async function processOrg(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  conn: ConnectionRow,
  results: { processed: number; created: number; skipped: number; errors: number },
) {
  const accessToken = await getValidAccessToken(conn)
  if (!accessToken) {
    console.warn(`[email-parser] Token inválido para org ${conn.organization_id}`)
    results.errors++
    return
  }

  const emails = await fetchUnreadEmails(accessToken, ALL_KNOWN_SENDERS)

  for (const email of emails) {
    results.processed++

    // Verificar se já foi processado (deduplicação)
    const { data: existing } = await supabase
      .from('email_parse_log')
      .select('id')
      .eq('message_id', email.id)
      .eq('organization_id', conn.organization_id)
      .single()

    if (existing) {
      results.skipped++
      continue
    }

    const platform = detectPlatform(email.from, email.subject)
    if (!platform) {
      // Remetente não reconhecido — registar como skipped
      await supabase.from('email_parse_log').insert({
        organization_id: conn.organization_id,
        message_id: email.id,
        received_at: email.receivedAt.toISOString(),
        platform: 'unknown',
        status: 'skipped',
      })
      results.skipped++
      continue
    }

    // Extrair dados com Claude Haiku
    const parsed = await parseReservationEmail(email.body)

    if (!parsed || !parsed.checkin_date || !parsed.guest_name) {
      await supabase.from('email_parse_log').insert({
        organization_id: conn.organization_id,
        message_id: email.id,
        received_at: email.receivedAt.toISOString(),
        platform,
        status: 'error',
        parsed_data: parsed,
        error_message: 'Campos obrigatórios em falta (guest_name ou checkin_date)',
      })
      results.errors++
      continue
    }

    // Criar reserva draft
    const draftResult = await createDraftReservation(supabase, conn.organization_id, parsed)
    const reservationId = draftResult?.id || null

    await supabase.from('email_parse_log').insert({
      organization_id: conn.organization_id,
      message_id: email.id,
      received_at: email.receivedAt.toISOString(),
      platform,
      status: 'parsed',
      parsed_data: parsed,
      reservation_id: reservationId,
    })

    // AC6: Notificar proprietário da nova reserva draft
    if (draftResult && parsed && parsed.checkin_date && parsed.checkout_date) {
      const { data: ownerData } = await supabase
        .from('user_profiles')
        .select('email, full_name')
        .eq('organization_id', conn.organization_id)
        .in('role', ['admin', 'gestor'])
        .limit(1)
        .single()

      if (ownerData?.email) {
        const nights = Math.ceil((new Date(parsed.checkout_date).getTime() - new Date(parsed.checkin_date).getTime()) / (1000 * 60 * 60 * 24))

        await sendOwnerReservationNotification({
          ownerName: ownerData.full_name || 'Proprietário',
          ownerEmail: ownerData.email,
          guestName: parsed.guest_name || 'Hóspede',
          propertyName: draftResult.propertyName || 'Propriedade',
          checkIn: parsed.checkin_date,
          checkOut: parsed.checkout_date,
          nights,
          totalAmount: parsed.amount ? `${parsed.amount.toFixed(2)}` : undefined,
          currency: parsed.currency || 'EUR',
          source: `${parsed.platform || 'email_parse'} (rascunho)`,
        })
      }
    }

    results.created++
  }
}

async function createDraftReservation(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  organizationId: string,
  parsed: Awaited<ReturnType<typeof parseReservationEmail>>,
): Promise<{ id: string; propertyName: string } | null> {
  if (!parsed) return null

  // Encontrar primeiro property_listing da org (fallback se não identificar propriedade)
  const { data: listing } = await supabase
    .from('property_listings')
    .select('id, name, properties!inner(organization_id)')
    .eq('properties.organization_id', organizationId)
    .limit(1)
    .single()

  if (!listing) {
    console.warn(`[email-parser] Sem property_listing para org ${organizationId}`)
    return null
  }

  // Criar ou encontrar hóspede
  const guestName = (parsed.guest_name || 'Hóspede').trim()
  const [firstName, ...rest] = guestName.split(' ')
  const lastName = rest.join(' ') || '—'

  const { data: guest } = await supabase
    .from('guests')
    .upsert({
      first_name: firstName,
      last_name: lastName,
      organization_id: organizationId,
    }, { onConflict: 'email,organization_id', ignoreDuplicates: true })
    .select('id')
    .single()

  const { data: reservation, error } = await supabase
    .from('reservations')
    .insert({
      property_listing_id: listing.id,
      guest_id: guest?.id || null,
      check_in: parsed.checkin_date,
      check_out: parsed.checkout_date,
      total_amount: parsed.amount,
      currency: parsed.currency || 'EUR',
      number_of_guests: parsed.num_guests || 1,
      status: 'draft',
      source: parsed.platform || 'email_parse',
      notes: parsed.confirmation_code ? `Código: ${parsed.confirmation_code}` : null,
      commission_calculated_at: new Date().toISOString(),
      organization_id: organizationId,
    })
    .select('id')
    .single()

  if (error) {
    console.error('[email-parser] Erro ao criar reserva draft:', error)
    return null
  }

  return reservation ? { id: reservation.id, propertyName: listing.name } : null
}
