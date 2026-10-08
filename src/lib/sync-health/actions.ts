/**
 * Sync health as a short list of things the tenant must do. Pure: the API route loads rows, this
 * module decides status, wording and destinations so the panel, the bell and the e-mail digest agree.
 */

export type SyncSeverity = 'stopped' | 'attention'
export type SyncActionKind =
  | 'gmail_disconnected' | 'gmail_stale' | 'queue_stalled' | 'calendar_failing'
  | 'complete_guest' | 'ical_reservation_without_email' | 'message_review'

export interface SyncAction {
  /** Stable per problem: used for dismissals and to send each alert once. */
  key: string
  kind: SyncActionKind
  severity: SyncSeverity
  title: string
  detail: string
  platform: string | null
  property: { id: string; name: string | null } | null
  reservationId: string | null
  since: string | null
  href: string | null
  external: boolean
  cta: string
  /** Opens the inline completion drawer instead of navigating. */
  completable: boolean
}

export interface SyncHealthInput {
  locale: string
  now: Date
  reconciliationEnabled: boolean
  gmail: { email: string; last_sync_at: string | null } | null
  oldestQueuedAt: string | null
  failingListings: Array<{ id: string; property_id: string; property_name: string | null; platform: string | null; last_sync_error: string | null; last_synced_at: string | null }>
  placeholderReservations: Array<{ id: string; property_id: string; property_name: string | null; source: string | null; booking_reference: string | null; check_in: string; check_out: string; created_at: string | null }>
  unlinkedReservationEvents: Array<{ id: string; property_id: string; property_name: string | null; source_platform: string; check_in: string; check_out: string; created_at: string }>
  reviewMessages: Array<{ id: string; subject: string | null; sender: string; received_at: string; provider_message_id: string; recipient: string; last_error: string | null }>
  recentPlatformReservations: Array<{ first_name: string | null; guest_name: string | null; total_amount: number | null }>
  dismissedKeys: Set<string>
}

export interface SyncHealth {
  status: 'ok' | 'attention' | 'stopped'
  actions: SyncAction[]
  trust: { windowDays: number; total: number; complete: number; percent: number | null }
}

const HOUR = 3_600_000
export const GMAIL_STALE_HOURS = 2
export const QUEUE_STALL_MINUTES = 45
export const UNLINKED_EVENT_HOURS = 24
export const PLACEHOLDER_GUEST = 'Hóspede'

const PLATFORM_LABEL: Record<string, string> = { airbnb: 'Airbnb', booking: 'Booking', vrbo: 'Vrbo', flatio: 'Flatio' }
const platformLabel = (value: string | null) => value ? PLATFORM_LABEL[value.toLowerCase()] ?? value : null
const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

/** "3–7 out", "28 out – 3 nov", "28 dez 2026 – 3 jan 2027". */
export function formatStay(checkIn: string, checkOut: string): string {
  const [y1, m1, d1] = checkIn.split('-').map(Number)
  const [y2, m2, d2] = checkOut.split('-').map(Number)
  if (y1 !== y2) return `${d1} ${MONTHS[m1 - 1]} ${y1} – ${d2} ${MONTHS[m2 - 1]} ${y2}`
  if (m1 === m2) return `${d1}–${d2} ${MONTHS[m1 - 1]}`
  return `${d1} ${MONTHS[m1 - 1]} – ${d2} ${MONTHS[m2 - 1]}`
}

const propertyLabel = (name: string | null) => name?.trim() || 'imóvel não identificado'
const join = (...parts: Array<string | null | undefined>) => parts.filter(Boolean).join(' · ')

function gmailLink(providerMessageId: string, mailbox: string): string | null {
  const id = providerMessageId.split(':').pop()
  return id && /^[0-9a-f]+$/i.test(id)
    ? `https://mail.google.com/mail/?authuser=${encodeURIComponent(mailbox)}#all/${id}`
    : null
}

export function isPlaceholderGuest(firstName: string | null, guestName: string | null): boolean {
  return firstName?.trim() === PLACEHOLDER_GUEST || guestName?.trim() === PLACEHOLDER_GUEST || !guestName?.trim()
}

