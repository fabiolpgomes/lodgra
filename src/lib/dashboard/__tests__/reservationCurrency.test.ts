import { resolveReservationCurrency } from '../reservationCurrency'

describe('resolveReservationCurrency', () => {
  const propertyCurrencies = { portugal: 'EUR', brasil: 'BRL' }

  it('prioriza a moeda explícita da reserva', () => {
    expect(resolveReservationCurrency(
      { currency: 'brl', propertyId: 'portugal' },
      propertyCurrencies,
      'EUR'
    )).toBe('BRL')
  })

  it('usa a moeda da propriedade quando a reserva não informa moeda', () => {
    expect(resolveReservationCurrency(
      { currency: null, propertyId: 'brasil' },
      propertyCurrencies,
      'EUR'
    )).toBe('BRL')
  })

  it('usa a moeda da organização e retorna null quando não há contexto', () => {
    expect(resolveReservationCurrency({}, propertyCurrencies, 'BRL')).toBe('BRL')
    expect(resolveReservationCurrency({}, propertyCurrencies)).toBeNull()
  })
})
