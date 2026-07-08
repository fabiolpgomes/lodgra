import ICAL from 'ical.js'
import { isBookingBlocked, isAirbnbBlocked, isFlatioBlocked } from './bookingParser'

export interface ICalEvent {
  uid: string
  summary: string
  description?: string
  start: Date
  end: Date
  location?: string
}

// Palavras-chave que indicam bloqueio/indisponibilidade (não é reserva real)
const BLOCKED_KEYWORDS = [
  'not available',
  'blocked',
  'block',
  'unavailable',
  'indisponível',
  'indisponivel',
  'closed',
  'fechada',
  'fechado',
  'maintenance',
  'manutenção',
  'manutencao',
  'reservado pelo proprietário',
  'reservado pelo proprietario',
  'owner block',
  'airbnb (not available)',
  'not available (airbnb)',
  'booking.com (not available)',
  'not available (booking)',
  'reserva do proprietário',
  'reserva do proprietario',
  'bloqueio',
  'bloqueado',
  'indisponibilidade',
  'indisponibilidades',
]

/**
 * CRITICAL FIX: Determine if an iCal event is a block (unavailable) or reservation
 *
 * Platforms export BOTH reservations and blocks with similar patterns.
 * This function uses platform-specific logic to differentiate.
 *
 * Bug History:
 * - Old: Treated ALL @booking.com/@airbnb.com UIDs as reservations → blocks created as reservas
 * - Attempt: Generic heuristics (keywords, description length) → false positives/negatives
 * - FIX: Platform-specific parsers that check structured fields
 */
export function isBlockedEvent(event: { summary?: string; description?: string; uid?: string; component?: { getFirstPropertyValue: (prop: string) => unknown } }): boolean {
  const uid = (event.uid || '').toLowerCase()
  const summary = (event.summary || '').toLowerCase().trim()
  const description = (event.description || '').toLowerCase().trim()

  // ═══ PLATFORM-SPECIFIC LOGIC ═══════════════════════════════════════════
  // Each platform has different patterns for reservations vs blocks

  // Booking.com
  if (uid.includes('@booking.com')) {
    return isBookingBlocked(event as Parameters<typeof isBookingBlocked>[0])
  }

  // Airbnb
  if (uid.includes('@airbnb.com')) {
    return isAirbnbBlocked(event as Parameters<typeof isAirbnbBlocked>[0])
  }

  // Flatio
  if (uid.includes('@flatio.com')) {
    return isFlatioBlocked(event as Parameters<typeof isFlatioBlocked>[0])
  }

  // VRBO (Expedia Vacation Rentals)
  if (uid.includes('vrbo') || uid.includes('expedia')) {
    // VRBO similar to Airbnb (owned by Expedia)
    return isAirbnbBlocked(event as Parameters<typeof isAirbnbBlocked>[0])
  }

  // Google Calendar (direct user-created)
  if (uid.includes('google')) {
    // Google Calendar users generally won't have blocks, treat as reserved
    return false
  }

  // ═══ FALLBACK: Generic iCal Properties ═════════════════════════════════
  // For unknown platforms, use structural iCal properties

  // TRANSP:TRANSPARENT = typically used for "free" time / blocks
  try {
    const transp = event.component?.getFirstPropertyValue('transp')
    if (transp === 'TRANSPARENT') return true
  } catch {
    // ignore
  }

  // CLASS:CONFIDENTIAL or PRIVATE without guest data = likely block
  try {
    const eventClass = event.component?.getFirstPropertyValue('class')
    if (eventClass === 'CONFIDENTIAL' || eventClass === 'PRIVATE') {
      if (!description || description.length < 5) return true
    }
  } catch {
    // ignore
  }

  // Generic keywords for blocks
  for (const keyword of BLOCKED_KEYWORDS) {
    if (summary.includes(keyword) || description.includes(keyword)) {
      return true
    }
  }

  // Empty or very short summary = likely block
  if (!summary || summary.length < 2) return true

  // Numeric-only summary = likely block ID, not guest name
  if (/^\d+$/.test(summary)) return true

  // Default: treat as reservation (don't block without strong evidence)
  return false
}

