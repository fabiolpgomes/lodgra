import { reservationMessageKind } from '../message-kind'
import { platformFromSender } from '../inbound'

describe('Trusted reservation confirmations', () => {
  it.each(['Booking.com - Nova reserva! (123)', 'Reservation confirmed - Airbnb', 'Flatio - Booking confirmation'])('accepts %s', subject => {
    expect(reservationMessageKind(subject)).toBe('confirmation')
  })
  it.each(['Your reservation was cancelled', 'Reserva confirmada: alteração de datas', 'Booking refund', 'Reservation updated'])('never treats %s as a creation', subject => {
    expect(reservationMessageKind(subject)).toBe('change')
  })
  it('does not trust guest supplied Booking messages or forged domains', () => {
    expect(platformFromSender('guest@guest.booking.com')).toBeNull()
    expect(platformFromSender('noreply@booking.com.attacker.test')).toBeNull()
    expect(platformFromSender('noreply@flatio.com')).toBe('flatio')
  })
  it('does not interpret marketing or guest messages as confirmations', () => {
    expect(reservationMessageKind('Recebemos uma mensagem')).toBe('other')
  })
})
