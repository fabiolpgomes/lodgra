import { RefundCalculator } from '@/lib/refunds/refund-calculator'

describe('RefundCalculator', () => {
  describe('Flexible Policy', () => {
    it('returns 100% refund if 1+ day before check-in', () => {
      const result = RefundCalculator.calculate({
        policy_type: 'flexible',
        stay_duration: 'short',
        days_until_checkin: 2,
        during_stay: false,
        cancellation_reason: 'voluntary',
        total_amount: 450.00,
      })

      expect(result.refund_percentage).toBe(100)
      expect(result.refund_amount).toBe(450.00)
      expect(result.requires_manual_review).toBe(false)
    })

    it('returns 0% refund if less than 1 day before check-in', () => {
      const result = RefundCalculator.calculate({
        policy_type: 'flexible',
        stay_duration: 'short',
        days_until_checkin: 0,
        during_stay: false,
        cancellation_reason: 'voluntary',
        total_amount: 450.00,
      })

      expect(result.refund_percentage).toBe(0)
      expect(result.refund_amount).toBe(0)
    })

    it('returns 50% refund if cancelled during stay', () => {
      const result = RefundCalculator.calculate({
        policy_type: 'flexible',
        stay_duration: 'short',
        days_until_checkin: -2,
        during_stay: true,
        cancellation_reason: 'voluntary',
        total_amount: 450.00,
        nights_total: 5,
        nights_remaining: 3
      })

      expect(result.refund_percentage).toBe(50)
      expect(result.refund_amount).toBe(135.00)
    })
  })

  describe('Moderate Policy', () => {
    it('returns 100% refund if 5+ days before', () => {
      const result = RefundCalculator.calculate({
        policy_type: 'moderate',
        stay_duration: 'short',
        days_until_checkin: 10,
        during_stay: false,
        cancellation_reason: 'voluntary',
        total_amount: 450.00,
      })

      expect(result.refund_percentage).toBe(100)
    })

    it('returns 50% refund if 0-5 days before', () => {
      const result = RefundCalculator.calculate({
        policy_type: 'moderate',
        stay_duration: 'short',
        days_until_checkin: 3,
        during_stay: false,
        cancellation_reason: 'voluntary',
        total_amount: 450.00,
      })

      expect(result.refund_percentage).toBe(50)
      expect(result.refund_amount).toBe(225.00)
    })
  })

  describe('Limited Policy', () => {
    it('returns 100% refund if 14+ days before', () => {
      const result = RefundCalculator.calculate({
        policy_type: 'limited',
        stay_duration: 'short',
        days_until_checkin: 20,
        during_stay: false,
        cancellation_reason: 'voluntary',
        total_amount: 450.00,
      })

      expect(result.refund_percentage).toBe(100)
    })

    it('returns 50% refund if 7-14 days before', () => {
      const result = RefundCalculator.calculate({
        policy_type: 'limited',
        stay_duration: 'short',
        days_until_checkin: 10,
        during_stay: false,
        cancellation_reason: 'voluntary',
        total_amount: 450.00,
      })

      expect(result.refund_percentage).toBe(50)
    })

    it('returns 0% refund if less than 7 days before', () => {
      const result = RefundCalculator.calculate({
        policy_type: 'limited',
        stay_duration: 'short',
        days_until_checkin: 3,
        during_stay: false,
        cancellation_reason: 'voluntary',
        total_amount: 450.00,
      })

      expect(result.refund_percentage).toBe(0)
    })
  })

  describe('Firm Policy', () => {
    it('returns 100% refund if 30+ days before', () => {
      const result = RefundCalculator.calculate({
        policy_type: 'firm',
        stay_duration: 'short',
        days_until_checkin: 35,
        during_stay: false,
        cancellation_reason: 'voluntary',
        total_amount: 450.00,
      })

      expect(result.refund_percentage).toBe(100)
    })

    it('returns 50% refund if 7-30 days before', () => {
      const result = RefundCalculator.calculate({
        policy_type: 'firm',
        stay_duration: 'short',
        days_until_checkin: 15,
        during_stay: false,
        cancellation_reason: 'voluntary',
        total_amount: 450.00,
      })

      expect(result.refund_percentage).toBe(50)
    })

    it('returns 0% refund if less than 7 days before', () => {
      const result = RefundCalculator.calculate({
        policy_type: 'firm',
        stay_duration: 'short',
        days_until_checkin: 3,
        during_stay: false,
        cancellation_reason: 'voluntary',
        total_amount: 450.00,
      })

      expect(result.refund_percentage).toBe(0)
    })
  })

  describe('Rigid Policy', () => {
    it('returns 0% refund always', () => {
      const result = RefundCalculator.calculate({
        policy_type: 'rigid',
        stay_duration: 'short',
        days_until_checkin: 100,
        during_stay: false,
        cancellation_reason: 'voluntary',
        total_amount: 450.00,
      })

      expect(result.refund_percentage).toBe(0)
      expect(result.refund_amount).toBe(0)
    })
  })

  describe('Serious Issue', () => {
    it('requires manual review', () => {
      const result = RefundCalculator.calculate({
        policy_type: 'rigid',
        stay_duration: 'short',
        days_until_checkin: 20,
        during_stay: true,
        cancellation_reason: 'serious_issue',
        total_amount: 450.00,
      })

      expect(result.requires_manual_review).toBe(true)
      expect(result.refund_amount).toBe(0)
    })
  })

  describe('Validation', () => {
    it('rejects negative refund', () => {
      expect(RefundCalculator.validateAmount(450, -50)).toBe(false)
    })

    it('rejects refund > total', () => {
      expect(RefundCalculator.validateAmount(450, 500)).toBe(false)
    })

    it('accepts valid amounts', () => {
      expect(RefundCalculator.validateAmount(450, 225)).toBe(true)
      expect(RefundCalculator.validateAmount(450, 0)).toBe(true)
      expect(RefundCalculator.validateAmount(450, 450)).toBe(true)
    })
  })
})
