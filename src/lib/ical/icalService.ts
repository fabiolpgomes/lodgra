import ICAL from 'ical.js'
import { extractBookingReservationIdFromUid, parseBookingDescription } from './bookingParser'

export interface ICalEvent {
  uid: string
  summary: string
  description?: string
  start: Date
  end: Date
  location?: string
  rawVEvent: string
}

export type ICalEventClassification = 'reservation' | 'block' | 'unknown'

function hasBlockedKeyword(text: string): boolean {
  const normalized = text.toLowerCase()
  return BLOCKED_KEYWORDS.some(keyword => normalized.includes(keyword))
}

function detectPlatform(uid?: string, summary?: string, description?: string): 'booking' | 'airbnb' | 'flatio' | 'vrbo' | 'unknown' {
  const text = `${uid || ''} ${summary || ''} ${description || ''}`.toLowerCase()
  if (text.includes('@booking.com') || text.includes('booking.com')) return 'booking'
  if (text.includes('@airbnb.com') || text.includes('airbnb')) return 'airbnb'
  if (text.includes('@flatio.com') || text.includes('flatio')) return 'flatio'
  if (text.includes('vrbo') || text.includes('expedia')) return 'vrbo'
  return 'unknown'
}

function looksLikeGuestName(summary: string): boolean {
  if (!summary || summary.length < 3) return false
  if (hasBlockedKeyword(summary)) return false
  if (/^\d+$/.test(summary)) return false
  if (/^(closed|reserved|not available|airbnb|booking|flatio|vrbo)$/i.test(summary.trim())) return false
  return summary.trim().split(/\s+/).length >= 2
}

export function classifyICalEvent(event: {
  summary?: string
  description?: string
  uid?: string
  component?: { getFirstPropertyValue: (prop: string) => unknown }
}): ICalEventClassification {
  const uid = (event.uid || '').toLowerCase()
  const summary = (event.summary || '').toLowerCase().trim()
  const description = (event.description || '').toLowerCase().trim()
  const platform = detectPlatform(uid, summary, description)

  try {
    const transp = event.component?.getFirstPropertyValue('transp')
    if (transp === 'TRANSPARENT') return 'block'
  } catch {
    // ignore component lookup issues
  }

  const genericBlock = hasBlockedKeyword(summary) || hasBlockedKeyword(description)

  if (platform === 'booking') {
    const bookingData = parseBookingDescription(description)
    const bookingUidId = extractBookingReservationIdFromUid(uid)
    if (bookingData.bookingId || bookingUidId) return 'reservation'
    if (summary === 'reserved' || summary === 'reservado') return 'reservation'
    if (genericBlock || summary === 'closed - not available' || description === 'booking') return 'block'
    return 'unknown'
  }

  if (platform === 'airbnb') {
    if (summary === 'reserved' || looksLikeGuestName(summary)) return 'reservation'
    if (genericBlock || summary.includes('not available') || description === 'airbnb') return 'block'
    return 'unknown'
  }

  if (platform === 'flatio') {
    if (/(booking\s*id|guest|phone|country)/i.test(description) || looksLikeGuestName(summary)) {
      return 'reservation'
    }
    if (genericBlock || !description || description === 'flatio') return 'block'
    return 'unknown'
  }

  if (platform === 'vrbo') {
    if (summary === 'reserved' || /(booking\s*id|guest|phone|country)/i.test(description) || looksLikeGuestName(summary)) {
      return 'reservation'
    }
    if (genericBlock || summary.includes('not available')) return 'block'
    return 'unknown'
  }

  if (genericBlock) return 'block'
  if (summary === 'reserved' || looksLikeGuestName(summary)) return 'reservation'
  return 'unknown'
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
  return classifyICalEvent(event) === 'block'
}

/** Reject truncated/concatenated calendars before their omissions can drive cleanup. */
function validateCalendarEnvelope(data: string): void {
  const lines = data.replace(/\r?\n[ \t]/g, '').split(/\r?\n/)
  if (lines[0]?.toUpperCase() !== 'BEGIN:VCALENDAR' || lines.at(-1)?.toUpperCase() !== 'END:VCALENDAR') {
    throw new Error('Response is not valid iCal: incomplete calendar')
  }
  const stack: string[] = []
  for (const line of lines) {
    const boundary = /^(BEGIN|END):([A-Z0-9-]+)$/i.exec(line)
    if (!boundary) continue
    const [, operation, rawName] = boundary
    const name = rawName.toUpperCase()
    if (operation.toUpperCase() === 'BEGIN') {
      if (name === 'VCALENDAR' && stack.length > 0) throw new Error('Nested iCal calendar is unsupported')
      if (stack.length === 0 && name !== 'VCALENDAR') throw new Error('Invalid iCal component outside calendar')
      stack.push(name)
    } else if (stack.pop() !== name) {
      throw new Error('iCal calendar has unbalanced component boundaries')
    }
  }
  if (stack.length !== 0 || lines.filter(line => line.toUpperCase() === 'BEGIN:VCALENDAR').length !== 1) {
    throw new Error('Response must contain exactly one complete iCal calendar')
  }
}

