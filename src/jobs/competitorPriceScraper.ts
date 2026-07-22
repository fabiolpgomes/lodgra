/**
 * Background job for competitor price scraping (Story 36.10)
 * Runs daily to fetch current prices from competitor listings
 */

import { Competitor, CompetitorPriceAlert } from '@/types/competitor';

export interface ScraperResult {
  successCount: number;
  failureCount: number;
  alertsCreated: number;
  timestamp: string;
  errors?: string[];
}

interface RetryConfig {
  maxRetries: number;
  backoffMs: number;
}

interface ErrorResult {
  shouldRetry: boolean;
  errorType: string;
}

interface ErrorLog {
  competitorId: string;
  message: string;
  timestamp: string;
}

/**
 * CompetitorPriceScraper Job Handler
 * Main scraper class with static methods for testing
 */
export class CompetitorPriceScraper {
  private static invalidCompetitors = new Set<string>();
  private static errorLogs: ErrorLog[] = [];

  /**
   * Main scraper job execution
   */
  static async run(): Promise<ScraperResult> {
    console.log('[CompetitorScraper] Starting price scrape job');

    const result: ScraperResult = {
      successCount: 0,
      failureCount: 0,
      alertsCreated: 0,
      timestamp: new Date().toISOString(),
      errors: [],
    };

    try {
      // Fetch all competitors for all properties
      // This would typically come from the database
      return result;
    } catch (error) {
      console.error('[CompetitorScraper] Job failed:', error);
      throw error;
    }
  }

  /**
   * Get retry configuration
   */
  static getRetryConfig(): RetryConfig {
    return {
      maxRetries: 3,
      backoffMs: 1000,
    };
  }

  /**
   * Calculate exponential backoff delay
   */
  static calculateBackoff(attempt: number): number {
    const baseMs = 1000;
    return baseMs * Math.pow(2, attempt - 1);
  }

  /**
   * Log a retry attempt
   */
  static logRetryAttempt(competitorId: string, attempt: number): void {
    console.log(`[CompetitorScraper] Retrying competitor ${competitorId}, attempt ${attempt}`);
  }

  /**
   * Handle network errors
   */
  static handleNetworkError(error: Error): ErrorResult {
    if (error.message.includes('ETIMEDOUT')) {
      return { shouldRetry: true, errorType: 'timeout' };
    }
    if (error.message.includes('ECONNREFUSED')) {
      return { shouldRetry: true, errorType: 'connection_refused' };
    }
    return { shouldRetry: false, errorType: 'unknown' };
  }

  /**
   * Handle HTTP errors
   */
  static handleHttpError(statusCode: number): ErrorResult {
    if (statusCode === 429) {
      return { shouldRetry: true, errorType: 'rate_limited' };
    }
    if (statusCode === 404) {
      return { shouldRetry: false, errorType: 'not_found' };
    }
    if (statusCode >= 500) {
      return { shouldRetry: true, errorType: 'server_error' };
    }
    return { shouldRetry: false, errorType: `http_${statusCode}` };
  }

  /**
   * Mark competitor as invalid
   */
  static async markCompetitorInvalid(competitorId: string): Promise<void> {
    this.invalidCompetitors.add(competitorId);
  }

  /**
   * Check if competitor is marked as invalid
   */
  static isCompetitorInvalid(competitorId: string): boolean {
    return this.invalidCompetitors.has(competitorId);
  }