export function buildSyncHealth(input: SyncHealthInput): SyncHealth {
  const { locale, now } = input
  const actions: SyncAction[] = []
  const base = { platform: null, property: null, reservationId: null, external: false, completable: false }

  if (input.reconciliationEnabled && !input.gmail) {
    actions.push({ ...base, key: 'gmail:disconnected', kind: 'gmail_disconnected', severity: 'stopped',
      title: 'Gmail não está ligado',
      detail: 'Sem o Gmail, as reservas chegam sem nome, valor e nº de hóspedes.',
      since: null, href: `/${locale}/settings#email`, cta: 'Ligar Gmail' })
  } else if (input.gmail && (!input.gmail.last_sync_at || now.getTime() - Date.parse(input.gmail.last_sync_at) > GMAIL_STALE_HOURS * HOUR)) {
    actions.push({ ...base, key: `gmail:stale:${input.gmail.email}`, kind: 'gmail_stale', severity: 'stopped',
      title: `Gmail sem leitura desde ${input.gmail.last_sync_at ? new Date(input.gmail.last_sync_at).toLocaleString('pt-PT') : 'a ligação'}`,
      detail: `${input.gmail.email} · normalmente basta voltar a ligar a conta.`,
      since: input.gmail.last_sync_at, href: `/${locale}/settings#email`, cta: 'Voltar a ligar' })
  }

  if (input.oldestQueuedAt && now.getTime() - Date.parse(input.oldestQueuedAt) > QUEUE_STALL_MINUTES * 60_000) {
    actions.push({ ...base, key: 'queue:stalled', kind: 'queue_stalled', severity: 'stopped',
      title: 'Os e-mails de reservas não estão a ser processados',
      detail: 'Há mensagens à espera há mais de 45 minutos. Tente "Sincronizar agora"; se persistir, contacte o suporte.',
      since: input.oldestQueuedAt, href: null, cta: 'Sincronizar agora' })
  }

  for (const listing of input.failingListings) {
    const platform = platformLabel(listing.platform)
    actions.push({ ...base, key: `calendar:${listing.id}`, kind: 'calendar_failing', severity: 'stopped',
      platform, property: { id: listing.property_id, name: listing.property_name },
      title: join(`Calendário ${platform ?? 'iCal'} a falhar`, propertyLabel(listing.property_name)),
      detail: listing.last_synced_at
        ? `Última leitura certa em ${new Date(listing.last_synced_at).toLocaleString('pt-PT')}. Confirme o link do calendário na plataforma.`
        : 'Ainda não foi lido com sucesso. Confirme o link do calendário na plataforma.',
      since: listing.last_synced_at, href: `/${locale}/properties/${listing.property_id}/edit`, cta: 'Corrigir link' })
  }

  for (const reservation of input.placeholderReservations) {
    const platform = platformLabel(reservation.source)
    actions.push({ ...base, key: `guest:${reservation.id}`, kind: 'complete_guest', severity: 'attention',
      platform, property: { id: reservation.property_id, name: reservation.property_name }, reservationId: reservation.id,
      title: join(platform && reservation.booking_reference ? `${platform} ${reservation.booking_reference}` : platform, propertyLabel(reservation.property_name), formatStay(reservation.check_in, reservation.check_out)),
      detail: 'Falta o nome do hóspede (a plataforma não o enviou). Copie-o da reserva na plataforma.',
      since: reservation.created_at, href: `/${locale}/reservations/${reservation.id}/edit`, cta: 'Completar', completable: true })
  }

  for (const event of input.unlinkedReservationEvents) {
    if (now.getTime() - Date.parse(event.created_at) < UNLINKED_EVENT_HOURS * HOUR) continue
    const platform = platformLabel(event.source_platform)
    actions.push({ ...base, key: `event:${event.id}`, kind: 'ical_reservation_without_email', severity: 'attention',
      platform, property: { id: event.property_id, name: event.property_name },
      title: join(`Reserva ${platform ?? ''}`.trim(), propertyLabel(event.property_name), formatStay(event.check_in, event.check_out)),
      detail: `O calendário indica uma reserva, mas o e-mail de confirmação não chegou há mais de ${UNLINKED_EVENT_HOURS} h.`,
      since: event.created_at, href: `/${locale}/properties/${event.property_id}`, cta: 'Ver reserva' })
  }

  for (const message of input.reviewMessages) {
    const link = gmailLink(message.provider_message_id, message.recipient)
    const change = message.last_error === 'RESERVATION_CHANGE_REQUIRES_REVIEW'
    actions.push({ ...base, key: `message:${message.id}`, kind: 'message_review', severity: 'attention',
      platform: platformLabel(platformFromSender(message.sender)),
      title: join(platformLabel(platformFromSender(message.sender)), `“${message.subject?.trim() || 'Sem assunto'}”`),
      detail: change
        ? 'Alteração ou cancelamento: confirme na plataforma e ajuste a reserva no Lodgra.'
        : message.last_error === 'Required reservation fields are missing'
          ? 'O e-mail não trazia todos os dados da reserva.'
          : 'Mensagem da plataforma que pede a sua atenção.',
      since: message.received_at, href: link, external: Boolean(link), cta: link ? 'Abrir no Gmail' : 'Ver detalhes' })
  }

  const visible = actions.filter(action => !input.dismissedKeys.has(action.key))
  const order = (action: SyncAction) => action.severity === 'stopped' ? 0 : 1
  visible.sort((a, b) => order(a) - order(b) || (a.since ?? '').localeCompare(b.since ?? ''))

  const total = input.recentPlatformReservations.length
  const complete = input.recentPlatformReservations
    .filter(row => !isPlaceholderGuest(row.first_name, row.guest_name) && row.total_amount !== null).length

  return {
    status: visible.some(action => action.severity === 'stopped') ? 'stopped' : visible.length ? 'attention' : 'ok',
    actions: visible,
    trust: { windowDays: 30, total, complete, percent: total ? Math.round((complete / total) * 100) : null },
  }
}

function platformFromSender(sender: string): string | null {
  const match = /@(?:[\w-]+\.)*(airbnb|booking|vrbo|flatio)\.[a-z.]+>?$/i.exec(sender.trim())
  return match ? match[1].toLowerCase() : null
}