/** Check raw jCal values before ICAL.Time silently normalizes impossible dates. */
function validateEventDate(component: ICAL.Component, name: 'dtstart' | 'dtend'): void {
  const properties = component.getAllProperties(name)
  if (properties.length !== 1) throw new Error(`iCal event requires exactly one ${name}`)
  const property = properties[0].toJSON() as unknown[]
  const type = property[2]
  const value = property[3]
  if (property.length !== 4 || typeof value !== 'string' || (type !== 'date' && type !== 'date-time')) {
    throw new Error(`iCal event has an invalid ${name}`)
  }
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}):(\d{2})(Z)?)?$/.exec(value)
  if (!match || (type === 'date') !== (match[4] === undefined)) {
    throw new Error(`iCal event has an invalid ${name}`)
  }
  const [, yearText, monthText, dayText, hourText, minuteText, secondText] = match
  const year = Number(yearText), month = Number(monthText), day = Number(dayText)
  const hour = Number(hourText ?? 0), minute = Number(minuteText ?? 0), second = Number(secondText ?? 0)
  const checked = new Date(0)
  checked.setUTCFullYear(year, month - 1, day)
  checked.setUTCHours(hour, minute, second, 0)
  if (year < 1 || checked.getUTCFullYear() !== year || checked.getUTCMonth() !== month - 1 ||
      checked.getUTCDate() !== day || checked.getUTCHours() !== hour ||
      checked.getUTCMinutes() !== minute || checked.getUTCSeconds() !== second) {
    throw new Error(`iCal event has an impossible ${name}`)
  }
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

    const icalData = (await response.text()).replace(/^\uFEFF/, '').trim()
    validateCalendarEnvelope(icalData)
    const jcalData = ICAL.parse(icalData)
    const comp = new ICAL.Component(jcalData)
    const vevents = comp.getAllSubcomponents('vevent')

    const parsedEvents: ICalEvent[] = []
    const receivedUids = new Set<string>()

    for (const vevent of vevents) {
      if (['rrule', 'rdate', 'exdate', 'exrule', 'recurrence-id'].some(name => vevent.hasProperty(name))) {
        throw new Error('Recurring iCal events require expansion before availability synchronization')
      }
      validateEventDate(vevent, 'dtstart')
      validateEventDate(vevent, 'dtend')
      const event = new ICAL.Event(vevent)
      if (vevent.getAllProperties('uid').length !== 1 || typeof event.uid !== 'string' || !event.uid.trim()) {
        throw new Error('iCal event requires one stable UID')
      }
      const uid = event.uid
      if (receivedUids.has(uid)) throw new Error('Duplicate iCal event UID is unsupported')
      receivedUids.add(uid)

      // IMPORTANTE: NÃO filtrar bloqueios aqui!
      // O cron job (sync-ical/route.ts) decide se é bloqueio ou reserva
      // usando isBlockedEvent() e processa como calendar_blocks se necessário.
      // Se filtrarmos aqui, bloqueios do Booking/Airbnb serão perdidos.

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

      if (!Number.isFinite(startDate.getTime()) || !Number.isFinite(endDate.getTime()) || endDate <= startDate) {
        throw new Error('iCal event end must be after its valid start')
      }

      parsedEvents.push({
        uid,
        summary: event.summary || 'Reserva Importada',
        description: event.description,
        start: startDate,
        end: endDate,
        location: event.location,
        rawVEvent: vevent.toString(),
      })
    }

    console.log(`[iCal] ${parsedEvents.length} evento(s) validado(s) de ${vevents.length} vevent(s)`)
    return parsedEvents
  } catch (error) {
    console.error('Erro ao importar iCal:', error)
    throw error instanceof Error ? error : new Error('Falha ao importar calendário iCal')
  }
}

export function generateICalFromReservations(reservations: { id: string; check_in: string; check_out: string; status: string; number_of_guests?: number | null; guests?: { first_name: string; last_name: string } | null; properties?: { name?: string } | null; property_listings?: { properties?: { name?: string } | null } | null }[]): string {
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

    const propertyName = reservation.properties?.name || reservation.property_listings?.properties?.name || 'Propriedade'

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
  reservations: { id: string; check_in: string; check_out: string; status: string; number_of_guests?: number | null; guests?: { first_name: string; last_name: string } | null; properties?: { name?: string } | null; property_listings?: { properties?: { name?: string } | null } | null }[],
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

    const propertyName = reservation.properties?.name || reservation.property_listings?.properties?.name || 'Propriedade'

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