  /**
   * Log an error
   */
  static logError(competitorId: string, error: Error): void {
    this.errorLogs.push({
      competitorId,
      message: error.message,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Get error log
   */
  static getErrorLog(): ErrorLog[] {
    return this.errorLogs;
  }

  /**
   * Get minimum request interval to respect rate limits
   */
  static getMinRequestInterval(): number {
    return 2000; // 2 seconds
  }

  /**
   * Check if domain can be scraped
   */
  static canScrapeDomain(domain: string): boolean {
    // Would check robots.txt in real implementation
    return true;
  }

  /**
   * Generate alert for price change
   */
  static async generateAlert(data: {
    competitorId: string;
    oldPrice: number;
    newPrice: number;
    threshold: number;
  }): Promise<{
    id: string;
    priceChange: number;
    shouldNotify: boolean;
    alertType?: string;
  }> {
    const priceChange = ((data.newPrice - data.oldPrice) / data.oldPrice) * 100;
    const shouldNotify = Math.abs(priceChange) >= data.threshold;

    return {
      id: `alert-${Date.now()}`,
      priceChange: Math.round(priceChange * 100) / 100,
      shouldNotify,
      alertType: data.newPrice > data.oldPrice ? 'increase' : 'decrease',
    };
  }

  /**
   * Get duplicate alerts for deduplication
   */
  static async getDuplicateAlerts(data: {
    competitorId: string;
    date: string;
  }): Promise<any[]> {
    // Would check database in real implementation
    return [];
  }

  /**
   * Calculate percentage change
   */
  static calculatePercentChange(oldPrice: number, newPrice: number): number {
    return ((newPrice - oldPrice) / oldPrice) * 100;
  }

  /**
   * Validate price format
   */
  static isValidPrice(price: any): boolean {
    if (typeof price !== 'number') return false;
    if (price <= 0 || price >= 99999) return false;
    return true;
  }
}

/**
 * Main scraper function (for backwards compatibility)
 * Fetches prices for all competitors for a property
 */
export async function scrapeCompetitorPrices(
  propertyId: string
): Promise<ScraperResult> {
  console.log(`[CompetitorScraper] Starting price scrape for property ${propertyId}`);

  const result: ScraperResult = {
    successCount: 0,
    failureCount: 0,
    alertsCreated: 0,
    timestamp: new Date().toISOString(),
    errors: [],
  };

  try {
    // Fetch all competitors for the property
    // This would typically come from the database via an API call
    const response = await fetch(`/api/properties/${propertyId}/competitors`);

    if (!response.ok) {
      result.errors?.push(`Failed to fetch competitors: ${response.statusText}`);
      return result;
    }

    const { competitors } = await response.json();

    if (!Array.isArray(competitors) || competitors.length === 0) {
      console.log(`[CompetitorScraper] No competitors found for property ${propertyId}`);
      return result;
    }

    // Process each competitor
    for (const competitor of competitors) {
      try {
        if (!competitor.isActive) {
          continue;
        }

        // Get price for this competitor
        const price = await getCompetitorPrice(competitor);

        if (price !== null) {
          // Store price in database
          await storePriceHistory(competitor.id, price);

          // Check if price change warrants an alert
          if (competitor.lastScrapedPrice !== null && competitor.lastScrapedPrice !== undefined) {
            const percentChange =
              Math.abs(price - competitor.lastScrapedPrice) / competitor.lastScrapedPrice;

            if (percentChange >= competitor.priceAlertThreshold / 100) {
              // Create alert
              await createPriceAlert(
                competitor,
                competitor.lastScrapedPrice,
                price,
                percentChange
              );
              result.alertsCreated++;
            }
          }

          result.successCount++;
        } else {
          result.failureCount++;
          result.errors.push(`Failed to extract price for ${competitor.competitorName}`);
        }
      } catch (error) {
        result.failureCount++;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        result.errors.push(`Error processing ${competitor.competitorName}: ${errorMessage}`);
        console.error(`[CompetitorScraper] Error:`, error);
      }
    }

    console.log(
      `[CompetitorScraper] Completed: ${result.successCount} succeeded, ${result.failureCount} failed`
    );
    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    result.errors.push(`Scraper failed: ${errorMessage}`);
    console.error(`[CompetitorScraper] Fatal error:`, error);
    return result;
  }
}

/**
 * Attempt to scrape price from competitor URL
 * Supports Airbnb, Booking.com, VRBO, and generic parsing
 */
async function getCompetitorPrice(competitor: Competitor): Promise<number | null> {
  try {
    // In a real implementation, this would use Cheerio or Puppeteer to parse the HTML
    // For now, we'll return a placeholder

    console.log(`[CompetitorScraper] Scraping price for ${competitor.competitorName}`);

    // Attempt to fetch the page (in production, would use a headless browser)
    const response = await fetch(competitor.competitorUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
    });

    if (!response.ok) {
      console.warn(`[CompetitorScraper] Failed to fetch ${competitor.competitorUrl}: ${response.status}`);
      return null;
    }

    // Parse based on platform
    const platform = competitor.platform;
    let price: number | null = null;

    if (platform === 'airbnb') {
      price = await parseAirbnbPrice(response);
    } else if (platform === 'booking.com') {
      price = await parseBookingComPrice(response);
    } else if (platform === 'vrbo') {
      price = await parseVrboPrice(response);
    } else {
      // Generic parsing
      price = await parseGenericPrice(response);
    }

    return price;
  } catch (error) {
    console.error(`[CompetitorScraper] Scraping error for ${competitor.competitorName}:`, error);
    return null;
  }
}

/**
 * Parse Airbnb price from HTML response
 * Note: Airbnb heavily relies on JavaScript rendering, so this is a placeholder
 */
async function parseAirbnbPrice(response: Response): Promise<number | null> {
  // In production, would use Puppeteer for JavaScript-heavy sites
  // For now, return null as we can't reliably parse without headless browser
  console.log('[CompetitorScraper] Airbnb parsing requires headless browser (not implemented)');
  return null;
}

/**
 * Parse Booking.com price from HTML response
 */
async function parseBookingComPrice(response: Response): Promise<number | null> {
  // In production, would parse HTML using Cheerio
  console.log('[CompetitorScraper] Booking.com parsing (not fully implemented)');
  return null;
}

/**
 * Parse VRBO price from HTML response
 */
async function parseVrboPrice(response: Response): Promise<number | null> {
  // In production, would parse HTML using Cheerio
  console.log('[CompetitorScraper] VRBO parsing (not fully implemented)');
  return null;
}

/**
 * Generic price parser for other platforms
 */
async function parseGenericPrice(response: Response): Promise<number | null> {
  try {
    const html = await response.text();

    // Try common price regex patterns
    const patterns = [
      /€\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/,
      /(\d+(?:,\d{3})*(?:\.\d{2})?)\s*EUR/i,
      /price[:\s]+€?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/i,
    ];

    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match) {
        const priceStr = match[1].replace(/[€,]/g, '.').replace(/\.(?!$)/g, '');
        const price = parseFloat(priceStr);
        if (!isNaN(price) && price > 0) {
          return price;
        }
      }
    }

    return null;
  } catch (error) {
    console.error('[CompetitorScraper] Generic parsing error:', error);
    return null;
  }
}

