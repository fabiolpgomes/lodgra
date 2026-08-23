import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getValidAccessToken, fetchUnreadEmails, ConnectionRow } from '@/lib/email-parser/gmail-client'
import { detectPlatform, ALL_KNOWN_SENDERS } from '@/lib/email-parser/platforms'
import { parseReservationEmail } from '@/lib/email-parser/parser'
import { sendOwnerReservationNotification } from '@/lib/email/resend'
import { calculateServiceFeeAmount, nightsBetween } from '@/lib/reservations/serviceFee'
import { detectPropertyFromEmailDomain, getDefaultPropertyIfSingleOwner, extractDatesFromEmailBody } from '@/lib/email-parser/propertyDetector'
import { findMatchingICalReservation, enrichReservationWithEmail } from '@/lib/email-parser/reservationMatcher'
import { isCancellationEmail, markReservationCancelled, findReservationToCancelByConfirmation } from '@/lib/email-parser/cancellationDetector'
import { isAuthorizedCronRequest } from '@/lib/cron/auth'

export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5 minutos

export async function GET(request: NextRequest) {
  const anthropicKey = process.env.ANTHROPIC_API_KEY

  if (!isAuthorizedCronRequest(request)) {
    console.error('[email-parser] Unauthorized cron request')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Verificar se ANTHROPIC_API_KEY está configurado
  if (!anthropicKey) {
    console.error('[email-parser] ANTHROPIC_API_KEY não configurado')
    return NextResponse.json(
      { error: 'ANTHROPIC_API_KEY não configurado em variáveis de ambiente', processed: 0, created: 0, skipped: 0, errors: 1 },
      { status: 500 }
    )
  }

  const supabase = await createAdminClient()
  const results = { processed: 0, created: 0, skipped: 0, errors: 0, errorDetails: [] as Array<{
    property: string
    email: string
    guest: string
    type: string
    message: string
  }> }

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
        results.errorDetails.push({
          property: 'Sistema',
          email: conn.email,
          guest: 'N/A',
          type: 'auth_error',
          message: err instanceof Error ? err.message : 'Erro desconhecido na organização'
        })
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
  results: { processed: number; created: number; skipped: number; errors: number; errorDetails: Array<any> },
) {
  const accessToken = await getValidAccessToken(conn)
  if (!accessToken) {
    console.warn(`[email-parser] Token inválido para org ${conn.organization_id}`)
    results.errors++
    results.errorDetails.push({
      property: 'Sistema',
      email: conn.email,
      guest: 'N/A',
      type: 'token_invalid',
      message: 'Token do Gmail expirou ou é inválido'
    })
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
      const errorMsg = 'Campos obrigatórios em falta (guest_name ou checkin_date)'
      await supabase.from('email_parse_log').insert({
        organization_id: conn.organization_id,
        message_id: email.id,
        received_at: email.receivedAt.toISOString(),
        platform,
        status: 'error',
        parsed_data: parsed,
        error_message: errorMsg,
      })
      results.errors++
      results.errorDetails.push({
        property: parsed?.property_name || 'Desconhecida',
        email: email.from,
        guest: parsed?.guest_name || 'Não extraído',
        type: 'parse_error',
        message: errorMsg
      })
      continue
    }

    // Task 4: Auto-detect property from email domain
    let propertyId = await detectPropertyFromEmailDomain(email.from, conn.organization_id)
    if (!propertyId) {
      propertyId = await getDefaultPropertyIfSingleOwner(conn.organization_id)
    }

    if (!propertyId) {
      const errorMsg = 'Propriedade não identificada do domain de email'
      console.warn(`[email-parser] ${errorMsg} - from: ${email.from}`)
      await supabase.from('email_parse_log').insert({
        organization_id: conn.organization_id,
        message_id: email.id,
        received_at: email.receivedAt.toISOString(),
        platform,
        status: 'error',
        parsed_data: parsed,
        error_message: errorMsg,
      })
      results.errors++
      results.errorDetails.push({
        property: parsed?.property_name || 'Desconhecida',
        email: email.from,
        guest: parsed?.guest_name || 'N/A',
        type: 'property_detection_error',
        message: errorMsg
      })
      continue
    }

    // Task 4: Detect if cancellation email
    const isCancellation = isCancellationEmail(email.subject, email.body)

    if (isCancellation && parsed.confirmation_code) {
      // Handle cancellation: find and mark reservation as cancelled
      const resIdToCancel = await findReservationToCancelByConfirmation(propertyId, parsed.confirmation_code)

      if (resIdToCancel) {
        const cancelled = await markReservationCancelled(
          resIdToCancel,
          `Cancelled via email from ${platform}`
        )

        if (cancelled) {
          await supabase.from('email_parse_log').insert({
            organization_id: conn.organization_id,
            message_id: email.id,
            received_at: email.receivedAt.toISOString(),
            platform,
            property_id: propertyId,
            status: 'parsed',
            parsed_data: parsed,
            matched_reservation_id: resIdToCancel,
            is_cancellation: true,
          })
          results.created++
          continue
        }
      }

      // Cancellation detected but reservation not found — log as error
      await supabase.from('email_parse_log').insert({
        organization_id: conn.organization_id,
        message_id: email.id,
        received_at: email.receivedAt.toISOString(),
        platform,
        property_id: propertyId,
        status: 'error',
        parsed_data: parsed,
        is_cancellation: true,
        error_message: `Cancellation email but no matching reservation found (confirmation: ${parsed.confirmation_code})`,
      })
      results.errors++
      results.errorDetails.push({
        property: parsed?.property_name || 'Desconhecida',
        email: email.from,
        guest: parsed?.guest_name || 'N/A',
        type: 'cancellation_not_found',
        message: `Cancellation detected but reservation not found`
      })
      continue
    }

    // Task 4: Try to match and enrich existing iCal reservation
    const emailDates = extractDatesFromEmailBody(email.body)
    const matchedReservationId = await findMatchingICalReservation(
      propertyId,
      emailDates.check_in || parsed.checkin_date,
      emailDates.check_out || parsed.checkout_date,
      parsed.guest_name
    )

    if (matchedReservationId) {
      // Enrich existing iCal reservation with email data
      const enriched = await enrichReservationWithEmail(
        matchedReservationId,
        {
          first_name: parsed.guest_name?.split(' ')[0],
          last_name: parsed.guest_name?.split(' ').slice(1).join(' '),
          guest_name: parsed.guest_name,
          confirmation_id: parsed.confirmation_code,
          platform,
          amount: parsed.amount,
        }
      )

      if (enriched) {
        await supabase.from('email_parse_log').insert({
          organization_id: conn.organization_id,
          message_id: email.id,
          received_at: email.receivedAt.toISOString(),
          platform,
          property_id: propertyId,
          status: 'parsed',
          parsed_data: parsed,
          matched_reservation_id: matchedReservationId,
        })
        results.created++
        continue
      }
    }

    // No iCal match: create new draft reservation as before
    const draftResult = await createDraftReservation(supabase, conn.organization_id, parsed, propertyId)
    const reservationId = draftResult?.id || null

    if (!draftResult) {
      const errorMsg = 'Falha ao criar reserva (erro na BD ou propriedade não encontrada)'
      await supabase.from('email_parse_log').insert({
        organization_id: conn.organization_id,
        message_id: email.id,
        received_at: email.receivedAt.toISOString(),
        platform,
        property_id: propertyId,
        status: 'error',
        parsed_data: parsed,
        error_message: errorMsg,
      })
      results.errors++
      results.errorDetails.push({
        property: parsed?.property_name || 'Não identificada',
        email: email.from,
        guest: parsed?.guest_name || 'N/A',
        type: 'reservation_error',
        message: errorMsg
      })
      continue
    }

    await supabase.from('email_parse_log').insert({
      organization_id: conn.organization_id,
      message_id: email.id,
      received_at: email.receivedAt.toISOString(),
      platform,
      property_id: propertyId,
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
          currency: parsed.currency ?? draftResult.currency ?? undefined,
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
  propertyId?: string,
): Promise<{ id: string; propertyName: string; currency: string | null } | null> {
  if (!parsed) return null

  // Encontrar property_listing para a propriedade detectada (ou primeira da org)
  let query = supabase
    .from('property_listings')
    .select('id, name, properties!inner(id, organization_id, currency, cleaning_fee, cleaning_fee_type, pet_fee, pet_fee_type)')
    .eq('properties.organization_id', organizationId)

  if (propertyId) {
    query = query.eq('property_id', propertyId)
  }

  const { data: listing } = await query.limit(1).single()

  if (!listing) {
    console.warn(`[email-parser] Sem property_listing para org ${organizationId}${propertyId ? ` e property ${propertyId}` : ''}`)
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

  // Story 39.1 — snapshot de service_fee_amount a partir da propriedade (não recalculado depois)
  const emailParserPropertyFees = listing.properties as unknown as
    | { cleaning_fee: number | null; cleaning_fee_type: string | null; pet_fee: number | null; pet_fee_type: string | null }
    | null
    | undefined
  const emailParserNights = nightsBetween(parsed.checkin_date, parsed.checkout_date)
  const serviceFeeAmount = calculateServiceFeeAmount(emailParserPropertyFees, emailParserNights)

  const { data: reservation, error } = await supabase
    .from('reservations')
    .insert({
      property_id: propertyId || listing.properties?.id,
      property_listing_id: listing.id,
      guest_id: guest?.id || null,
      guest_name: guestName,
      first_name: firstName,
      last_name: lastName,
      check_in: parsed.checkin_date,
      check_out: parsed.checkout_date,
      total_amount: parsed.amount,
      currency: parsed.currency ?? listing.properties?.currency ?? null,
      number_of_guests: parsed.num_guests || 1,
      status: 'draft',
      source: parsed.platform || 'email_parse',
      notes: parsed.confirmation_code ? `Código: ${parsed.confirmation_code}` : null,
      service_fee_amount: serviceFeeAmount,
      discount_amount: parsed.discount_amount || 0,
      commission_calculated_at: new Date().toISOString(),
      organization_id: organizationId,
    })
    .select('id')
    .single()

  if (error) {
    console.error('[email-parser] Erro ao criar reserva draft:', error)
    return null
  }

  return reservation ? { id: reservation.id, propertyName: listing.name, currency: parsed.currency ?? listing.properties?.currency ?? null } : null
}
