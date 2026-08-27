import { formatCurrency, getCurrencyName, getCurrencySymbol, groupByCurrency } from '../currency'

describe('currency utils', () => {
  describe('formatCurrency', () => {
    it('formats supported currencies normally', () => {
      expect(formatCurrency(1234.5, 'EUR')).toContain('€')
      expect(formatCurrency(1234.5, 'BRL')).toContain('R$')
    })

    it('returns plain decimals when currency is missing', () => {
      expect(formatCurrency(1234.5, null)).toBe('1234.50')
      expect(formatCurrency(1234.5, undefined)).toBe('1234.50')
    })

    it('does not crash on an unknown currency code', () => {
      expect(formatCurrency(1234.5, 'XYZ' as never)).toBe('XYZ 1234.50')
    })
  })

  describe('getCurrencySymbol', () => {
    it('returns an empty string when currency is missing', () => {
      expect(getCurrencySymbol()).toBe('')
      expect(getCurrencySymbol(null)).toBe('')
    })
  })

  describe('getCurrencyName', () => {
    it('returns an empty string when currency is missing', () => {
      expect(getCurrencyName()).toBe('')
      expect(getCurrencyName(null)).toBe('')
    })
  })

  describe('groupByCurrency', () => {
    it('ignores items without currency instead of inventing one', () => {
      expect(
        groupByCurrency([
          { currency: 'EUR', amount: 10 },
          { currency: null, amount: 20 },
          { amount: 30 },
        ])
      ).toEqual({ EUR: 10 })
    })
  })
})
