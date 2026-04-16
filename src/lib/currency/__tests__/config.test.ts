/**
 * Tests for Currency Configuration
 */

import {
  getLocaleCurrency,
  getCurrencyByLocale,
  getCurrencySymbol,
  getSupportedCurrencies,
  isSupportedCurrency,
  CURRENCY_CONFIG,
} from '../config'
import type { Locale } from '@/i18n.config'

describe('Currency Configuration', () => {
  describe('getLocaleCurrency', () => {
    it('should map pt locale to EUR', () => {
      const result = getLocaleCurrency('pt' as Locale)
      expect(result).toBe('EUR')
    })

    it('should map pt-BR locale to BRL', () => {
      const result = getLocaleCurrency('pt-BR' as Locale)
      expect(result).toBe('BRL')
    })

    it('should map en-US locale to USD', () => {
      const result = getLocaleCurrency('en-US' as Locale)
      expect(result).toBe('USD')
    })

    it('should default to EUR for unknown locales', () => {
      const result = getLocaleCurrency('unknown' as Locale)
      expect(result).toBe('EUR')
    })
  })

  describe('getCurrencyByLocale', () => {
    it('should return correct currency for each locale', () => {
      expect(getCurrencyByLocale('pt' as Locale)).toBe('EUR')
      expect(getCurrencyByLocale('pt-BR' as Locale)).toBe('BRL')
      expect(getCurrencyByLocale('en-US' as Locale)).toBe('USD')
    })
  })

  describe('getCurrencySymbol', () => {
    it('should return € for EUR', () => {
      expect(getCurrencySymbol('EUR')).toBe('€')
    })

    it('should return R$ for BRL', () => {
      expect(getCurrencySymbol('BRL')).toBe('R$')
    })

    it('should return $ for USD', () => {
      expect(getCurrencySymbol('USD')).toBe('$')
    })

    it('should return default € for unknown currency', () => {
      expect(getCurrencySymbol('GBP' as unknown as 'EUR')).toBe('€')
    })
  })

  describe('getSupportedCurrencies', () => {
    it('should return array of all supported currencies', () => {
      const currencies = getSupportedCurrencies()
      expect(currencies).toContain('EUR')
      expect(currencies).toContain('BRL')
      expect(currencies).toContain('USD')
      expect(currencies.length).toBe(3)
    })
  })

  describe('isSupportedCurrency', () => {
    it('should return true for supported currencies', () => {
      expect(isSupportedCurrency('EUR')).toBe(true)
      expect(isSupportedCurrency('BRL')).toBe(true)
      expect(isSupportedCurrency('USD')).toBe(true)
    })

    it('should return false for unsupported currencies', () => {
      expect(isSupportedCurrency('GBP' as unknown as string)).toBe(false)
      expect(isSupportedCurrency('JPY' as unknown as string)).toBe(false)
      expect(isSupportedCurrency('invalid' as unknown as string)).toBe(false)
    })
  })

  describe('CURRENCY_CONFIG', () => {
    it('should have all required currency configs', () => {
      expect(CURRENCY_CONFIG.EUR).toBeDefined()
      expect(CURRENCY_CONFIG.BRL).toBeDefined()
      expect(CURRENCY_CONFIG.USD).toBeDefined()
    })

    it('should have correct EUR config', () => {
      const eur = CURRENCY_CONFIG.EUR
      expect(eur.code).toBe('EUR')
      expect(eur.symbol).toBe('€')
      expect(eur.name).toBe('Euro')
      expect(eur.locale).toBe('pt')
    })

    it('should have correct BRL config', () => {
      const brl = CURRENCY_CONFIG.BRL
      expect(brl.code).toBe('BRL')
      expect(brl.symbol).toBe('R$')
      expect(brl.name).toBe('Real Brasileiro')
      expect(brl.locale).toBe('pt-BR')
    })

    it('should have correct USD config', () => {
      const usd = CURRENCY_CONFIG.USD
      expect(usd.code).toBe('USD')
      expect(usd.symbol).toBe('$')
      expect(usd.name).toBe('Dólar Americano')
      expect(usd.locale).toBe('en-US')
    })
  })
})
