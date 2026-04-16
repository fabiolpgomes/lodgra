/**
 * Commission Service Unit Tests
 * Tests calculation accuracy across all plan types and edge cases
 */

import {
  calculateCommission,
  getCommissionRate,
  getPlanInfo,
  formatCommission,
  formatCommissionRate,
  validateCommission,
} from '@/lib/commission/service'

describe('Commission Service', () => {
  describe('getCommissionRate', () => {
    it('should return correct rate for starter plan', () => {
      const rate = getCommissionRate('starter')
      expect(rate).toBe(0.2)
    })

    it('should return correct rate for professional plan', () => {
      const rate = getCommissionRate('professional')
      expect(rate).toBe(0.15)
    })

    it('should return correct rate for business plan', () => {
      const rate = getCommissionRate('business')
      expect(rate).toBe(0.1)
    })

    it('should throw error for invalid plan', () => {
      expect(() => getCommissionRate('invalid' as 'starter' | 'professional' | 'business')).toThrow(
        'Invalid plan'
      )
    })
  })

  describe('calculateCommission', () => {
    describe('Starter plan (20% commission)', () => {
      it('should calculate commission correctly for €100 booking', () => {
        const result = calculateCommission(100, 'starter')
        expect(result.grossRevenue).toBe(100)
        expect(result.commissionAmount).toBe(20)
        expect(result.commissionRate).toBe(0.2)
        expect(result.netRevenue).toBe(80)
      })

      it('should calculate commission correctly for €1000 booking', () => {
        const result = calculateCommission(1000, 'starter')
        expect(result.commissionAmount).toBe(200)
        expect(result.netRevenue).toBe(800)
      })

      it('should handle decimal amounts correctly', () => {
        const result = calculateCommission(123.45, 'starter')
        expect(result.commissionAmount).toBe(24.69)
        expect(result.netRevenue).toBe(98.76)
      })
    })

    describe('Professional plan (15% commission)', () => {
      it('should calculate commission correctly for €100 booking', () => {
        const result = calculateCommission(100, 'professional')
        expect(result.commissionAmount).toBe(15)
        expect(result.netRevenue).toBe(85)
      })

      it('should calculate commission correctly for €1000 booking', () => {
        const result = calculateCommission(1000, 'professional')
        expect(result.commissionAmount).toBe(150)
        expect(result.netRevenue).toBe(850)
      })
    })

    describe('Business plan (10% commission)', () => {
      it('should calculate commission correctly for €100 booking', () => {
        const result = calculateCommission(100, 'business')
        expect(result.commissionAmount).toBe(10)
        expect(result.netRevenue).toBe(90)
      })

      it('should calculate commission correctly for €1000 booking', () => {
        const result = calculateCommission(1000, 'business')
        expect(result.commissionAmount).toBe(100)
        expect(result.netRevenue).toBe(900)
      })
    })

    describe('Edge cases', () => {
      it('should handle zero revenue', () => {
        const result = calculateCommission(0, 'professional')
        expect(result.commissionAmount).toBe(0)
        expect(result.netRevenue).toBe(0)
      })

      it('should handle very small amounts', () => {
        const result = calculateCommission(0.01, 'professional')
        expect(result.commissionAmount).toBe(0) // 0.15% of 0.01 = 0.0015, rounds to 0
        expect(result.netRevenue).toBe(0.01)
      })

      it('should handle very large amounts', () => {
        const result = calculateCommission(999999.99, 'professional')
        expect(result.commissionAmount).toBe(150000) // 999999.99 * 0.15 = 149999.9985, rounds to 150000
        expect(result.grossRevenue).toBe(999999.99)
      })

      it('should round to 2 decimal places for currency', () => {
        const result = calculateCommission(33.33, 'professional')
        // 33.33 * 0.15 = 4.9995, should round to 5.00
        expect(result.commissionAmount).toBe(5.0)
        expect(result.netRevenue).toBe(28.33)
      })

      it('should handle custom rate override', () => {
        const result = calculateCommission(100, 'professional', 0.25)
        expect(result.commissionRate).toBe(0.25)
        expect(result.commissionAmount).toBe(25)
      })
    })

    describe('Input validation', () => {
      it('should throw error for negative revenue', () => {
        expect(() => calculateCommission(-100, 'professional')).toThrow('Invalid grossRevenue')
      })

      it('should throw error for NaN revenue', () => {
        expect(() => calculateCommission(NaN, 'professional')).toThrow('Invalid grossRevenue')
      })

      it('should throw error for Infinity revenue', () => {
        expect(() => calculateCommission(Infinity, 'professional')).toThrow('Invalid grossRevenue')
      })

      it('should throw error for invalid rate', () => {
        expect(() => calculateCommission(100, 'professional', -0.1)).toThrow('Invalid commission rate')
      })

      it('should throw error for rate > 1', () => {
        expect(() => calculateCommission(100, 'professional', 1.5)).toThrow('Invalid commission rate')
      })
    })
  })

  describe('getPlanInfo', () => {
    it('should return correct info for starter plan', () => {
      const info = getPlanInfo('starter')
      expect(info.monthlyPrice).toBe(19)
      expect(info.commissionRate).toBe(0.2)
      expect(info.maxProperties).toBe(3)
    })

    it('should return correct info for professional plan', () => {
      const info = getPlanInfo('professional')
      expect(info.monthlyPrice).toBe(49)
      expect(info.commissionRate).toBe(0.15)
      expect(info.maxProperties).toBe(10)
    })

    it('should return correct info for business plan', () => {
      const info = getPlanInfo('business')
      expect(info.monthlyPrice).toBe(99)
      expect(info.commissionRate).toBe(0.1)
      expect(info.maxProperties).toBe(-1) // unlimited
    })
  })

  describe('formatCommission', () => {
    it('should format currency correctly for EUR', () => {
      const formatted = formatCommission(100, 'EUR')
      expect(formatted).toMatch(/€|EUR/)
      expect(formatted).toContain('100')
    })

    it('should format currency correctly for USD', () => {
      const formatted = formatCommission(100, 'USD')
      expect(formatted).toMatch(/\$|USD/)
      expect(formatted).toContain('100')
    })

    it('should format decimal amounts correctly', () => {
      const formatted = formatCommission(123.45, 'EUR')
      expect(formatted).toContain('123.45')
    })

    it('should handle zero amount', () => {
      const formatted = formatCommission(0, 'EUR')
      expect(formatted).toMatch(/€|EUR/)
      expect(formatted).toContain('0')
    })
  })

  describe('formatCommissionRate', () => {
    it('should format rate as percentage', () => {
      const formatted = formatCommissionRate(0.15)
      expect(formatted).toBe('15.0%')
    })

    it('should format 20% correctly', () => {
      const formatted = formatCommissionRate(0.2)
      expect(formatted).toBe('20.0%')
    })

    it('should format 10% correctly', () => {
      const formatted = formatCommissionRate(0.1)
      expect(formatted).toBe('10.0%')
    })

    it('should handle zero rate', () => {
      const formatted = formatCommissionRate(0)
      expect(formatted).toBe('0.0%')
    })
  })

  describe('validateCommission', () => {
    it('should validate correct commission data', () => {
      const result = validateCommission(150, 0.15, 1000)
      expect(result.valid).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('should validate with rounding tolerance', () => {
      const result = validateCommission(150.01, 0.15, 1000)
      expect(result.valid).toBe(true)
    })

    it('should reject invalid commission amount', () => {
      const result = validateCommission(200, 0.15, 1000) // Should be 150
      expect(result.valid).toBe(false)
      expect(result.error).toContain('Commission amount mismatch')
    })

    it('should reject invalid rate', () => {
      const result = validateCommission(150, 1.5, 1000)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('Commission rate')
    })

    it('should reject negative revenue', () => {
      const result = validateCommission(100, 0.15, -1000)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('Gross revenue')
    })

    it('should reject NaN values', () => {
      const result = validateCommission(NaN, 0.15, 1000)
      expect(result.valid).toBe(false)
    })
  })
})
