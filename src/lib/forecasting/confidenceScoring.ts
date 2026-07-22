/**
 * Confidence scoring for revenue forecasts
 * Higher score = more reliable forecast
 */

export interface ConfidenceScore {
  score: number; // 0-1
  level: 'low' | 'medium' | 'high';
  reasoning: string;
  factors: {
    dataQuality: number;
    consistency: number;
    sampleSize: number;
    trendStability: number;
  };
}

const CONFIDENCE_THRESHOLDS = {
  HIGH: 0.75,
  MEDIUM: 0.5,
  LOW: 0.0,
};

/**
 * Calculate confidence score based on data quality and consistency
 */
export function calculateConfidenceScore(
  dataPoints: number,
  variance: number,
  averageRevenue: number,
  trendStability: number,
  seasonalityStrength: number
): ConfidenceScore {
  // Factor 1: Data quality (sample size)
  // Minimum 10 data points for meaningful analysis
  let dataQuality = Math.min(dataPoints / 30, 1.0); // Max at 30 data points

  if (dataPoints < 10) {
    dataQuality *= 0.5; // Heavy penalty for insufficient data
  }

  // Factor 2: Consistency (inverse of variance coefficient)
  const coefficientOfVariation = averageRevenue > 0 ? variance / averageRevenue : 1.0;
  let consistency = Math.max(0, 1 - coefficientOfVariation);

  // Clamp between 0 and 1
  consistency = Math.max(0, Math.min(1, consistency));

  // Factor 3: Sample size adequacy
  // We need at least 3 data points per month (90 days = ~3 months)
  let sampleSize = Math.min(dataPoints / 9, 1.0);

  if (dataPoints < 5) {
    sampleSize = 0.2;
  }

  // Factor 4: Trend stability
  // More stable trend = more confidence
  let trendStabilityScore = 1 - Math.abs(trendStability);

  // Factor 5: Seasonality
  // Strong seasonality can reduce confidence if we don't have seasonal data
  let seasonalityFactor = 1.0;
  if (seasonalityStrength > 0.3 && dataPoints < 90) {
    seasonalityFactor = 0.7; // Reduce confidence if strong seasonality but limited data
  }

  // Weighted average of all factors
  const weights = {
    dataQuality: 0.25,
    consistency: 0.25,
    sampleSize: 0.25,
    trendStability: 0.15,
    seasonality: 0.10,
  };

  let rawScore =
    dataQuality * weights.dataQuality +
    consistency * weights.consistency +
    sampleSize * weights.sampleSize +
    trendStabilityScore * weights.trendStability +
    seasonalityFactor * weights.seasonality;

  // Round to 2 decimal places
  const score = Math.round(rawScore * 100) / 100;

  // Determine confidence level
  let level: 'low' | 'medium' | 'high' = 'low';
  if (score >= CONFIDENCE_THRESHOLDS.HIGH) {
    level = 'high';
  } else if (score >= CONFIDENCE_THRESHOLDS.MEDIUM) {
    level = 'medium';
  }

  // Generate reasoning
  const reasoning = generateConfidenceReasoning(
    dataPoints,
    coefficientOfVariation,
    level,
    seasonalityStrength
  );

  return {
    score,
    level,
    reasoning,
    factors: {
      dataQuality: Math.round(dataQuality * 100) / 100,
      consistency: Math.round(consistency * 100) / 100,
      sampleSize: Math.round(sampleSize * 100) / 100,
      trendStability: Math.round(trendStabilityScore * 100) / 100,
    },
  };
}

/**
 * Generate human-readable reasoning for confidence score
 */
function generateConfidenceReasoning(
  dataPoints: number,
  coefficientOfVariation: number,
  level: string,
  seasonalityStrength: number
): string {
  const reasons: string[] = [];

  if (dataPoints < 10) {
    reasons.push('Limited historical data');
  } else if (dataPoints < 30) {
    reasons.push('Moderate amount of historical data');
  } else if (dataPoints < 90) {
    reasons.push('Good amount of historical data');
  } else {
    reasons.push('Comprehensive historical data (3+ months)');
  }

  if (coefficientOfVariation > 0.3) {
    reasons.push('High revenue variability');
  } else if (coefficientOfVariation > 0.15) {
    reasons.push('Moderate revenue variability');
  } else {
    reasons.push('Stable revenue patterns');
  }

  if (seasonalityStrength > 0.3) {
    reasons.push('Strong seasonal patterns detected');
  }

  return `Based on ${dataPoints} ${dataPoints === 1 ? 'booking' : 'bookings'}. ${reasons.join('. ')}.`;
}

/**
 * Convert confidence score to percentage for UI display
 */
export function formatConfidencePercentage(score: number): string {
  return `${Math.round(score * 100)}%`;
}

/**
 * Get color for confidence level (for UI)
 */
export function getConfidenceColor(level: 'low' | 'medium' | 'high'): string {
  switch (level) {
    case 'high':
      return '#10b981'; // Green
    case 'medium':
      return '#f59e0b'; // Amber
    case 'low':
      return '#ef4444'; // Red
    default:
      return '#6b7280'; // Gray
  }
}

/**
 * Check if data is sufficient for reliable forecasting
 */
export function isDataSufficient(dataPoints: number): boolean {
  return dataPoints >= 10;
}

/**
 * Get warning message for insufficient data
 */
export function getDataWarning(dataPoints: number): string | null {
  const needed = 10 - dataPoints;

  if (dataPoints === 0) {
    return 'No booking data available. Forecast unavailable until you have bookings.';
  }

  if (dataPoints < 5) {
    return `Need ${needed} more booking records for any forecast accuracy.`;
  }

  if (dataPoints < 10) {
    return `Need ${needed} more booking records for reliable forecasting.`;
  }

  return null;
}

/**
 * Calculate forecast accuracy estimate (mock)
 * In a real implementation, this would use historical forecast vs actual data
 */
export function estimateForecastAccuracy(
  confidenceScore: number,
  forecastPeriodDays: number
): number {
  // Accuracy decreases with forecast period
  // 30-day: ~90% * confidence
  // 60-day: ~75% * confidence
  // 90-day: ~60% * confidence

  let basAccuracy = 0.9; // 90%
  if (forecastPeriodDays === 60) {
    basAccuracy = 0.75;
  } else if (forecastPeriodDays === 90) {
    basAccuracy = 0.6;
  }

  return Math.round(basAccuracy * confidenceScore * 100);
}
