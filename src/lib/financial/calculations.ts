/**
 * Financial calculation helpers for management fee and owner revenue split.
 * management_percentage: % of gross revenue retained as management fee (e.g. 20 = 20%)
 * platform_fee_percentage: % deducted by booking platform (e.g. Airbnb 3%, Booking 15%)
 */

export function calcManagementFee(grossRevenue: number, percentage: number): number {
  if (!percentage || percentage <= 0) return 0
  return grossRevenue * (percentage / 100)
}

export function calcOwnerNet(grossRevenue: number, percentage: number): number {
  return grossRevenue - calcManagementFee(grossRevenue, percentage)
}

/**
 * Net amount after platform fee deduction.
 * platformFeePercentage: % charged by platform (e.g. 15 = 15%)
 */
export function calcNetAmount(totalAmount: number, platformFeePercentage: number): number {
  if (!platformFeePercentage || platformFeePercentage <= 0) return totalAmount
  return totalAmount - totalAmount * (platformFeePercentage / 100)
}
