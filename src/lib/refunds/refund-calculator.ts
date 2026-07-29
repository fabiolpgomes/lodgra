import { CancellationPolicyType, StayDuration } from '@/types/cancellation.types'

export interface RefundCalculationInput {
  policy_type: CancellationPolicyType
  stay_duration: StayDuration
  days_until_checkin: number
  during_stay: boolean
  cancellation_reason: 'voluntary' | 'serious_issue'
  total_amount: number
  nights_total?: number
  nights_remaining?: number
}

export interface RefundCalculationResult {
  refund_percentage: number
  refund_amount: number
  reason: string
  requires_manual_review: boolean
}

export class RefundCalculator {
  static calculate(input: RefundCalculationInput): RefundCalculationResult {
    if (input.cancellation_reason === 'serious_issue') {
      return {
        refund_percentage: 0,
        refund_amount: 0,
        reason: 'Serious issue - manual review required',
        requires_manual_review: true
      }
    }

    if (input.during_stay && input.cancellation_reason === 'voluntary') {
      return this.calculateDuringStay(input)
    }

    return this.calculateBeforeCheckin(input)
  }

  private static calculateDuringStay(input: RefundCalculationInput): RefundCalculationResult {
    const nights_remaining = input.nights_remaining || 0
    const remaining_amount = (input.total_amount / (input.nights_total || 1)) * nights_remaining

    if (input.policy_type === 'flexible') {
      return {
        refund_percentage: 50,
        refund_amount: remaining_amount * 0.5,
        reason: `Flexible: ${nights_remaining} noites não usadas (50% refund)`,
        requires_manual_review: false
      }
    }

    if (input.policy_type === 'moderate') {
      return {
        refund_percentage: 50,
        refund_amount: remaining_amount * 0.5,
        reason: `Moderate: ${nights_remaining} noites restantes (50% refund)`,
        requires_manual_review: false
      }
    }

    if (['limited', 'firm'].includes(input.policy_type)) {
      return {
        refund_percentage: 0,
        refund_amount: 0,
        reason: `${input.policy_type}: non-refundable during stay`,
        requires_manual_review: false
      }
    }

    if (input.policy_type === 'rigid') {
      return {
        refund_percentage: 0,
        refund_amount: 0,
        reason: 'Rigid: non-refundable',
        requires_manual_review: false
      }
    }

    throw new Error(`Unknown policy: ${input.policy_type}`)
  }

  private static calculateBeforeCheckin(input: RefundCalculationInput): RefundCalculationResult {
    const daysBeforeCheckin = input.days_until_checkin

    if (input.policy_type === 'flexible') {
      if (daysBeforeCheckin >= 1) {
        return {
          refund_percentage: 100,
          refund_amount: input.total_amount,
          reason: 'Flexible: 1+ day before check-in (100% refund)',
          requires_manual_review: false
        }
      } else {
        return {
          refund_percentage: 0,
          refund_amount: 0,
          reason: 'Flexible: less than 1 day before check-in (no refund)',
          requires_manual_review: false
        }
      }
    }

    if (input.policy_type === 'moderate') {
      if (daysBeforeCheckin >= 5) {
        return {
          refund_percentage: 100,
          refund_amount: input.total_amount,
          reason: 'Moderate: 5+ days before check-in (100% refund)',
          requires_manual_review: false
        }
      } else if (daysBeforeCheckin >= 0) {
        const refund_amount = input.total_amount * 0.5
        return {
          refund_percentage: 50,
          refund_amount,
          reason: 'Moderate: less than 5 days before (50% refund)',
          requires_manual_review: false
        }
      } else {
        return {
          refund_percentage: 0,
          refund_amount: 0,
          reason: 'Moderate: after check-in (no refund)',
          requires_manual_review: false
        }
      }
    }

    if (input.policy_type === 'limited') {
      if (daysBeforeCheckin >= 14) {
        return {
          refund_percentage: 100,
          refund_amount: input.total_amount,
          reason: 'Limited: 14+ days before (100% refund)',
          requires_manual_review: false
        }
      } else if (daysBeforeCheckin >= 7) {
        const refund_amount = input.total_amount * 0.5
        return {
          refund_percentage: 50,
          refund_amount,
          reason: 'Limited: 7-14 days before (50% refund)',
          requires_manual_review: false
        }
      } else {
        return {
          refund_percentage: 0,
          refund_amount: 0,
          reason: 'Limited: less than 7 days before (no refund)',
          requires_manual_review: false
        }
      }
    }

    if (input.policy_type === 'firm') {
      if (daysBeforeCheckin >= 30) {
        return {
          refund_percentage: 100,
          refund_amount: input.total_amount,
          reason: 'Firm: 30+ days before (100% refund)',
          requires_manual_review: false
        }
      } else if (daysBeforeCheckin >= 7) {
        const refund_amount = input.total_amount * 0.5
        return {
          refund_percentage: 50,
          refund_amount,
          reason: 'Firm: 7-30 days before (50% refund)',
          requires_manual_review: false
        }
      } else {
        return {
          refund_percentage: 0,
          refund_amount: 0,
          reason: 'Firm: less than 7 days before (no refund)',
          requires_manual_review: false
        }
      }
    }

    if (input.policy_type === 'rigid') {
      return {
        refund_percentage: 0,
        refund_amount: 0,
        reason: 'Rigid: non-refundable',
        requires_manual_review: false
      }
    }

    throw new Error(`Unknown policy: ${input.policy_type}`)
  }

  static validateAmount(total_amount: number, refund_amount: number): boolean {
    if (refund_amount < 0) return false
    if (refund_amount > total_amount) return false
    return true
  }
}
