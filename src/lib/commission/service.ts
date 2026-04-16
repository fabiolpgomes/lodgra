/**
 * Commission Service
 * Calculates and manages commission logic for bookings
 * Supports multi-plan commission rates with transparent calculations
 */

import { COMMISSION_RATES, PLAN_INFO, type CommissionResult, type PlanType } from './types'

/**
 * Get commission rate for a subscription plan
 * @param plan - Subscription plan type
 * @returns Commission rate as decimal (e.g., 0.15 for 15%)
 */
export function getCommissionRate(plan: PlanType): number {
  const rate = COMMISSION_RATES[plan]
  if (rate === undefined) {
    throw new Error(`Invalid plan: ${plan}. Expected one of: ${Object.keys(COMMISSION_RATES).join(', ')}`)
  }
  return rate
}

/**
 * Calculate commission for a booking
 * @param grossRevenue - Gross revenue from booking (before commission)
 * @param plan - Subscription plan type
 * @param customRate - Optional custom rate override (for testing/migrations)
 * @returns Commission calculation result with breakdown
 */
export function calculateCommission(grossRevenue: number, plan: PlanType, customRate?: number): CommissionResult {
  // Validate inputs
  if (!Number.isFinite(grossRevenue) || grossRevenue < 0) {
    throw new Error(`Invalid grossRevenue: ${grossRevenue}. Must be a non-negative number.`)
  }

  // Get commission rate
  const commissionRate = customRate ?? getCommissionRate(plan)

  // Validate rate
  if (!Number.isFinite(commissionRate) || commissionRate < 0 || commissionRate > 1) {
    throw new Error(`Invalid commission rate: ${commissionRate}. Must be between 0 and 1.`)
  }

  // Calculate commission amount (rounded to 2 decimals for currency)
  const commissionAmount = Math.round(grossRevenue * commissionRate * 100) / 100

  // Calculate net revenue
  const netRevenue = Math.round((grossRevenue - commissionAmount) * 100) / 100

  return {
    grossRevenue,
    commissionRate,
    commissionAmount,
    netRevenue,
  }
}

/**
 * Get plan info including commission rate
 * @param plan - Subscription plan type
 * @returns Plan configuration with pricing and commission details
 */
export function getPlanInfo(plan: PlanType) {
  const info = PLAN_INFO[plan]
  if (!info) {
    throw new Error(`Invalid plan: ${plan}`)
  }
  return info
}

/**
 * Format commission amount for display
 * @param amount - Commission amount in currency
 * @param currency - Currency code (EUR, USD, etc)
 * @returns Formatted currency string
 */
export function formatCommission(amount: number, currency: string = 'EUR'): string {
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  return formatter.format(amount)
}

/**
 * Format commission percentage for display
 * @param rate - Commission rate as decimal (e.g., 0.15)
 * @returns Formatted percentage string
 */
export function formatCommissionRate(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`
}

/**
 * Validate commission data
 * Ensures commission tracking is complete and accurate
 * @param commissionAmount - Recorded commission amount
 * @param commissionRate - Recorded commission rate
 * @param grossRevenue - Gross revenue
 * @returns { valid: boolean, error?: string }
 */
export function validateCommission(
  commissionAmount: number,
  commissionRate: number,
  grossRevenue: number,
): { valid: boolean; error?: string } {
  if (!Number.isFinite(commissionAmount)) {
    return { valid: false, error: 'Commission amount must be a valid number' }
  }

  if (!Number.isFinite(commissionRate) || commissionRate < 0 || commissionRate > 1) {
    return { valid: false, error: 'Commission rate must be between 0 and 1' }
  }

  if (!Number.isFinite(grossRevenue) || grossRevenue <= 0) {
    return { valid: false, error: 'Gross revenue must be a positive number' }
  }

  // Verify commission was calculated correctly (allow small rounding differences)
  const expectedCommission = Math.round(grossRevenue * commissionRate * 100) / 100
  const difference = Math.abs(commissionAmount - expectedCommission)
  const tolerance = 0.01 // Allow 1 cent difference due to rounding

  if (difference > tolerance) {
    return {
      valid: false,
      error: `Commission amount mismatch: expected ${expectedCommission}, got ${commissionAmount}`,
    }
  }

  return { valid: true }
}