/**
 * Store price in competitor_price_history table
 */
async function storePriceHistory(
  competitorId: string,
  price: number
): Promise<void> {
  try {
    // This would call the database/API to store the price
    console.log(`[CompetitorScraper] Storing price €${price} for competitor ${competitorId}`);

    // Placeholder - in real implementation, would call API or database
    // await db.competitorPriceHistory.create({
    //   competitorId,
    //   price,
    //   scrapeDate: new Date().toISOString().split('T')[0],
    //   recordedAt: new Date().toISOString(),
    //   scrapeSource: 'automated',
    //   isValid: true,
    // });
  } catch (error) {
    console.error(`[CompetitorScraper] Failed to store price for ${competitorId}:`, error);
    throw error;
  }
}

/**
 * Create price alert if significant change detected
 */
async function createPriceAlert(
  competitor: Competitor,
  previousPrice: number,
  newPrice: number,
  percentChange: number
): Promise<void> {
  try {
    const alertType = newPrice > previousPrice ? 'increase' : 'decrease';
    const priceChange = newPrice - previousPrice;

    console.log(
      `[CompetitorScraper] Creating alert: ${competitor.competitorName} ${alertType} €${previousPrice} → €${newPrice}`
    );

    // This would call the API/database to create an alert
    // await db.competitorPriceAlerts.create({
    //   propertyId: competitor.propertyId,
    //   competitorId: competitor.id,
    //   previousPrice,
    //   newPrice,
    //   priceChange,
    //   percentageChange: percentChange * 100,
    //   alertType,
    //   isRead: false,
    //   createdAt: new Date().toISOString(),
    // });

    // Optionally trigger email notification
    // await sendAlertEmail(competitor, alertType, priceChange, percentChange);
  } catch (error) {
    console.error(`[CompetitorScraper] Failed to create alert for ${competitor.id}:`, error);
    throw error;
  }
}
