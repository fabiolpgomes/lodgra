/**
 * Time-series analysis for revenue forecasting
 * Uses Simple Moving Average (SMA) + seasonal decomposition
 */

export interface BookingData {
  date: Date;
  revenue: number;
  occupancy: boolean;
}

export interface ForecastResult {
  date: Date;
  projectedRevenue: number;
  confidenceInterval: {
    lower: number;
    upper: number;
  };
}

export interface TimeSeriesAnalysis {
  averageRevenue: number;
  dayOfWeekPattern: Map<number, number>;
  monthlyPattern: Map<number, number>;
  trend: 'increasing' | 'decreasing' | 'stable';
  volatility: number;
  seasonalityStrength: number;
}

/**
 * Calculate Simple Moving Average (SMA) for smoothing data
 */
export function calculateSMA(
  values: number[],
  windowSize: number = 7
): number[] {
  if (values.length < windowSize) {
    return values;
  }

  const sma: number[] = [];
  for (let i = 0; i <= values.length - windowSize; i++) {
    const window = values.slice(i, i + windowSize);
    const avg = window.reduce((sum, val) => sum + val, 0) / windowSize;
    sma.push(Math.round(avg * 100) / 100);
  }
  return sma;
}

/**
 * Analyze time-series booking data to extract patterns
 */
export function analyzeTimeSeries(bookings: BookingData[]): TimeSeriesAnalysis {
  if (bookings.length === 0) {
    return {
      averageRevenue: 0,
      dayOfWeekPattern: new Map(),
      monthlyPattern: new Map(),
      trend: 'stable',
      volatility: 0,
      seasonalityStrength: 0,
    };
  }

  // Calculate average revenue
  const revenues = bookings.map(b => b.revenue);
  const averageRevenue = revenues.reduce((a, b) => a + b, 0) / revenues.length;

  // Day-of-week pattern (0 = Sunday, 6 = Saturday)
  const dayOfWeekPattern = new Map<number, number[]>();
  for (let i = 0; i < 7; i++) {
    dayOfWeekPattern.set(i, []);
  }

  bookings.forEach(booking => {
    const dayOfWeek = booking.date.getDay();
    const pattern = dayOfWeekPattern.get(dayOfWeek) || [];
    pattern.push(booking.revenue);
    dayOfWeekPattern.set(dayOfWeek, pattern);
  });

  const dayOfWeekAvg = new Map<number, number>();
  dayOfWeekPattern.forEach((values, day) => {
    if (values.length > 0) {
      const avg = values.reduce((a, b) => a + b, 0) / values.length;
      dayOfWeekAvg.set(day, Math.round(avg * 100) / 100);
    }
  });

  // Monthly pattern
  const monthlyPattern = new Map<number, number[]>();
  for (let i = 0; i < 12; i++) {
    monthlyPattern.set(i, []);
  }

  bookings.forEach(booking => {
    const month = booking.date.getMonth();
    const pattern = monthlyPattern.get(month) || [];
    pattern.push(booking.revenue);
    monthlyPattern.set(month, pattern);
  });

  const monthlyAvg = new Map<number, number>();
  monthlyPattern.forEach((values, month) => {
    if (values.length > 0) {
      const avg = values.reduce((a, b) => a + b, 0) / values.length;
      monthlyAvg.set(month, Math.round(avg * 100) / 100);
    }
  });

  // Calculate volatility (standard deviation)
  const variance =
    revenues.reduce((sum, val) => sum + Math.pow(val - averageRevenue, 2), 0) /
    revenues.length;
  const volatility = Math.sqrt(variance);

  // Calculate trend (compare first third to last third)
  const thirdSize = Math.floor(revenues.length / 3);
  const firstThirdAvg =
    revenues.slice(0, thirdSize).reduce((a, b) => a + b, 0) / thirdSize;
  const lastThirdAvg =
    revenues.slice(-thirdSize).reduce((a, b) => a + b, 0) / thirdSize;

  let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
  const trendThreshold = averageRevenue * 0.05; // 5% threshold
  if (lastThirdAvg > firstThirdAvg + trendThreshold) {
    trend = 'increasing';
  } else if (lastThirdAvg < firstThirdAvg - trendThreshold) {
    trend = 'decreasing';
  }

  // Calculate seasonality strength (ratio of seasonal variation to trend variation)
  const seasonalityStrength =
    Math.max(...Array.from(dayOfWeekAvg.values())) -
    Math.min(...Array.from(dayOfWeekAvg.values()));

  return {
    averageRevenue,
    dayOfWeekPattern: dayOfWeekAvg,
    monthlyPattern: monthlyAvg,
    trend,
    volatility: Math.round(volatility * 100) / 100,
    seasonalityStrength: Math.round(seasonalityStrength * 100) / 100,
  };
}

/**
 * Generate forecast for specified number of days
 */
export function generateForecast(
  bookings: BookingData[],
  forecastDays: number,
  startDate: Date = new Date()
): ForecastResult[] {
  if (bookings.length === 0) {
    return [];
  }

  const analysis = analyzeTimeSeries(bookings);
  const results: ForecastResult[] = [];

  for (let i = 0; i < forecastDays; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);

    // Base on average + day-of-week pattern
    const dayOfWeek = date.getDay();
    const dayFactor = analysis.dayOfWeekPattern.get(dayOfWeek) || analysis.averageRevenue;
    const monthFactor = analysis.monthlyPattern.get(date.getMonth()) || analysis.averageRevenue;

    // Weighted average of day and month patterns
    let projectedRevenue = (dayFactor * 0.6 + monthFactor * 0.4);

    // Apply trend adjustment
    if (analysis.trend === 'increasing') {
      projectedRevenue *= 1.02; // 2% increase
    } else if (analysis.trend === 'decreasing') {
      projectedRevenue *= 0.98; // 2% decrease
    }

    // Calculate confidence interval (±15% of projected revenue)
    const confidenceInterval = projectedRevenue * 0.15;

    results.push({
      date,
      projectedRevenue: Math.round(projectedRevenue * 100) / 100,
      confidenceInterval: {
        lower: Math.max(0, Math.round((projectedRevenue - confidenceInterval) * 100) / 100),
        upper: Math.round((projectedRevenue + confidenceInterval) * 100) / 100,
      },
    });
  }

  return results;
}

/**
 * Calculate occupancy forecast based on historical occupancy
 */
export function calculateOccupancyForecast(bookings: BookingData[]): number {
  if (bookings.length === 0) {
    return 0;
  }

  const occupiedDays = bookings.filter(b => b.occupancy).length;
  const occupancyRate = (occupiedDays / bookings.length) * 100;

  return Math.round(occupancyRate * 100) / 100;
}

/**
 * Extract base price from revenue data
 * Assumes most bookings are for 1 night at base price
 */
export function estimateBasePrice(bookings: BookingData[]): number {
  if (bookings.length === 0) {
    return 0;
  }

  const revenues = bookings.map(b => b.revenue).sort((a, b) => a - b);
  // Use median to avoid outliers
  const median = revenues[Math.floor(revenues.length / 2)];

  return Math.round(median * 100) / 100;
}
