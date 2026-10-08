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
  it.each(['Enviamos um pagamento de € 1.622,74 EUR', 'Booking.com: seu código de verificação é 3WGTGT', 'We sent you a payout', 'Escreva uma avaliação para Ana', 'Destination Belo Horizonte? ‍✈️ Finish your flight booking', 'Ofertas Genius para a sua próxima viagem'])('discards %s as irrelevant', subject => {
    expect(reservationMessageKind(subject)).toBe('irrelevant')
  })
  it.each([
    'Mensagem do Atendimento ao Cliente do Airbnb',
    'Responda agora a uma pesquisa que leva cerca de 10 minutos',
    'Acesso exclusivo ao nosso assistente de IA de gestão de disponibilidade',
    'Algarving mencionou você em uma publicação',
    'Tem uma nova mensagem de um inquilino!',
    'Você acabou de receber uma nova pergunta sobre a sua propriedade',
    'Novas ferramentas para ajudar a simplificar sua rotina como anfitrião',
    'Booking.com Monthly Financial Report',
    'Informações úteis sobre "AHS - T1 em Armação de Pêra | Piscina + Garagem"',
    'Mensagem programada não enviada',
    'RE: Reserva para AHS - Casa do Moinho Refúgio na Natureza em Loulé, 11 – 19 de out.',
    'RE: Reserva confirmada - Ana chega em 3 de out.',
  ])('discards notice %s', subject => {
    expect(reservationMessageKind(subject)).toBe('irrelevant')
  })
  it('keeps action-required notices for human review', () => {
    expect(reservationMessageKind('Booking.com - Sua atenção é necessária: ilayda atamer (6533496743)')).toBe('other')
  })
  it('treats a verification code as irrelevant even when it mentions a reservation', () => {
    expect(reservationMessageKind('Código de verificação para confirmar a sua reserva')).toBe('irrelevant')
  })
  it('does not interpret marketing or guest messages as confirmations', () => {
    expect(reservationMessageKind('Recebemos uma mensagem')).toBe('other')
  })
})
