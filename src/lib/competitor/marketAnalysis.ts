/**
 * Market position analysis for competitor price monitoring
 */

export interface MarketAnalysis {
  marketAveragePrice: number;
  marketMinPrice: number;
  marketMaxPrice: number;
  hostPrice: number;
  pricePosition: 'very_low' | 'low' | 'competitive' | 'high' | 'very_high';
  percentageDifference: number; // positive = higher than average, negative = lower
  competitorCount: number;
  marketVolatility: number; // standard deviation
  confidenceScore: number;
  recommendation: string;
}

/**
 * Calculate market analysis based on competitor prices
 */
export function analyzeMarketPosition(
  hostPrice: number,
  competitorPrices: number[]
): MarketAnalysis {
  if (competitorPrices.length === 0) {
    return {
      marketAveragePrice: hostPrice,
      marketMinPrice: hostPrice,
      marketMaxPrice: hostPrice,
      hostPrice,
      pricePosition: 'competitive',
      percentageDifference: 0,
      competitorCount: 0,
      marketVolatility: 0,
      confidenceScore: 0,
      recommendation: 'Add competitor data for market analysis.',
    };
  }

  // Sort prices and remove outliers (top/bottom 10%)
  const sortedPrices = competitorPrices.sort((a, b) => a - b);
  const outlierCount = Math.max(1, Math.floor(sortedPrices.length * 0.1));
  const trimmedPrices = sortedPrices.slice(
    outlierCount,
    sortedPrices.length - outlierCount
  );

  // Calculate statistics
  const marketAveragePrice =
    trimmedPrices.reduce((a, b) => a + b, 0) / trimmedPrices.length;
  const marketMinPrice = Math.min(...trimmedPrices);
  const marketMaxPrice = Math.max(...trimmedPrices);

  // Calculate volatility (standard deviation)
  const variance =
    trimmedPrices.reduce(
      (sum, price) => sum + Math.pow(price - marketAveragePrice, 2),
      0
    ) / trimmedPrices.length;
  const marketVolatility = Math.sqrt(variance);

  // Calculate host's position
  const priceDifference = hostPrice - marketAveragePrice;
  const percentageDifference = (priceDifference / marketAveragePrice) * 100;

  // Determine position
  let pricePosition: 'very_low' | 'low' | 'competitive' | 'high' | 'very_high' =
    'competitive';
  if (percentageDifference > 20) {
    pricePosition = 'very_high';
  } else if (percentageDifference > 10) {
    pricePosition = 'high';
  } else if (percentageDifference < -20) {
    pricePosition = 'very_low';
  } else if (percentageDifference < -10) {
    pricePosition = 'low';
  }

  // Confidence score based on sample size
  let confidenceScore = 0;
  if (trimmedPrices.length >= 10) {
    confidenceScore = 0.95;
  } else if (trimmedPrices.length >= 5) {
    confidenceScore = 0.8;
  } else if (trimmedPrices.length >= 3) {
    confidenceScore = 0.6;
  } else {
    confidenceScore = 0.3;
  }

  // Generate recommendation
  const recommendation = generatePriceRecommendation(
    pricePosition,
    percentageDifference,
    confidenceScore
  );

  return {
    marketAveragePrice: Math.round(marketAveragePrice * 100) / 100,
    marketMinPrice: Math.round(marketMinPrice * 100) / 100,
    marketMaxPrice: Math.round(marketMaxPrice * 100) / 100,
    hostPrice,
    pricePosition,
    percentageDifference: Math.round(percentageDifference * 100) / 100,
    competitorCount: trimmedPrices.length,
    marketVolatility: Math.round(marketVolatility * 100) / 100,
    confidenceScore: Math.round(confidenceScore * 100) / 100,
    recommendation,
  };
}

/**
 * Generate pricing recommendation based on market analysis
 */
function generatePriceRecommendation(
  position: string,
  percentageDifference: number,
  confidence: number
): string {
  if (confidence < 0.5) {
    return 'Insufficient market data. Add more competitors for analysis.';
  }

  switch (position) {
    case 'very_low':
      return `Your price is ${Math.abs(percentageDifference).toFixed(0)}% below market average. Consider increasing price to improve revenue.`;
    case 'low':
      return `Your price is ${Math.abs(percentageDifference).toFixed(0)}% below market. You may be underpriced – consider modest increase.`;
    case 'competitive':
      return 'Your price is competitive with market average. Monitor for changes.';
    case 'high':
      return `Your price is ${percentageDifference.toFixed(0)}% above market. Ensure value justifies premium.`;
    case 'very_high':
      return `Your price is ${percentageDifference.toFixed(0)}% above market. Consider price reduction to match competition.`;
    default:
      return 'Monitor market trends to optimize pricing.';
  }
}

/**
 * Calculate price change metrics over time period
 */
export function calculatePriceChangeMetrics(
  currentPrice: number,
  previousPrice: number
): { change: number; percentageChange: number; direction: 'up' | 'down' | 'stable' } {
  const change = currentPrice - previousPrice;
  const percentageChange = (change / previousPrice) * 100;

  let direction: 'up' | 'down' | 'stable' = 'stable';
  if (percentageChange > 1) {
    direction = 'up';
  } else if (percentageChange < -1) {
    direction = 'down';
  }

  return {
    change: Math.round(change * 100) / 100,
    percentageChange: Math.round(percentageChange * 100) / 100,
    direction,
  };
}

/**
 * Check if price change is significant (exceeds threshold)
 */
export function isSignificantPriceChange(
  percentageChange: number,
  threshold: number = 10
): boolean {
  return Math.abs(percentageChange) > threshold;
}

/**
 * Get market range description
 */
export function getMarketRangeDescription(
  minPrice: number,
  maxPrice: number,
  currency: string = '€'
): string {
  return `Competitors charge ${currency}${Math.round(minPrice)}-${currency}${Math.round(maxPrice)} per night`;
}

/**
 * Calculate market volatility interpretation
 */
export function interpretMarketVolatility(volatility: number): string {
  if (volatility < 10) {
    return 'Very stable market – prices change rarely';
  } else if (volatility < 20) {
    return 'Stable market – prices change occasionally';
  } else if (volatility < 40) {
    return 'Moderate volatility – prices change regularly';
  } else {
    return 'High volatility – frequent price changes';
  }
}

/**
 * Get position color for UI
 */
export function getPositionColor(position: string): string {
  switch (position) {
    case 'very_low':
      return '#10b981'; // Green - opportunity
    case 'low':
      return '#3b82f6'; // Blue - slightly low
    case 'competitive':
      return '#6b7280'; // Gray - neutral
    case 'high':
      return '#f59e0b'; // Amber - slightly high
    case 'very_high':
      return '#ef4444'; // Red - significantly high
    default:
      return '#6b7280';
  }
}

/**
 * Format price for display
 */
export function formatPrice(price: number, currency: string = '€'): string {
  return `${currency}${price.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
}
