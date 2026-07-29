import { LoyaltyCalculator, Booking } from '@/lib/loyalty/loyalty-calculator'

describe('LoyaltyCalculator', () => {
  describe('calculate', () => {
    it('should return 0 points for guest with no bookings', () => {
      const result = LoyaltyCalculator.calculate({
        bookings: [],
        referral_count: 0,
      })

      expect(result.loyalty_score).toBe(0)
      expect(result.breakdown.completed_stays).toBe(0)
      expect(result.breakdown.completed_stays_points).toBe(0)
      expect(result.breakdown.zero_cancellation_bonus).toBe(0)
      expect(result.breakdown.referral_points).toBe(0)
    })

    it('should calculate base points for completed stays', () => {
      const bookings: Booking[] = [
        {
          id: '1',
          guest_id: 'guest-1',
          status: 'completed',
          check_in: '2026-01-01',
          check_out: '2026-01-05',
          cancelled_at: undefined,
          total_amount: 500,
          created_at: '2026-01-01',
        },
        {
          id: '2',
          guest_id: 'guest-1',
          status: 'completed',
          check_in: '2026-02-01',
          check_out: '2026-02-05',
          cancelled_at: undefined,
          total_amount: 500,
          created_at: '2026-02-01',
        },
      ]

      const result = LoyaltyCalculator.calculate({
        bookings,
        referral_count: 0,
      })

      // 2 completed stays * 5 points each = 10 points
      // BUT they will also get zero cancellation bonus (no cancelled_at = null = no cancellation)
      // So: 10 base + 20 bonus = 30 total
      expect(result.loyalty_score).toBe(30)
      expect(result.breakdown.completed_stays).toBe(2)
      expect(result.breakdown.completed_stays_points).toBe(10)
      expect(result.breakdown.zero_cancellation_bonus).toBe(20)
    })

    it('should apply zero cancellation bonus', () => {
      const bookings: Booking[] = [
        {
          id: '1',
          guest_id: 'guest-1',
          status: 'completed',
          check_in: '2026-01-01',
          check_out: '2026-01-05',
          cancelled_at: null,
          total_amount: 500,
          created_at: '2026-01-01',
        },
        {
          id: '2',
          guest_id: 'guest-1',
          status: 'completed',
          check_in: '2026-02-01',
          check_out: '2026-02-05',
          cancelled_at: null,
          total_amount: 500,
          created_at: '2026-02-01',
        },
      ]

      const result = LoyaltyCalculator.calculate({
        bookings,
        referral_count: 0,
      })

      // 2 stays * 5 = 10 base points
      // 2 zero cancellation stays * 10 = 20 bonus points
      // Total: 30 points
      expect(result.loyalty_score).toBe(30)
      expect(result.breakdown.completed_stays_points).toBe(10)
      expect(result.breakdown.zero_cancellation_bonus).toBe(20)
    })

    it('should add referral points', () => {
      const bookings: Booking[] = [
        {
          id: '1',
          guest_id: 'guest-1',
          status: 'completed',
          check_in: '2026-01-01',
          check_out: '2026-01-05',
          cancelled_at: null,
          total_amount: 500,
          created_at: '2026-01-01',
        },
      ]

      const result = LoyaltyCalculator.calculate({
        bookings,
        referral_count: 2,
      })

      // 1 stay * 5 = 5 base points
      // 1 zero cancellation * 10 = 10 bonus points
      // 2 referrals * 15 = 30 referral points
      // Total: 45 points
      expect(result.loyalty_score).toBe(45)
      expect(result.breakdown.referral_points).toBe(30)
    })

    it('should enforce maximum score cap of 100 points', () => {
      const bookings: Booking[] = Array.from({ length: 15 }, (_, i) => ({
        id: `booking-${i}`,
        guest_id: 'guest-1',
        status: 'completed' as const,
        check_in: `2026-0${Math.floor(i / 2) + 1}-01`,
        check_out: `2026-0${Math.floor(i / 2) + 1}-05`,
        cancelled_at: null,
        total_amount: 500,
        created_at: `2026-0${Math.floor(i / 2) + 1}-01`,
      }))

      const result = LoyaltyCalculator.calculate({
        bookings,
        referral_count: 3,
      })

      // 15 stays * 5 = 75 base points
      // 15 zero cancellation * 10 = 150 bonus points
      // 3 referrals * 15 = 45 referral points
      // Total would be: 270 points, but capped at 100
      expect(result.loyalty_score).toBe(100)
    })

    it('should ignore cancelled reservations', () => {
      const bookings: Booking[] = [
        {
          id: '1',
          guest_id: 'guest-1',
          status: 'completed',
          check_in: '2026-01-01',
          check_out: '2026-01-05',
          cancelled_at: '2025-12-20',
          total_amount: 500,
          created_at: '2026-01-01',
        },
      ]

      const result = LoyaltyCalculator.calculate({
        bookings,
        referral_count: 0,
      })

      // Cancelled stays don't get zero cancellation bonus
      // Only base 5 points
      expect(result.loyalty_score).toBe(5)
      expect(result.breakdown.zero_cancellation_bonus).toBe(0)
    })

    it('should handle mixed booking statuses', () => {
      const bookings: Booking[] = [
        {
          id: '1',
          guest_id: 'guest-1',
          status: 'completed',
          check_in: '2026-01-01',
          check_out: '2026-01-05',
          cancelled_at: null,
          total_amount: 500,
          created_at: '2026-01-01',
        },
        {
          id: '2',
          guest_id: 'guest-1',
          status: 'cancelled',
          check_in: '2026-02-01',
          check_out: '2026-02-05',
          cancelled_at: '2026-01-20',
          total_amount: 500,
          created_at: '2026-02-01',
        },
        {
          id: '3',
          guest_id: 'guest-1',
          status: 'confirmed',
          check_in: '2026-03-01',
          check_out: '2026-03-05',
          total_amount: 500,
          created_at: '2026-03-01',
        },
      ]

      const result = LoyaltyCalculator.calculate({
        bookings,
        referral_count: 0,
      })

      // Only 1 completed stay counts
      expect(result.breakdown.completed_stays).toBe(1)
      expect(result.breakdown.completed_stays_points).toBe(5)
      expect(result.breakdown.zero_cancellation_bonus).toBe(10)
      expect(result.loyalty_score).toBe(15)
    })

    it('should throw error on invalid input', () => {
      expect(() => {
        LoyaltyCalculator.calculate({
          bookings: null as any,
        })
      }).toThrow('Invalid input: bookings must be an array')
    })

    it('should calculate breakdown correctly', () => {
      const bookings: Booking[] = [
        {
          id: '1',
          guest_id: 'guest-1',
          status: 'completed',
          check_in: '2026-01-01',
          check_out: '2026-01-05',
          cancelled_at: null,
          total_amount: 500,
          created_at: '2026-01-01',
        },
      ]

      const result = LoyaltyCalculator.calculate({
        bookings,
        referral_count: 1,
      })

      expect(result.breakdown).toEqual({
        completed_stays: 1,
        completed_stays_points: 5,
        zero_cancellation_bonus: 10,
        referral_points: 15,
      })
    })

    it('should include reasoning in result', () => {
      const bookings: Booking[] = [
        {
          id: '1',
          guest_id: 'guest-1',
          status: 'completed',
          check_in: '2026-01-01',
          check_out: '2026-01-05',
          cancelled_at: null,
          total_amount: 500,
          created_at: '2026-01-01',
        },
      ]

      const result = LoyaltyCalculator.calculate({
        bookings,
        referral_count: 0,
      })

      expect(result.reasoning).toBeDefined()
      expect(result.reasoning).toContain('estada')
      expect(result.reasoning).toContain('Pontuação') // Capital P
    })
  })

  describe('validateScore', () => {
    it('should validate correct scores', () => {
      expect(LoyaltyCalculator.validateScore(0)).toBe(true)
      expect(LoyaltyCalculator.validateScore(50)).toBe(true)
      expect(LoyaltyCalculator.validateScore(100)).toBe(true)
    })

    it('should reject negative scores', () => {
      expect(LoyaltyCalculator.validateScore(-1)).toBe(false)
      expect(LoyaltyCalculator.validateScore(-100)).toBe(false)
    })

    it('should reject scores above maximum', () => {
      expect(LoyaltyCalculator.validateScore(101)).toBe(false)
      expect(LoyaltyCalculator.validateScore(200)).toBe(false)
    })

    it('should reject non-integer scores', () => {
      expect(LoyaltyCalculator.validateScore(50.5)).toBe(false)
      expect(LoyaltyCalculator.validateScore(100.1)).toBe(false)
    })

    it('should reject non-number values', () => {
      expect(LoyaltyCalculator.validateScore('50' as any)).toBe(false)
      expect(LoyaltyCalculator.validateScore(null as any)).toBe(false)
      expect(LoyaltyCalculator.validateScore(undefined as any)).toBe(false)
    })

    it('should reject NaN', () => {
      expect(LoyaltyCalculator.validateScore(NaN)).toBe(false)
    })
  })
})
