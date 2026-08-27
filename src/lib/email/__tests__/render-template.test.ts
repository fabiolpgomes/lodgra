jest.mock('mjml', () => ({
  __esModule: true,
  default: jest.fn(async (input: string) => ({ html: input, errors: [] })),
}))

import { renderEmailTemplate } from '../render-template'
import { BOOKING_STANDARD_VERSION, getBookingConfirmationSubject, getBookingEmailCopy } from '../booking-locale'

describe('renderEmailTemplate', () => {
  it('renders branded email HTML with escaped booking details', async () => {
    const copy = getBookingEmailCopy('pt-PT')
    const html = await renderEmailTemplate({
      subject: getBookingConfirmationSubject('Pousada Sol', 'pt-PT'),
      organizationName: 'Pousada Sol',
      customerName: 'Fabio',
      reservationNumber: 'AHS-TEST-001',
      nights: '3',
      guestCount: '2',
      propertyName: 'Suite Premium & Spa <Sea View>',
      checkInDate: '27 de agosto de 2026',
      checkOutDate: '30 de agosto de 2026',
      totalPrice: '1250.00',
      currency: 'EUR',
      bookingUrl: 'https://pousada-sol.lodgra.io/bookings/abc123',
      unsubscribeUrl: 'https://lodgra.io/unsubscribe?token=test-token',
      templateVersion: BOOKING_STANDARD_VERSION,
      logoUrl: 'https://cdn.example/logo.png',
      primaryColor: '#1E40AF',
      replyToEmail: 'support@pousada-sol.com',
      footerText: 'Obrigado por reservar connosco.',
      confirmationMessage: 'Bem-vindo ao nosso alojamento premium.',
      year: '2026',
      copy,
    })

    expect(html).toContain('Pousada Sol')
    expect(html).toContain('https://cdn.example/logo.png')
    expect(html).toContain('AHS-TEST-001')
    expect(html).toContain('3')
    expect(html).toContain('Suite Premium &amp; Spa &lt;Sea View&gt;')
    expect(html).toContain('EUR 1250.00')
    expect(html).toContain('https://lodgra.io/unsubscribe?token&#x3D;test-token')
  })
})
