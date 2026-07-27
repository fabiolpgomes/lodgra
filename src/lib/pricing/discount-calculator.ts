/**
 * Story 37.2: Discount Calculator
 * Calculates discounts based on stay duration and customer loyalty
 */

export interface DiscountConfig {
  weeklyPercent: number; // Discount for 7+ nights
  monthlyPercent: number; // Discount for 28+ nights
  loyaltyPercent?: number; // Additional discount for loyal customers
}

export interface DiscountCalculationResult {
  originalPrice: number;
  weeklyDiscount: number;
  monthlyDiscount: number;
  loyaltyDiscount: number;
  finalPrice: number;
  appliedDiscount: string;
}

/**
 * Calculate discount for a reservation
 *
 * Rules:
 * 1. Semanal OR Mensal (cascade: pick the higher discount)
 * 2. Fidelidade is additional (applied on top of duration discount)
 *
 * @param nightCount Number of nights
 * @param basePrice Total price before discounts
 * @param config Discount configuration
 * @param isLoyalCustomer Whether customer has previous reservations
 * @returns Calculated discounts and final price
 */
export function calculateDiscount(
  nightCount: number,
  basePrice: number,
  config: DiscountConfig,
  isLoyalCustomer: boolean = false
): DiscountCalculationResult {
  let weeklyDiscount = 0;
  let monthlyDiscount = 0;
  let loyaltyDiscount = 0;
  let appliedDiscount = 'Nenhum';

  // Apply duration-based discount (cascade: max of weekly or monthly)
  if (nightCount >= 28) {
    // Long stay: apply monthly discount
    monthlyDiscount = (basePrice * config.monthlyPercent) / 100;
    appliedDiscount = `Mensal (${config.monthlyPercent}%)`;
  } else if (nightCount >= 7) {
    // Weekly stay: apply weekly discount
    weeklyDiscount = (basePrice * config.weeklyPercent) / 100;
    appliedDiscount = `Semanal (${config.weeklyPercent}%)`;
  }

  const durationDiscountAmount = weeklyDiscount + monthlyDiscount;
  const priceAfterDuration = basePrice - durationDiscountAmount;

  // Apply loyalty discount (additional, on top of duration discount)
  if (isLoyalCustomer && config.loyaltyPercent) {
    loyaltyDiscount = (priceAfterDuration * config.loyaltyPercent) / 100;
    appliedDiscount += ` + Fidelidade (${config.loyaltyPercent}%)`;
  }

  const finalPrice = Math.round((priceAfterDuration - loyaltyDiscount) * 100) / 100;

  return {
    originalPrice: basePrice,
    weeklyDiscount: Math.round(weeklyDiscount * 100) / 100,
    monthlyDiscount: Math.round(monthlyDiscount * 100) / 100,
    loyaltyDiscount: Math.round(loyaltyDiscount * 100) / 100,
    finalPrice,
    appliedDiscount,
  };
}

/**
 * Validate discount percentage
 */
export function isValidDiscount(percentage: number): boolean {
  return percentage >= 0 && percentage <= 100 && Number.isFinite(percentage);
}
