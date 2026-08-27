export type BookingLocale = 'pt-PT' | 'en-US' | 'es-ES'

// Standard baseline used by both the public checkout flow and the manual booking flow.
export const BOOKING_STANDARD_LOCALE: BookingLocale = 'pt-PT'
export const BOOKING_STANDARD_VERSION = 'booking-contact-standard-v1'

export const BOOKING_LOCALE_OPTIONS: Array<{ value: BookingLocale; label: string }> = [
  { value: 'pt-PT', label: 'Português (Portugal)' },
  { value: 'en-US', label: 'English' },
  { value: 'es-ES', label: 'Español' },
]

export interface BookingEmailCopy {
  previewText: string
  greeting: string
  intro: string
  reservationLabel: string
  nightsLabel: string
  guestsLabel: string
  propertyLabel: string
  checkInLabel: string
  checkOutLabel: string
  totalPriceLabel: string
  ctaLabel: string
  supportText: string
  rightsText: string
  unsubscribeText: string
}

const BOOKING_EMAIL_COPY: Record<BookingLocale, BookingEmailCopy> = {
  'pt-PT': {
    previewText: 'Confirmação da sua reserva',
    greeting: 'Olá',
    intro: 'A sua reserva foi confirmada. Abaixo encontra os detalhes mais importantes.',
    reservationLabel: 'Reserva',
    nightsLabel: 'Noites',
    guestsLabel: 'Hóspedes',
    propertyLabel: 'Propriedade',
    checkInLabel: 'Check-in',
    checkOutLabel: 'Check-out',
    totalPriceLabel: 'Preço total',
    ctaLabel: 'Ver a reserva',
    supportText: 'Se tiver alguma dúvida, contacte-nos através de',
    rightsText: 'Todos os direitos reservados.',
    unsubscribeText: 'Cancelar subscrição',
  },
  'en-US': {
    previewText: 'Your booking confirmation',
    greeting: 'Hello',
    intro: 'Your booking has been confirmed. Here are the most important details.',
    reservationLabel: 'Reservation',
    nightsLabel: 'Nights',
    guestsLabel: 'Guests',
    propertyLabel: 'Property',
    checkInLabel: 'Check-in',
    checkOutLabel: 'Check-out',
    totalPriceLabel: 'Total price',
    ctaLabel: 'View booking',
    supportText: 'If you have any questions, contact us at',
    rightsText: 'All rights reserved.',
    unsubscribeText: 'Unsubscribe',
  },
  'es-ES': {
    previewText: 'Confirmación de tu reserva',
    greeting: 'Hola',
    intro: 'Tu reserva ha sido confirmada. Aquí tienes los detalles más importantes.',
    reservationLabel: 'Reserva',
    nightsLabel: 'Noches',
    guestsLabel: 'Huéspedes',
    propertyLabel: 'Propiedad',
    checkInLabel: 'Check-in',
    checkOutLabel: 'Check-out',
    totalPriceLabel: 'Precio total',
    ctaLabel: 'Ver reserva',
    supportText: 'Si tienes alguna pregunta, contáctanos en',
    rightsText: 'Todos los derechos reservados.',
    unsubscribeText: 'Darse de baja',
  },
}

export function normalizeBookingLocale(locale?: string | null): BookingLocale {
  const value = (locale || '').trim().toLowerCase()

  if (value.startsWith('en')) return 'en-US'
  if (value.startsWith('es')) return 'es-ES'
  if (value.startsWith('pt')) return 'pt-PT'

  return BOOKING_STANDARD_LOCALE
}

export function getBookingEmailCopy(locale?: string | null): BookingEmailCopy {
  return BOOKING_EMAIL_COPY[normalizeBookingLocale(locale)]
}

export function getBookingConfirmationSubject(organizationName: string, locale?: string | null): string {
  const resolvedLocale = normalizeBookingLocale(locale)
  const baseSubject =
    resolvedLocale === 'en-US'
      ? 'Booking confirmation'
      : resolvedLocale === 'es-ES'
        ? 'Confirmación de reserva'
        : 'Confirmação de reserva'

  return `${baseSubject} — ${organizationName}`
}

export function formatBookingDate(date: string, locale?: string | null): string {
  const resolvedLocale = normalizeBookingLocale(locale)
  return new Intl.DateTimeFormat(resolvedLocale, { dateStyle: 'long' }).format(new Date(date))
}