export async function importICalFromUrl(url: string): Promise<ICalEvent[]> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Lodgra-Calendar-Sync/1.0',
        'Accept': 'text/calendar, text/plain, */*',
      },
    })
    if (!response.ok) {
      throw new Error(`Failed to fetch iCal: ${response.status} ${response.statusText}`)
    }

    const icalData = await response.text()

    // Verificar se o conteúdo é realmente iCal (não HTML de erro)
    if (!icalData.includes('BEGIN:VCALENDAR')) {
      throw new Error(`Response is not valid iCal (got ${icalData.substring(0, 100)}...)`)
    }
    const jcalData = ICAL.parse(icalData)
    const comp = new ICAL.Component(jcalData)
    const vevents = comp.getAllSubcomponents('vevent')

    // Detetar plataforma pelo PRODID ou URL
    const prodId = comp.getFirstPropertyValue('prodid') || ''
    const prodIdLower = typeof prodId === 'string' ? prodId.toLowerCase() : ''
    const urlLower = url.toLowerCase()

    // Detetar tipo de feed
    const isPlatformFeed = prodIdLower.includes('booking.com') ||
                           prodIdLower.includes('airbnb') ||
                           prodIdLower.includes('flatio') ||
                           urlLower.includes('booking.com') ||
                           urlLower.includes('airbnb.com') ||
                           urlLower.includes('airbnb.pt') ||
                           urlLower.includes('abnb.me') ||
                           urlLower.includes('flatio.com')

    // Airbnb distingue claramente reservas de bloqueios no próprio feed:
    //   "Reserved"               → reserva real de hóspede → importar
    //   "Airbnb (Not available)" → bloqueio do proprietário → ignorar
    // Booking.com e Flatio usam "CLOSED" tanto para reservas como para bloqueios,
    // por isso não filtramos esses feeds por keyword (usamos duração mais abaixo).
    const isAirbnbFeed = prodIdLower.includes('airbnb') ||
                         urlLower.includes('airbnb.com') ||
                         urlLower.includes('airbnb.pt') ||
                         urlLower.includes('abnb.me')

    const parsedEvents: ICalEvent[] = []
    let eventIndex = 0

    for (const vevent of vevents) {
      const event = new ICAL.Event(vevent)

      // Pular se não tiver datas
      if (!event.startDate || !event.endDate) continue

      // IMPORTANTE: NÃO filtrar bloqueios aqui!
      // O cron job (sync-ical/route.ts) decide se é bloqueio ou reserva
      // usando isBlockedEvent() e processa como calendar_blocks se necessário.
      // Se filtrarmos aqui, bloqueios do Booking/Airbnb serão perdidos.

      // UID com fallback robusto (inclui índice para evitar colisões)
      const uid = event.uid || `event-${Date.now()}-${eventIndex++}-${Math.random().toString(36).substring(2, 8)}`

      // Extrair datas como DATE (sem timezone) para evitar deslocamento de -1 dia
      // Quando o iCal usa VALUE=DATE (sem hora), toJSDate() converte para UTC
      // e pode perder um dia. Usamos os componentes da data diretamente.
      let startDate: Date
      let endDate: Date

      if (event.startDate.isDate) {
        // Usar Date.UTC para evitar deslocamento de timezone em servidores não-UTC
        startDate = new Date(Date.UTC(event.startDate.year, event.startDate.month - 1, event.startDate.day))
      } else {
        startDate = event.startDate.toJSDate()
      }

      if (event.endDate.isDate) {
        endDate = new Date(Date.UTC(event.endDate.year, event.endDate.month - 1, event.endDate.day))
      } else {
        endDate = event.endDate.toJSDate()
      }

      parsedEvents.push({
        uid,
        summary: event.summary || 'Reserva Importada',
        description: event.description,
        start: startDate,
        end: endDate,
        location: event.location,
      })
    }

    console.log(`[iCal] ${parsedEvents.length} evento(s) parseado(s) de ${vevents.length} vevent(s) (isPlatformFeed: ${isPlatformFeed}, url: ${url.substring(0, 60)}...)`)
    return parsedEvents
  } catch (error) {
    console.error('Erro ao importar iCal:', error)
    throw error instanceof Error ? error : new Error('Falha ao importar calendário iCal')
  }
}

