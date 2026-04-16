import { t, formatMinimumStayError, formatMinimumStayValidation, detectLocale } from '../messages'

describe('i18n - Messages', () => {
  describe('formatMinimumStayError', () => {
    it('should format error message for Portuguese (PT)', () => {
      const result = formatMinimumStayError(5, 'pt')
      expect(result).toBe('Estadia mínima de 5 noites')
    })

    it('should format error message for Brazilian Portuguese (PT-BR)', () => {
      const result = formatMinimumStayError(5, 'pt-BR')
      expect(result).toBe('Estada mínima de 5 noites')
    })

    it('should pluralize correctly for 1 night (PT)', () => {
      const result = formatMinimumStayError(1, 'pt')
      expect(result).toBe('Estadia mínima de 1 noite')
    })

    it('should pluralize correctly for 1 night (PT-BR)', () => {
      const result = formatMinimumStayError(1, 'pt-BR')
      expect(result).toBe('Estada mínima de 1 noite')
    })

    it('should pluralize correctly for multiple nights (PT)', () => {
      const result = formatMinimumStayError(3, 'pt')
      expect(result).toBe('Estadia mínima de 3 noites')
    })

    it('should pluralize correctly for multiple nights (PT-BR)', () => {
      const result = formatMinimumStayError(7, 'pt-BR')
      expect(result).toBe('Estada mínima de 7 noites')
    })

    it('should default to PT locale when not specified', () => {
      const result = formatMinimumStayError(5)
      expect(result).toBe('Estadia mínima de 5 noites')
    })
  })

  describe('formatMinimumStayValidation', () => {
    it('should format validation error message (PT)', () => {
      const result = formatMinimumStayValidation(5, 3, 'pt')
      // Check that it includes minNights and nights values
      expect(result).toContain('5')
      expect(result).toContain('3')
    })

    it('should format validation error message (PT-BR)', () => {
      const result = formatMinimumStayValidation(5, 3, 'pt-BR')
      expect(result).toContain('5')
      expect(result).toContain('3')
    })
  })

  describe('detectLocale', () => {
    it('should detect PT-BR from Accept-Language header', () => {
      const locale = detectLocale('pt-BR,pt;q=0.9')
      expect(locale).toBe('pt-BR')
    })

    it('should detect PT-BR when "br" is in Accept-Language', () => {
      const locale = detectLocale('en-US,en;q=0.9,pt-br;q=0.8')
      expect(locale).toBe('pt-BR')
    })

    it('should default to PT when header is missing', () => {
      const locale = detectLocale(undefined)
      expect(locale).toBe('pt')
    })

    it('should default to PT when header is empty', () => {
      const locale = detectLocale('')
      expect(locale).toBe('pt')
    })

    it('should return PT for standard Portuguese', () => {
      const locale = detectLocale('pt,pt;q=0.9')
      expect(locale).toBe('pt')
    })

    it('should be case-insensitive for BR detection', () => {
      const locale = detectLocale('PT-BR,pt;q=0.9')
      expect(locale).toBe('pt-BR')
    })

    it('should return PT for unsupported locales', () => {
      const locale = detectLocale('es,en;q=0.9')
      expect(locale).toBe('pt')
    })
  })

  describe('t - translation function', () => {
    it('should return translated message', () => {
      const result = t('errors.minimum_stay_required', 'pt', { minNights: 5 })
      expect(result).toContain('5')
      expect(result).toContain('Estadia')
    })

    it('should interpolate variables correctly', () => {
      const result = t('errors.minimum_stay_required', 'pt', { minNights: 3 })
      expect(result).toBe('Estadia mínima de 3 noites')
    })

    it('should warn on missing translation key', () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation()
      // @ts-expect-error - Testing with non-existent key
      t('non.existent.key', 'pt')
      expect(warnSpy).toHaveBeenCalled()
      warnSpy.mockRestore()
    })

    it('should return key on missing translation', () => {
      // @ts-expect-error - Testing with non-existent key
      const result = t('non.existent.key', 'pt')
      expect(result).toBe('non.existent.key')
    })

    it('should handle multiple variable interpolations', () => {
      const result = formatMinimumStayValidation(5, 2, 'pt')
      expect(result).toContain('5')
      expect(result).toContain('2')
    })
  })

  describe('edge cases', () => {
    it('should handle zero nights correctly', () => {
      const result = formatMinimumStayError(0, 'pt')
      expect(result).toBe('Estadia mínima de 0 noites')
    })

    it('should handle large night values', () => {
      const result = formatMinimumStayError(365, 'pt')
      expect(result).toBe('Estadia mínima de 365 noites')
    })

    it('should preserve pluralization with large numbers', () => {
      const result = formatMinimumStayError(100, 'pt')
      expect(result).toContain('noites')
    })
  })
})
