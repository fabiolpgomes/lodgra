import { RefundCalculator } from '@/lib/refunds/refund-calculator'

// Story 40.2 Phase 2: RefundCalculator Integration Tests
// Validates RefundCalculator is properly integrated with endpoints
describe('Story 40.2: RefundCalculator Integration', () => {
  describe('RefundCalculator Policy Support', () => {
    it('should calculate flexible policy refunds correctly', () => {
      const result = RefundCalculator.calculate({
        policy_type: 'flexible',
        stay_duration: 'short',
        days_until_checkin: 5,
        during_stay: false,
        cancellation_reason: 'voluntary',
        total_amount: 500.00,
      })

      expect(result.refund_percentage).toBe(100)
      expect(result.refund_amount).toBe(500.00)
      expect(result.reason).toContain('Flexible')
    })

    it('should calculate moderate policy refunds correctly', () => {
      const result = RefundCalculator.calculate({
        policy_type: 'moderate',
        stay_duration: 'short',
        days_until_checkin: 10,
        during_stay: false,
        cancellation_reason: 'voluntary',
        total_amount: 600.00,
      })

      expect(result.refund_percentage).toBe(100)
      expect(result.refund_amount).toBe(600.00)
    })

    it('should calculate limited policy refunds correctly', () => {
      const result = RefundCalculator.calculate({
        policy_type: 'limited',
        stay_duration: 'short',
        days_until_checkin: 15,
        during_stay: false,
        cancellation_reason: 'voluntary',
        total_amount: 400.00,
      })

      expect(result.refund_percentage).toBe(100)
      expect(result.refund_amount).toBe(400.00)
    })

    it('should calculate firm policy refunds correctly', () => {
      const result = RefundCalculator.calculate({
        policy_type: 'firm',
        stay_duration: 'short',
        days_until_checkin: 40,
        during_stay: false,
        cancellation_reason: 'voluntary',
        total_amount: 500.00,
      })

      expect(result.refund_percentage).toBe(100)
      expect(result.refund_amount).toBe(500.00)
    })

    it('should calculate rigid policy refunds correctly', () => {
      const result = RefundCalculator.calculate({
        policy_type: 'rigid',
        stay_duration: 'short',
        days_until_checkin: 5,
        during_stay: false,
        cancellation_reason: 'voluntary',
        total_amount: 300.00,
      })

      expect(result.refund_percentage).toBe(0)
      expect(result.refund_amount).toBe(0)
      expect(result.reason).toContain('Rigid')
    })
  })

  describe('RefundCalculator Serious Issue Support', () => {
    it('should flag serious_issue as requiring manual review', () => {
      const result = RefundCalculator.calculate({
        policy_type: 'flexible',
        stay_duration: 'short',
        days_until_checkin: 2,
        during_stay: false,
        cancellation_reason: 'serious_issue',
        total_amount: 450.00,
      })

      expect(result.requires_manual_review).toBe(true)
      expect(result.reason).toContain('manual review')
    })

    it('serious_issue should return 0% initially (waits for manager decision)', () => {
      const result = RefundCalculator.calculate({
        policy_type: 'flexible',
        stay_duration: 'short',
        days_until_checkin: 2,
        during_stay: false,
        cancellation_reason: 'serious_issue',
        total_amount: 450.00,
      })

      expect(result.refund_percentage).toBe(0)
      expect(result.refund_amount).toBe(0)
    })
  })

  describe('RefundCalculator Stay Duration Support', () => {
    it('should apply long-stay duration rules (>=28 nights)', () => {
      const result = RefundCalculator.calculate({
        policy_type: 'flexible',
        stay_duration: 'long',
        days_until_checkin: 50,
        during_stay: false,
        cancellation_reason: 'voluntary',
        total_amount: 2000.00,
      })

      expect(result.refund_percentage).toBe(100)
      expect(result.refund_amount).toBe(2000.00)
    })

    it('should apply short-stay duration rules (<28 nights)', () => {
      const result = RefundCalculator.calculate({
        policy_type: 'flexible',
        stay_duration: 'short',
        days_until_checkin: 5,
        during_stay: false,
        cancellation_reason: 'voluntary',
        total_amount: 500.00,
      })

      expect(result.refund_percentage).toBe(100)
      expect(result.refund_amount).toBe(500.00)
    })
  })

  describe('RefundCalculator Amount Validation', () => {
    it('should validate valid refund amount', () => {
      const result = RefundCalculator.calculate({
        policy_type: 'flexible',
        stay_duration: 'short',
        days_until_checkin: 5,
        during_stay: false,
        cancellation_reason: 'voluntary',
        total_amount: 500.00,
      })

      const isValid = RefundCalculator.validateAmount(500.00, result.refund_amount)
      expect(isValid).toBe(true)
    })

    it('should reject refund that exceeds total amount', () => {
      const isValid = RefundCalculator.validateAmount(500.00, 600.00)
      expect(isValid).toBe(false)
    })

    it('should accept zero refund', () => {
      const isValid = RefundCalculator.validateAmount(500.00, 0)
      expect(isValid).toBe(true)
    })

    it('should reject negative refund', () => {
      const isValid = RefundCalculator.validateAmount(500.00, -50.00)
      expect(isValid).toBe(false)
    })
  })

  describe('RefundCalculator During-Stay Support', () => {
    it('should apply reduced refund when cancelled during stay (flexible)', () => {
      const result = RefundCalculator.calculate({
        policy_type: 'flexible',
        stay_duration: 'short',
        days_until_checkin: -3,
        during_stay: true,
        cancellation_reason: 'voluntary',
        total_amount: 500.00,
        nights_total: 5,
        nights_remaining: 2,
      })

      expect(result.refund_percentage).toBe(50)
      expect(result.refund_amount).toBeCloseTo(100.00, 1) // 50% of (500/5)*2
    })

    it('should not allow refund for limited policy during stay', () => {
      const result = RefundCalculator.calculate({
        policy_type: 'limited',
        stay_duration: 'short',
        days_until_checkin: -3,
        during_stay: true,
        cancellation_reason: 'voluntary',
        total_amount: 500.00,
        nights_total: 5,
        nights_remaining: 2,
      })

      expect(result.refund_percentage).toBe(0)
      expect(result.refund_amount).toBe(0)
    })
  })

  describe('RefundCalculator Endpoint Integration', () => {
    it('should have correct interface for POST /cancel integration', () => {
      // Simulate what POST /cancel would pass to RefundCalculator
      const cancellationInput = {
        policy_type: 'moderate',
        stay_duration: 'short' as const,
        days_until_checkin: 10,
        during_stay: false,
        cancellation_reason: 'voluntary' as const,
        total_amount: 450.00,
        nights_total: 5,
      }

      const result = RefundCalculator.calculate(cancellationInput)

      expect(result).toHaveProperty('refund_percentage')
      expect(result).toHaveProperty('refund_amount')
      expect(result).toHaveProperty('reason')
      expect(result).toHaveProperty('requires_manual_review')
    })

    it('should have correct interface for POST /admin/review/[id]/decision integration', () => {
      // For manual review decisions (serious_issue), RefundCalculator marks it for manual review
      // The manager then chooses the actual percentage (APPROVED=100%, PARTIAL=50%, DENIED=0%)
      const reviewDecisionInput = {
        policy_type: 'flexible',
        stay_duration: 'short' as const,
        days_until_checkin: 2,
        during_stay: false,
        cancellation_reason: 'serious_issue' as const,
        total_amount: 450.00,
      }

      const result = RefundCalculator.calculate(reviewDecisionInput)

      expect(result.requires_manual_review).toBe(true)
      expect(typeof result.refund_percentage).toBe('number')
      expect(typeof result.refund_amount).toBe('number')
    })
  })

  describe('RefundCalculator Policy Transitions', () => {
    it('moderate policy: 100% for 5+ days, 50% for 0-4 days, 0% after check-in', () => {
      // 5+ days
      const result1 = RefundCalculator.calculate({
        policy_type: 'moderate',
        stay_duration: 'short',
        days_until_checkin: 5,
        during_stay: false,
        cancellation_reason: 'voluntary',
        total_amount: 500.00,
      })
      expect(result1.refund_percentage).toBe(100)

      // 0-4 days
      const result2 = RefundCalculator.calculate({
        policy_type: 'moderate',
        stay_duration: 'short',
        days_until_checkin: 2,
        during_stay: false,
        cancellation_reason: 'voluntary',
        total_amount: 500.00,
      })
      expect(result2.refund_percentage).toBe(50)

      // After check-in (negative days)
      const result3 = RefundCalculator.calculate({
        policy_type: 'moderate',
        stay_duration: 'short',
        days_until_checkin: -2,
        during_stay: false,
        cancellation_reason: 'voluntary',
        total_amount: 500.00,
      })
      expect(result3.refund_percentage).toBe(0)
    })

    it('firm policy: 100% for 30+ days, 50% for 7-29 days, 0% for <7 days', () => {
      // 30+ days
      const result1 = RefundCalculator.calculate({
        policy_type: 'firm',
        stay_duration: 'short',
        days_until_checkin: 30,
        during_stay: false,
        cancellation_reason: 'voluntary',
        total_amount: 500.00,
      })
      expect(result1.refund_percentage).toBe(100)

      // 7-29 days
      const result2 = RefundCalculator.calculate({
        policy_type: 'firm',
        stay_duration: 'short',
        days_until_checkin: 15,
        during_stay: false,
        cancellation_reason: 'voluntary',
        total_amount: 500.00,
      })
      expect(result2.refund_percentage).toBe(50)

      // <7 days
      const result3 = RefundCalculator.calculate({
        policy_type: 'firm',
        stay_duration: 'short',
        days_until_checkin: 3,
        during_stay: false,
        cancellation_reason: 'voluntary',
        total_amount: 500.00,
      })
      expect(result3.refund_percentage).toBe(0)
    })
  })

  describe('RefundCalculator Error Handling', () => {
    it('should handle edge case of 0 days until check-in (exact check-in time)', () => {
      const result = RefundCalculator.calculate({
        policy_type: 'flexible',
        stay_duration: 'short',
        days_until_checkin: 0,
        during_stay: false,
        cancellation_reason: 'voluntary',
        total_amount: 500.00,
      })

      expect(result.refund_percentage).toBe(0)
      expect(result.refund_amount).toBe(0)
    })

    it('should handle large refund amounts correctly', () => {
      const result = RefundCalculator.calculate({
        policy_type: 'flexible',
        stay_duration: 'long',
        days_until_checkin: 50,
        during_stay: false,
        cancellation_reason: 'voluntary',
        total_amount: 50000.00,
      })

      expect(result.refund_percentage).toBe(100)
      expect(result.refund_amount).toBe(50000.00)
      const isValid = RefundCalculator.validateAmount(50000.00, result.refund_amount)
      expect(isValid).toBe(true)
    })
  })
})