export function generateICalFromReservations(reservations: { id: string; check_in: string; check_out: string; status: string; number_of_guests?: number | null; guests?: { first_name: string; last_name: string } | null; property_listings?: { properties?: { name?: string } | null } | null }[]): string {
  const comp = new ICAL.Component(['vcalendar', [], []])

  comp.updatePropertyWithValue('prodid', '-//Lodgra//Reservations//EN')
  comp.updatePropertyWithValue('version', '2.0')
  comp.updatePropertyWithValue('calscale', 'GREGORIAN')
  comp.updatePropertyWithValue('method', 'PUBLISH')
  comp.updatePropertyWithValue('x-wr-calname', 'Lodgra Reservations')
  comp.updatePropertyWithValue('x-wr-timezone', 'Europe/Lisbon')

  reservations.forEach(reservation => {
    // Validar datas
    if (!reservation.check_in || !reservation.check_out) {
      console.warn(`Reserva ${reservation.id} sem datas válidas`)
      return
    }

    const guestName = reservation.guests
      ? `${reservation.guests.first_name} ${reservation.guests.last_name}`
      : 'Hóspede'

    const propertyName = reservation.property_listings?.properties?.name || 'Propriedade'

    const vevent = new ICAL.Component('vevent')
    const event = new ICAL.Event(vevent)

    event.uid = `reservation-${reservation.id}@lodgra.com`
    event.summary = `${guestName} - ${propertyName}`
    event.description = `Reserva #${reservation.id}\nStatus: ${reservation.status}\nHóspedes: ${reservation.number_of_guests || 1}`

    try {
      // Datas como DATE (sem hora)
      // ICAL.Time.fromString espera formato YYYY-MM-DD
      const checkInStr = reservation.check_in.split('T')[0]
      const checkOutStr = reservation.check_out.split('T')[0]

      const startDate = ICAL.Time.fromDateString(checkInStr)
      event.startDate = startDate

      const endDate = ICAL.Time.fromDateString(checkOutStr)
      event.endDate = endDate

      comp.addSubcomponent(vevent)
    } catch (error) {
      console.error(`Erro ao processar datas da reserva ${reservation.id}:`, error)
    }
  })

  return comp.toString()
}

/**
 * Generate iCal from reservations AND blocks
 * Blocks are exported with TRANSP:TRANSPARENT so platforms (Airbnb, Booking)
 * recognize them as "Not available" and not as guest reservations
 */
export function generateICalWithBlocks(
  reservations: { id: string; check_in: string; check_out: string; status: string; number_of_guests?: number | null; guests?: { first_name: string; last_name: string } | null; property_listings?: { properties?: { name?: string } | null } | null }[],
  blocks: { id: string; start_date: string; end_date: string; notes?: string | null }[]
): string {
  const comp = new ICAL.Component(['vcalendar', [], []])

  comp.updatePropertyWithValue('prodid', '-//Lodgra//Reservations//EN')
  comp.updatePropertyWithValue('version', '2.0')
  comp.updatePropertyWithValue('calscale', 'GREGORIAN')
  comp.updatePropertyWithValue('method', 'PUBLISH')
  comp.updatePropertyWithValue('x-wr-calname', 'Lodgra Reservations')
  comp.updatePropertyWithValue('x-wr-timezone', 'Europe/Lisbon')

  // Add reservations
  reservations.forEach(reservation => {
    if (!reservation.check_in || !reservation.check_out) {
      console.warn(`Reserva ${reservation.id} sem datas válidas`)
      return
    }

    const guestName = reservation.guests
      ? `${reservation.guests.first_name} ${reservation.guests.last_name}`
      : 'Hóspede'

    const propertyName = reservation.property_listings?.properties?.name || 'Propriedade'

    const vevent = new ICAL.Component('vevent')
    const event = new ICAL.Event(vevent)

    event.uid = `reservation-${reservation.id}@lodgra.com`
    event.summary = `${guestName} - ${propertyName}`
    event.description = `Reserva #${reservation.id}\nStatus: ${reservation.status}\nHóspedes: ${reservation.number_of_guests || 1}`

    try {
      const checkInStr = reservation.check_in.split('T')[0]
      const checkOutStr = reservation.check_out.split('T')[0]

      const startDate = ICAL.Time.fromDateString(checkInStr)
      event.startDate = startDate

      const endDate = ICAL.Time.fromDateString(checkOutStr)
      event.endDate = endDate

      comp.addSubcomponent(vevent)
    } catch (error) {
      console.error(`Erro ao processar datas da reserva ${reservation.id}:`, error)
    }
  })

  // Add blocks as transparent events
  blocks.forEach(block => {
    if (!block.start_date || !block.end_date) {
      console.warn(`Bloqueio ${block.id} sem datas válidas`)
      return
    }

    const vevent = new ICAL.Component('vevent')
    const event = new ICAL.Event(vevent)

    event.uid = `block-${block.id}@lodgra.com`
    event.summary = 'Not available'
    event.description = block.notes || 'Data bloqueada'

    // Mark as transparent so platforms don't treat it as a guest reservation
    vevent.addPropertyWithValue('transp', 'TRANSPARENT')

    try {
      const startDate = ICAL.Time.fromDateString(block.start_date)
      event.startDate = startDate

      const endDate = ICAL.Time.fromDateString(block.end_date)
      event.endDate = endDate

      comp.addSubcomponent(vevent)
    } catch (error) {
      console.error(`Erro ao processar datas do bloqueio ${block.id}:`, error)
    }
  })

  return comp.toString()
}
