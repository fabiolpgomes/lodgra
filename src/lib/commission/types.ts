/**
 * Commission Types
 * Defines types for commission calculations and tracking
 */

export type PlanType = 'essencial' | 'expansao' | 'premium' | 'enterprise'

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
  essencial: 0.2, // 20%
  expansao: 0.15, // 15%
  premium: 0.1, // 10%
  enterprise: 0.05, // 5%
}

export const PLAN_INFO = {
  essencial: {
    monthlyPrice: 59,
    commissionRate: 0.2,
    maxProperties: 1,
  },
  expansao: {
    monthlyPrice: 149,
    commissionRate: 0.15,
    maxProperties: 3,
  },
  premium: {
    monthlyPrice: 397,
    commissionRate: 0.1,
    maxProperties: 10,
  },
  enterprise: {
    monthlyPrice: 0,
    commissionRate: 0.05,
    maxProperties: -1, // unlimited
  },
} as const
