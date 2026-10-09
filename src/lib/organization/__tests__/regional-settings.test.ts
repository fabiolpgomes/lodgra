import {
  ORGANIZATION_TIME_ZONES,
  isOrganizationCurrency,
  isOrganizationTimeZone,
  regionalDefaultsForBillingCurrency,
} from '../regional-settings'

describe('regionalDefaultsForBillingCurrency', () => {
  it('BRL → São Paulo/BRL, em qualquer capitalização', () => {
    expect(regionalDefaultsForBillingCurrency('brl')).toEqual({ timezone: 'America/Sao_Paulo', currency: 'BRL' })
    expect(regionalDefaultsForBillingCurrency('BRL')).toEqual({ timezone: 'America/Sao_Paulo', currency: 'BRL' })
  })

  it.each(['eur', 'EUR', null, undefined, 'usd'])('%s → Lisboa/EUR', value => {
    expect(regionalDefaultsForBillingCurrency(value)).toEqual({ timezone: 'Europe/Lisbon', currency: 'EUR' })
  })
})

describe('validação de fuso e moeda', () => {
  it('todos os fusos da lista são IANA válidos neste runtime', () => {
    for (const zone of ORGANIZATION_TIME_ZONES) {
      expect(() => new Intl.DateTimeFormat('en', { timeZone: zone.value })).not.toThrow()
    }
  })

  it('aceita só valores da lista', () => {
    expect(isOrganizationTimeZone('Europe/Madrid')).toBe(true)
    expect(isOrganizationTimeZone('Mars/Olympus')).toBe(false)
    expect(isOrganizationTimeZone('europe/lisbon')).toBe(false)
    expect(isOrganizationTimeZone(undefined)).toBe(false)
    expect(isOrganizationCurrency('BRL')).toBe(true)
    expect(isOrganizationCurrency('USD')).toBe(false)
    expect(isOrganizationCurrency('brl')).toBe(false)
  })
})
