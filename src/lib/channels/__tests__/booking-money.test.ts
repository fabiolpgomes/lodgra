import { normalizeBookingMoney } from '../booking-money'

describe('normalizeBookingMoney', () => {
  it('converte centavos de EUR e BRL em unidades monetárias', () => {
    expect(normalizeBookingMoney(147937, 'eur')).toEqual({ amount: 1479.37, currency: 'EUR' })
    expect(normalizeBookingMoney(825450, 'BRL')).toEqual({ amount: 8254.5, currency: 'BRL' })
  })

  it('respeita moedas ISO sem duas casas decimais', () => {
    expect(normalizeBookingMoney(1500, 'JPY')).toEqual({ amount: 1500, currency: 'JPY' })
    expect(normalizeBookingMoney(12345, 'KWD')).toEqual({ amount: 12.345, currency: 'KWD' })
  })

  it('rejeita valores inválidos', () => {
    expect(() => normalizeBookingMoney(-1, 'EUR')).toThrow('Invalid Booking monetary value')
    expect(() => normalizeBookingMoney(10.5, 'EUR')).toThrow('Invalid Booking monetary value')
    expect(() => normalizeBookingMoney(100, '')).toThrow('Invalid Booking monetary value')
  })
})
