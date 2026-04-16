/**
 * Commission Types
 * Defines types for commission calculations and tracking
 */

export type PlanType = 'starter' | 'professional' | 'business'

export type CommissionConfig = {
  plan: PlanType
  rate: number // decimal between 0 and 1 (e.g., 0.15 for 15%)
}

export type CommissionResult = {
  grossRevenue: number
  commissionRate: number
  commissionAmount: number
  netRevenue: number
}

export const COMMISSION_RATES: Record<PlanType, number> = {
  starter: 0.2, // 20%
  professional: 0.15, // 15%
  business: 0.1, // 10%
}

export const PLAN_INFO = {
  starter: {
    monthlyPrice: 19,
    commissionRate: 0.2,
    maxProperties: 3,
  },
  professional: {
    monthlyPrice: 49,
    commissionRate: 0.15,
    maxProperties: 10,
  },
  business: {
    monthlyPrice: 99,
    commissionRate: 0.1,
    maxProperties: -1, // unlimited
  },
} as const
