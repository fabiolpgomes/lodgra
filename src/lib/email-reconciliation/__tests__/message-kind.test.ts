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
  it.each(['A solicitação de Pierre-Luc Morasse foi confirmada', 'Reserva confirmada - Ana chega em 3 de out.', 'Reservation request from Ana accepted'])('accepts Airbnb confirmation %s', subject => {
    expect(reservationMessageKind(subject)).toBe('confirmation')
  })
  it.each(['Enviamos um pagamento de € 1.622,74 EUR', 'Booking.com: seu código de verificação é 3WGTGT', 'We sent you a payout', 'Escreva uma avaliação para Ana'])('discards %s as irrelevant', subject => {
    expect(reservationMessageKind(subject)).toBe('irrelevant')
  })
  it('treats a verification code as irrelevant even when it mentions a reservation', () => {
    expect(reservationMessageKind('Código de verificação para confirmar a sua reserva')).toBe('irrelevant')
  })
  it('does not interpret marketing or guest messages as confirmations', () => {
    expect(reservationMessageKind('Recebemos uma mensagem')).toBe('other')
  })
})
