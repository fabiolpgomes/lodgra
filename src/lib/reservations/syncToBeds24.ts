/**
 * syncToBeds24.ts
 * Sincroniza reservas do Lodgra para o Beds24 via API v2.
 * O Beds24 distribui automaticamente para Google Vacation Rentals,
 * Airbnb, Booking.com, Vrbo e demais canais ligados.
 *
 * Coloca este ficheiro em: src/lib/reservations/syncToBeds24.ts
 */

export interface Beds24SyncResult {
  success: boolean
  beds24_booking_id?: string | number
  error?: string
}

interface ReservationData {
  id: string
  check_in: string
  check_out: string
  guest_name: string | null
  guest_email: string | null
  guest_phone: string | null
  adults: number
  children: number
  total_amount: number | null
  currency: string | null
  notes: string | null
  source: string | null
}

/**
 * Cria ou actualiza uma reserva no Beds24.
 * Chamado após confirmação de reserva directa no Lodgra.
 *
 * @param reservation   - Dados da reserva do Supabase
 * @param beds24PropId  - ID da propriedade no Beds24 (ex: 337561)
 */
export async function syncReservationToBeds24(
  reservation: ReservationData,
  beds24PropId: string | number
): Promise<Beds24SyncResult> {
  const apiKey = process.env.BEDS24_API_KEY

  if (!apiKey) {
    return { success: false, error: 'BEDS24_API_KEY não configurada' }
  }

  if (!beds24PropId) {
    return { success: false, error: 'beds24PropId não fornecido' }
  }

  // Monta o payload no formato da API v2 do Beds24
  const payload = {
    propId: Number(beds24PropId),
    roomId: 0, // 0 = Beds24 escolhe automaticamente com base na disponibilidade
    checkIn: reservation.check_in,   // formato: YYYY-MM-DD
    checkOut: reservation.check_out, // formato: YYYY-MM-DD
    numAdult: reservation.adults ?? 1,
    numChild: reservation.children ?? 0,
    price: reservation.total_amount ? Number(reservation.total_amount) : undefined,
    currency: reservation.currency ?? 'EUR',
    guestFirstName: reservation.guest_name?.split(' ')[0] ?? 'Guest',
    guestLastName: reservation.guest_name?.split(' ').slice(1).join(' ') || '-',
    guestEmail: reservation.guest_email ?? undefined,
    guestPhone: reservation.guest_phone ?? undefined,
    status: 1, // 1 = Confirmed
    referer: reservation.source ?? 'Lodgra Direct',
    infoItems: [
      {
        code: 'LODGRA_ID',
        text: reservation.id, // guarda o ID do Lodgra para referência cruzada
      },
      ...(reservation.notes
        ? [{ code: 'NOTE', text: reservation.notes }]
        : []),
    ],
  }

  try {
    const response = await fetch('https://beds24.com/api/v2/bookings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'token': apiKey,
      },
      body: JSON.stringify([payload]),
    })

    const data = await response.json()

    if (!response.ok) {
      const errorMsg = data?.error || data?.message || `HTTP ${response.status}`
      console.error(`[Beds24] Erro ao criar reserva: ${errorMsg}`, data)
      return { success: false, error: errorMsg }
    }

    // A API v2 retorna { bookId: number } em caso de sucesso
    const bookId = data?.bookId ?? data?.id ?? data?.[0]?.bookId
    console.log(`[Beds24] Reserva criada com sucesso. bookId: ${bookId}`)

    return {
      success: true,
      beds24_booking_id: bookId,
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Erro desconhecido'
    console.error(`[Beds24] Erro de rede: ${msg}`)
    return { success: false, error: msg }
  }
}

/**
 * Cancela uma reserva no Beds24.
 * Chamado quando uma reserva directa é cancelada no Lodgra.
 *
 * @param beds24BookingId - ID da reserva no Beds24 (guardado no Lodgra após criação)
 */
export async function cancelReservationInBeds24(
  beds24BookingId: string | number
): Promise<Beds24SyncResult> {
  const apiKey = process.env.BEDS24_API_KEY

  if (!apiKey) {
    return { success: false, error: 'BEDS24_API_KEY não configurada' }
  }

  try {
    const response = await fetch(`https://beds24.com/api/v2/bookings/${beds24BookingId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'token': apiKey,
      },
      body: JSON.stringify({ status: 0 }), // 0 = Cancelled no Beds24
    })

    const data = await response.json()

    if (!response.ok) {
      const errorMsg = data?.error || data?.message || `HTTP ${response.status}`
      console.error(`[Beds24] Erro ao cancelar reserva ${beds24BookingId}: ${errorMsg}`)
      return { success: false, error: errorMsg }
    }

    console.log(`[Beds24] Reserva ${beds24BookingId} cancelada com sucesso`)
    return { success: true, beds24_booking_id: beds24BookingId }
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Erro desconhecido'
    console.error(`[Beds24] Erro ao cancelar: ${msg}`)
    return { success: false, error: msg }
  }
}
