/**
 * PricingCalculator - Discount Logic Engine for Story 36.4
 * Calculates booking prices with support for weekend multipliers, duration discounts, and daily overrides
 */

import type { PricingConfig, PricingResult, BreakdownItem, DailyPrice } from '../../types/pricing.types'

export { PricingConfig, PricingResult, BreakdownItem, DailyPrice }

/**
 * PricingCalculator - Static utility class for booking price calculation
 */
export class PricingCalculator {
  /**
   * Calculates the total booking price applying all discount rules
   * @param config Pricing configuration
   * @returns Result with total, average nightly, and detailed breakdown
   */
  static calculateBookingPrice(config: PricingConfig): PricingResult {
    try {
      // 1. VALIDATION
      const nights = this.calculateNights(config.checkInDate, config.checkOutDate);

      // Validate checkOut > checkIn
      if (nights <= 0) {
        return {
          total: 0,
          avgNightly: 0,
          breakdown: [],
          error: {
            code: 'INVALID_DATES',
            message: 'Check-out date must be after check-in date',
          },
        };
      }

      // Validate min_nights
      const minNights = config.minNights ?? 1;
      if (nights < minNights) {
        return {
          total: 0,
          avgNightly: 0,
          breakdown: [],
          error: {
            code: 'MIN_NIGHTS_NOT_MET',
            message: `Minimum ${minNights} nights required, got ${nights}`,
            required: minNights,
          },
        };
      }

      // 2. INITIALIZATION
      const breakdown: BreakdownItem[] = [];
      let total = 0;
      const weekendMultiplier = config.weekendMultiplier ?? 1.0;
      const sevenNightDiscount = config.sevenNightDiscount ?? 0;
      const twentyEightNightDiscount = config.twentyEightNightDiscount ?? 0;
      const dailyPricesMap = new Map<string, number>();

      // Build map of daily price overrides
      if (config.dailyPrices) {
        config.dailyPrices.forEach((dp) => {
          if (dp.override !== null && dp.override !== undefined) {
            dailyPricesMap.set(dp.date, dp.override);
          }
        });
      }

      // 3. ITERATE THROUGH EACH NIGHT
      let baseTotal = 0;
      let overrideTotalCount = 0;
      const startDate = new Date(config.checkInDate);

      for (let i = 0; i < nights; i++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(currentDate.getDate() + i);
        const dateStr = this.formatDate(currentDate);

        // Get price for this night (override > weekend > base)
        const priceForNight = this.getPriceForDate(
          dateStr,
          config.nightlyRate,
          dailyPricesMap,
          weekendMultiplier
        );

        total += priceForNight;

        // Add to breakdown
        if (dailyPricesMap.has(dateStr)) {
          // Override
          breakdown.push({
            component: 'override',
            nightCount: 1,
            ratePerNight: priceForNight,
            value: priceForNight,
            reason: `Daily price override for ${dateStr}`,
          });
          overrideTotalCount += 1;
        } else if (weekendMultiplier > 1.0 && this.isWeekend(dateStr)) {
          // Weekend rate
          breakdown.push({
            component: 'weekend',
            nightCount: 1,
            ratePerNight: priceForNight,
            value: priceForNight,
            reason: `Weekend rate (${this.getDayName(dateStr)})`,
          });
        } else {
          // Base rate
          breakdown.push({
            component: 'base',
            nightCount: 1,
            ratePerNight: priceForNight,
            value: priceForNight,
            reason: 'Base nightly rate',
          });
        }

        baseTotal += priceForNight;
      }

      // 4. APPLY DURATION DISCOUNT (to non-override nights)
      const nightsNotOverridden = nights - overrideTotalCount;

      if (nightsNotOverridden > 0) {
        let discountRate = 0;
        let discountComponent: 'discount_7night' | 'discount_28night' | null = null;

        // Apply the larger discount
        if (nights >= 28 && twentyEightNightDiscount > 0) {
          discountRate = twentyEightNightDiscount;
          discountComponent = 'discount_28night';
        } else if (nights >= 7 && sevenNightDiscount > 0) {
          discountRate = sevenNightDiscount;
          discountComponent = 'discount_7night';
        }

        if (discountComponent && discountRate > 0) {
          // Calculate discount on the base total (excluding overrides)
          const baseNightsPrice = total - this.getOverridesTotalPrice(breakdown);
          const discountAmount = baseNightsPrice * discountRate;

          breakdown.push({
            component: discountComponent,
            nightCount: nightsNotOverridden,
            ratePerNight: 0,
            value: -discountAmount,
            reason: `${(discountRate * 100).toFixed(0)}% discount for ${nights >= 28 ? '28+' : '7+'} nights`,
          });

          total -= discountAmount;
        }
      }

      // 5. RETURN RESULT
      const avgNightly = nights > 0 ? Math.round((total / nights) * 100) / 100 : 0;

      return {
        total: Math.round(total * 100) / 100,
        avgNightly,
        breakdown,
      };
    } catch (err) {
      return {
        total: 0,
        avgNightly: 0,
        breakdown: [],
        error: {
          code: 'CALCULATION_ERROR',
          message: err instanceof Error ? err.message : 'Unknown error',
        },
      };
    }
  }

  /**
   * Checks if a date is a weekend (Friday or Saturday)
   */
  private static isWeekend(dateStr: string): boolean {
    const date = new Date(dateStr);
    const day = date.getDay();
    return day === 5 || day === 6; // 5 = Friday, 6 = Saturday
  }

  /**
   * Calculates number of nights between check-in and check-out
   */
  private static calculateNights(checkIn: string, checkOut: string): number {
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  }

  /**
   * Gets price for a specific date (override > weekend > base)
   */
  private static getPriceForDate(
    date: string,
    baseRate: number,
    dailyPricesMap: Map<string, number>,
    weekendMultiplier: number
  ): number {
    // If override exists for this date, use it
    const override = dailyPricesMap.get(date);
    if (override !== undefined) {
      return override;
    }

    // If weekend and multiplier exists, apply it
    if (weekendMultiplier > 1.0 && this.isWeekend(date)) {
      return baseRate * weekendMultiplier;
    }

    // Otherwise return base rate
    return baseRate;
  }

  /**
   * Formats a Date object to YYYY-MM-DD string
   */
  private static formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Gets the day name for a date string
   */
  private static getDayName(dateStr: string): string {
    const date = new Date(dateStr);
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[date.getDay()];
  }

  /**
   * Calculates total price from override items in breakdown
   */
  private static getOverridesTotalPrice(breakdown: BreakdownItem[]): number {
    return breakdown
      .filter((item) => item.component === 'override')
      .reduce((sum, item) => sum + item.value, 0);
  }
}
