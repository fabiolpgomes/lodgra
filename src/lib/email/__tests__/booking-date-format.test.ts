import { formatBookingDate } from '../booking-locale'

describe('formatBookingDate (data de reserva é um dia de calendário)', () => {
  it('mostra o dia guardado, em qualquer fuso do servidor', () => {
    expect(formatBookingDate('2026-05-25', 'pt-BR')).toContain('25')
    expect(formatBookingDate('2026-05-25', 'pt-PT')).toContain('25')
    expect(formatBookingDate('2026-01-01', 'es-ES')).toContain('1')
    expect(formatBookingDate('2026-01-01', 'pt-BR')).toContain('2026')
  })
})
