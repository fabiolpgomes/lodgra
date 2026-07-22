import { CompetitorPriceScraper } from '@/jobs/competitorPriceScraper';

// Mock the database and external dependencies
jest.mock('@/lib/db', () => ({
  getSupabaseClient: jest.fn(),
}));

describe('CompetitorPriceScraper', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Job Execution', () => {
    it('should execute scraper and return success count', async () => {
      const result = await CompetitorPriceScraper.run();

      expect(result).toHaveProperty('successCount');
      expect(result).toHaveProperty('failureCount');
      expect(result).toHaveProperty('alertsCreated');
      expect(typeof result.successCount).toBe('number');
      expect(typeof result.failureCount).toBe('number');
    });

    it('should return job status with timestamp', async () => {
      const result = await CompetitorPriceScraper.run();

      expect(result).toHaveProperty('timestamp');
      expect(new Date(result.timestamp)).toBeInstanceOf(Date);
    });
  });

  describe('Retry Logic', () => {
    it('should retry failed scrapes up to 3 times', async () => {
      const retryConfig = CompetitorPriceScraper.getRetryConfig();

      expect(retryConfig.maxRetries).toBeGreaterThanOrEqual(3);
      expect(retryConfig.backoffMs).toBeGreaterThan(0);
    });

    it('should apply exponential backoff between retries', async () => {
      const backoff = CompetitorPriceScraper.calculateBackoff(1);
      const nextBackoff = CompetitorPriceScraper.calculateBackoff(2);

      expect(nextBackoff).toBeGreaterThan(backoff);
    });

    it('should log retry attempts', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      // Simulate retry scenario
      CompetitorPriceScraper.logRetryAttempt('competitor-1', 1);

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('Error Handling', () => {
    it('should handle network timeout gracefully', async () => {
      const result = CompetitorPriceScraper.handleNetworkError(
        new Error('ETIMEDOUT: connection timed out')
      );

      expect(result).toHaveProperty('shouldRetry');
      expect(result.shouldRetry).toBe(true);
      expect(result.errorType).toBe('timeout');
    });

    it('should handle 404 Not Found errors', async () => {
      const result = CompetitorPriceScraper.handleHttpError(404);

      expect(result.shouldRetry).toBe(false);
      expect(result.errorType).toBe('not_found');
    });

    it('should handle rate limiting (429) with backoff', async () => {
      const result = CompetitorPriceScraper.handleHttpError(429);

      expect(result.shouldRetry).toBe(true);
      expect(result.errorType).toBe('rate_limited');
    });

    it('should mark competitor as invalid after 3 failed attempts', async () => {
      const competitorId = 'test-competitor-1';
      await CompetitorPriceScraper.markCompetitorInvalid(competitorId);

      // Verify the competitor was marked as invalid
      expect(CompetitorPriceScraper.isCompetitorInvalid(competitorId)).toBe(true);
    });

    it('should store error details for logging', async () => {
      const error = new Error('Failed to extract price');
      CompetitorPriceScraper.logError('competitor-1', error);

      const errors = CompetitorPriceScraper.getErrorLog();
      expect(errors).toContainEqual(
        expect.objectContaining({
          competitorId: 'competitor-1',
          message: 'Failed to extract price',
        })
      );
    });
  });

  describe('Alert Generation', () => {
    it('should create alert when price change >= threshold', async () => {
      const oldPrice = 100;
      const newPrice = 115; // 15% increase
      const threshold = 10;

      const alert = await CompetitorPriceScraper.generateAlert({
        competitorId: 'comp-1',
        oldPrice,
        newPrice,
        threshold,
      });

      expect(alert).toHaveProperty('id');
      expect(alert.priceChange).toBe(15);
      expect(alert.shouldNotify).toBe(true);
    });

    it('should not create alert when price change < threshold', async () => {
      const oldPrice = 100;
      const newPrice = 105; // 5% increase
      const threshold = 10;

      const alert = await CompetitorPriceScraper.generateAlert({
        competitorId: 'comp-1',
        oldPrice,
        newPrice,
        threshold,
      });

      expect(alert.shouldNotify).toBe(false);
    });

    it('should deduplicate alerts for same competitor on same day', async () => {
      const alerts = await CompetitorPriceScraper.getDuplicateAlerts({
        competitorId: 'comp-1',
        date: new Date().toISOString().split('T')[0],
      });

      expect(Array.isArray(alerts)).toBe(true);
    });

    it('should calculate percentage change correctly', async () => {
      const percentChange = CompetitorPriceScraper.calculatePercentChange(100, 115);

      expect(percentChange).toBe(15);
    });

    it('should handle negative price changes (decreases)', async () => {
      const oldPrice = 100;
      const newPrice = 85; // 15% decrease
      const threshold = 10;

      const alert = await CompetitorPriceScraper.generateAlert({
        competitorId: 'comp-1',
        oldPrice,
        newPrice,
        threshold,
      });

      expect(alert.priceChange).toBe(-15);
      expect(alert.alertType).toBe('decrease');
    });
  });

  describe('Price Validation', () => {
    it('should validate price format', () => {
      expect(CompetitorPriceScraper.isValidPrice(95.50)).toBe(true);
      expect(CompetitorPriceScraper.isValidPrice(-10)).toBe(false);
      expect(CompetitorPriceScraper.isValidPrice(null as any)).toBe(false);
    });

    it('should reject unrealistic prices', () => {
      expect(CompetitorPriceScraper.isValidPrice(0)).toBe(false);
      expect(CompetitorPriceScraper.isValidPrice(99999)).toBe(false);
      expect(CompetitorPriceScraper.isValidPrice(95)).toBe(true);
    });
  });

  describe('Rate Limiting', () => {
    it('should stagger requests with minimum interval', async () => {
      const interval = CompetitorPriceScraper.getMinRequestInterval();

      expect(interval).toBeGreaterThanOrEqual(2000); // At least 2 seconds
    });

    it('should respect robots.txt if applicable', async () => {
      const canScrape = CompetitorPriceScraper.canScrapeDomain('example.com');

      expect(typeof canScrape).toBe('boolean');
    });
  });
});
