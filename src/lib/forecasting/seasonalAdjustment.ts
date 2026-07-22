/**
 * Seasonal adjustment factor calculation for revenue forecasting
 */

export interface SeasonalFactor {
  month: number;
  factor: number;
  reasoning: string;
}

export interface HolidayEvent {
  date: Date;
  name: string;
  expectedImpact: number; // multiplier: 1.5 = +50%, 0.5 = -50%
}

// Holiday calendar for major European vacation periods and events
const EUROPEAN_HOLIDAYS: Record<string, HolidayEvent[]> = {
  '2026': [
    { date: new Date('2026-12-24'), name: 'Christmas Eve', expectedImpact: 1.3 },
    { date: new Date('2026-12-25'), name: 'Christmas Day', expectedImpact: 1.5 },
    { date: new Date('2026-12-26'), name: 'Boxing Day', expectedImpact: 1.4 },
    { date: new Date('2026-01-01'), name: "New Year's Day", expectedImpact: 1.2 },
    { date: new Date('2026-04-05'), name: 'Easter Sunday', expectedImpact: 1.6 },
    { date: new Date('2026-04-06'), name: 'Easter Monday', expectedImpact: 1.5 },
    { date: new Date('2026-07-15'), name: 'Summer Peak', expectedImpact: 1.4 },
    { date: new Date('2026-08-15'), name: 'Mid-August Peak', expectedImpact: 1.5 },
  ],
};

/**
 * Calculate seasonal factor for revenue based on historical patterns
 * Factor > 1 means peak season, < 1 means low season
 */
export function calculateSeasonalFactor(
  bookingRevenues: Map<number, number[]>
): Map<number, SeasonalFactor> {
  const factors = new Map<number, SeasonalFactor>();

  if (bookingRevenues.size === 0) {
    // Default seasonal pattern for rental properties (summer peak, winter low)
    const defaultSeasons = [
      { month: 0, factor: 0.8, name: 'January' },
      { month: 1, factor: 0.75, name: 'February' },
      { month: 2, factor: 0.9, name: 'March' },
      { month: 3, factor: 0.95, name: 'April' },
      { month: 4, factor: 1.1, name: 'May' },
      { month: 5, factor: 1.3, name: 'June' },
      { month: 6, factor: 1.5, name: 'July' },
      { month: 7, factor: 1.4, name: 'August' },
      { month: 8, factor: 1.0, name: 'September' },
      { month: 9, factor: 0.95, name: 'October' },
      { month: 10, factor: 0.85, name: 'November' },
      { month: 11, factor: 0.9, name: 'December' },
    ];

    defaultSeasons.forEach(season => {
      factors.set(season.month, {
        month: season.month,
        factor: season.factor,
        reasoning: 'Default seasonal pattern for rental properties',
      });
    });

    return factors;
  }

  // Calculate average revenue per month
  let totalRevenue = 0;
  let totalDataPoints = 0;

  const monthlyAverages = new Map<number, number>();
  bookingRevenues.forEach((revenues, month) => {
    const avg = revenues.reduce((a, b) => a + b, 0) / revenues.length;
    monthlyAverages.set(month, avg);
    totalRevenue += revenues.reduce((a, b) => a + b, 0);
    totalDataPoints += revenues.length;
  });

  const overallAverage = totalRevenue / totalDataPoints;

  // Calculate seasonal factor for each month
  for (let month = 0; month < 12; month++) {
    const monthAvg = monthlyAverages.get(month) || overallAverage;
    const factor = monthAvg / overallAverage;

    let reasoning = 'Based on historical booking data';
    if (factor > 1.2) {
      reasoning += ' - Peak season';
    } else if (factor < 0.8) {
      reasoning += ' - Low season';
    }

    factors.set(month, {
      month,
      factor: Math.round(factor * 1000) / 1000,
      reasoning,
    });
  }

  return factors;
}

/**
 * Apply seasonal adjustment to revenue projection
 */
export function applySeasonalAdjustment(
  baseRevenue: number,
  month: number,
  seasonalFactors: Map<number, SeasonalFactor>
): number {
  const factor = seasonalFactors.get(month);
  if (!factor) {
    return baseRevenue;
  }

  return Math.round(baseRevenue * factor.factor * 100) / 100;
}

/**
 * Get holiday impact for a specific date
 */
export function getHolidayImpact(date: Date): number {
  const year = date.getFullYear().toString();
  const holidays = EUROPEAN_HOLIDAYS[year] || [];

  for (const holiday of holidays) {
    if (
      holiday.date.getDate() === date.getDate() &&
      holiday.date.getMonth() === date.getMonth()
    ) {
      return holiday.expectedImpact;
    }
  }

  return 1.0; // No holiday impact
}

/**
 * Check if date is in a peak season period (summer, holidays)
 */
export function isPeakSeason(date: Date): boolean {
  const month = date.getMonth();
  // Peak: June-August (summer) + December (holidays)
  return month >= 5 && month <= 7 || month === 11;
}

/**
 * Calculate adjusted forecast considering seasons and holidays
 */
export function adjustForecastWithSeasoning(
  baseRevenue: number,
  date: Date,
  seasonalFactors: Map<number, SeasonalFactor>
): number {
  // Apply seasonal adjustment
  const seasonallyAdjusted = applySeasonalAdjustment(
    baseRevenue,
    date.getMonth(),
    seasonalFactors
  );

  // Apply holiday impact
  const holidayMultiplier = getHolidayImpact(date);

  const finalRevenue = seasonallyAdjusted * holidayMultiplier;

  return Math.round(finalRevenue * 100) / 100;
}

/**
 * Get seasonal pattern summary for explanation
 */
export function getSeasonalSummary(
  seasonalFactors: Map<number, SeasonalFactor>
): string {
  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];

  const peaks = Array.from(seasonalFactors.entries())
    .filter(([_, factor]) => factor.factor > 1.2)
    .map(([month, _]) => monthNames[month]);

  const troughs = Array.from(seasonalFactors.entries())
    .filter(([_, factor]) => factor.factor < 0.8)
    .map(([month, _]) => monthNames[month]);

  let summary = '';
  if (peaks.length > 0) {
    summary += `Peak months: ${peaks.join(', ')}. `;
  }
  if (troughs.length > 0) {
    summary += `Low months: ${troughs.join(', ')}.`;
  }

  return summary || 'Relatively stable throughout the year.';
}
