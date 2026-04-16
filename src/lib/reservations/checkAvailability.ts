import { SupabaseClient } from '@supabase/supabase-js'

export interface ConflictingReservation {
  id: string
  check_in: string
  check_out: string
  guest_name?: string
  status: string
  source?: string
}

export interface AvailabilityCheckResult {
  available: boolean
  conflicting_reservations: ConflictingReservation[]
  message?: string
}

/**
 * Verifica se uma propriedade está disponível para as datas especificadas.
 * Procura por conflitos com reservas existentes (confirmadas ou pendentes).
 *
 * @param supabase - Cliente Supabase autenticado
 * @param propertyId - ID da propriedade a verificar
 * @param checkIn - Data de check-in (YYYY-MM-DD)
 * @param checkOut - Data de check-out (YYYY-MM-DD)
 * @param excludeReservationId - ID de reserva a excluir da verificação (para edições)
 * @returns Resultado da verificação com detalhes de conflitos
 */
export async function checkPropertyAvailability(
  supabase: SupabaseClient,
  propertyId: string,
  checkIn: string,
  checkOut: string,
  excludeReservationId?: string
): Promise<AvailabilityCheckResult> {
  try {
    // Validação de datas
    const checkInDate = new Date(checkIn)
    const checkOutDate = new Date(checkOut)

    if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) {
      return {
        available: false,
        conflicting_reservations: [],
        message: 'Datas inválidas',
      }
    }

    if (checkOutDate <= checkInDate) {
      return {
        available: false,
        conflicting_reservations: [],
        message: 'Data de check-out deve ser posterior a check-in',
      }
    }

    // Buscar todos os listings da propriedade
    const { data: listings, error: listingsError } = await supabase
      .from('property_listings')
      .select('id')
      .eq('property_id', propertyId)
      .eq('is_active', true)

    if (listingsError) {
      console.error(`[CheckAvailability] Erro ao buscar listings: ${listingsError.message}`)
      throw new Error(`Erro ao verificar disponibilidade: ${listingsError.message}`)
    }

    if (!listings || listings.length === 0) {
      return {
        available: true,
        conflicting_reservations: [],
        message: 'Propriedade sem anúncios cadastrados',
      }
    }

    const listingIds = listings.map(l => l.id)

    // Buscar reservas que sobrepõem com as datas
    // Usar operadores estritos: check_in < checkOut AND check_out > checkIn
    const { data: conflicts, error: conflictsError } = await supabase
      .from('reservations')
      .select(`
        id,
        check_in,
        check_out,
        status,
        source,
        guests(
          first_name,
          last_name
        )
      `)
      .in('property_listing_id', listingIds)
      .in('status', ['confirmed', 'pending'])
      .lt('check_in', checkOut) // check_in < checkOut
      .gt('check_out', checkIn) // check_out > checkIn

    if (conflictsError) {
      console.error(`[CheckAvailability] Erro ao buscar conflitos: ${conflictsError.message}`)
      throw new Error(`Erro ao verificar disponibilidade: ${conflictsError.message}`)
    }

    // Filtrar excluindo a reserva se fornecida (para edições)
    const conflictingReservations = (conflicts || []).filter(
      r => !excludeReservationId || r.id !== excludeReservationId
    )

    // Mapear para resposta
    const mappedConflicts: ConflictingReservation[] = conflictingReservations.map(r => ({
      id: r.id,
      check_in: r.check_in,
      check_out: r.check_out,
      status: r.status,
      source: r.source || 'manual',
      guest_name: r.guests
        ? `${(r.guests as { first_name?: string; last_name?: string }).first_name || ''} ${(r.guests as { first_name?: string; last_name?: string }).last_name || ''}`.trim()
        : undefined,
    }))

    return {
      available: mappedConflicts.length === 0,
      conflicting_reservations: mappedConflicts,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido ao verificar disponibilidade'
    console.error(`[CheckAvailability] ${message}`)
    throw error
  }
}
