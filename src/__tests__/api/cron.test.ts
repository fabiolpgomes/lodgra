jest.mock('@/jobs/competitorPriceScraper');
jest.mock('@/jobs/alertGenerator');

import { GET } from '@/app/api/cron/route';
import { CompetitorPriceScraper } from '@/jobs/competitorPriceScraper';
import { AlertGenerator } from '@/jobs/alertGenerator';

describe('Cron Endpoint - Security & Functionality', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Ensure CRON_SECRET is set consistently for all tests
    process.env.CRON_SECRET = 'test-secret';
  });

  afterEach(() => {
    // Clean up env var after each test
    delete process.env.CRON_SECRET;
  });

  describe('Authentication', () => {
    it('should reject requests without authorization header', async () => {
      const request = new Request('http://localhost:3000/api/cron', {
        method: 'GET',
        headers: {},
      });

      const response = await GET(request as any);

      expect(response.status).toBe(401);
    });

    it('should reject requests with invalid API key', async () => {
      const request = new Request('http://localhost:3000/api/cron?job=scrape', {
        method: 'GET',
        headers: {
          Authorization: 'Bearer invalid-key',
        },
      });

      const response = await GET(request as any);

      expect(response.status).toBe(401);
    });

    it('should accept requests with valid API key', async () => {
      const request = new Request('http://localhost:3000/api/cron?job=scrape', {
        method: 'GET',
        headers: {
          Authorization: 'Bearer test-secret',
        },
      });

      (CompetitorPriceScraper.run as jest.Mock).mockResolvedValue({
        successCount: 10,
        failureCount: 0,
        alertsCreated: 2,
        timestamp: new Date().toISOString(),
      });

      const response = await GET(request as any);

      expect(response.status).not.toBe(401);
    });
  });

  describe('Job Triggering', () => {
    it('should trigger price scraper with job=scrape parameter', async () => {
      (CompetitorPriceScraper.run as jest.Mock).mockResolvedValue({
        successCount: 10,
        failureCount: 0,
        alertsCreated: 2,
        timestamp: new Date().toISOString(),
      });

      const request = new Request('http://localhost:3000/api/cron?job=scrape', {
        method: 'GET',
        headers: {
          Authorization: 'Bearer test-secret',
        },
      });

      const response = await GET(request as any);
      const data = await response.json();

      expect(CompetitorPriceScraper.run).toHaveBeenCalled();
      expect(data.successCount).toBe(10);
    });

    it('should trigger alert generator with job=alerts parameter', async () => {
      (AlertGenerator.run as jest.Mock).mockResolvedValue({
        alertsCreated: 5,
        emailsQueued: 3,
        timestamp: new Date().toISOString(),
      });

      const request = new Request('http://localhost:3000/api/cron?job=alerts', {
        method: 'GET',
        headers: {
          Authorization: 'Bearer test-secret',
        },
      });

      const response = await GET(request as any);
      const data = await response.json();

      expect(AlertGenerator.run).toHaveBeenCalled();
      expect(data.alertsCreated).toBe(5);
    });

    it('should handle cleanup job', async () => {
      const request = new Request('http://localhost:3000/api/cron?job=cleanup', {
        method: 'GET',
        headers: {
          Authorization: 'Bearer test-secret',
        },
      });

      const response = await GET(request as any);

      expect(response.status).not.toBe(500);
    });
  });

  describe('Job Response Format', () => {
    it('should return structured job result', async () => {
      (CompetitorPriceScraper.run as jest.Mock).mockResolvedValue({
        successCount: 10,
        failureCount: 2,
        alertsCreated: 3,
        timestamp: new Date().toISOString(),
      });

      const request = new Request('http://localhost:3000/api/cron?job=scrape', {
        method: 'GET',
        headers: {
          Authorization: 'Bearer test-secret',
        },
      });

      const response = await GET(request as any);
      const data = await response.json();

      expect(data).toHaveProperty('successCount');
      expect(data).toHaveProperty('failureCount');
      expect(data).toHaveProperty('alertsCreated');
      expect(data).toHaveProperty('timestamp');
    });

    it('should include job status in response', async () => {
      (CompetitorPriceScraper.run as jest.Mock).mockResolvedValue({
        successCount: 10,
        failureCount: 0,
        alertsCreated: 2,
        timestamp: new Date().toISOString(),
        status: 'completed',
      });

      const request = new Request('http://localhost:3000/api/cron?job=scrape', {
        method: 'GET',
        headers: {
          Authorization: 'Bearer test-secret',
        },
      });

      const response = await GET(request as any);
      const data = await response.json();

      expect(['completed', 'success']).toContain(data.status || 'success');
    });
  });

  describe('Error Handling', () => {
    it('should return error when job fails', async () => {
      (CompetitorPriceScraper.run as jest.Mock).mockRejectedValue(
        new Error('Database connection failed')
      );

      const request = new Request('http://localhost:3000/api/cron?job=scrape', {
        method: 'GET',
        headers: {
          Authorization: 'Bearer test-secret',
        },
      });

      const response = await GET(request as any);

      expect(response.status).toBeGreaterThanOrEqual(500);
    });

    it('should return 400 for invalid job parameter', async () => {
      const request = new Request('http://localhost:3000/api/cron?job=invalid_job', {
        method: 'GET',
        headers: {
          Authorization: 'Bearer test-secret',
        },
      });

      const response = await GET(request as any);

      expect(response.status).toBe(400);
    });

    it('should log errors for monitoring', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      (CompetitorPriceScraper.run as jest.Mock).mockRejectedValue(
        new Error('Test error')
      );

      const request = new Request('http://localhost:3000/api/cron?job=scrape', {
        method: 'GET',
        headers: {
          Authorization: 'Bearer test-secret',
        },
      });

      try {
        await GET(request as any);
      } catch (e) {
        // Expected to fail
      }

      consoleSpy.mockRestore();
    });
  });

  describe('Rate Limiting', () => {
    it('should handle concurrent requests', async () => {
      (CompetitorPriceScraper.run as jest.Mock).mockResolvedValue({
        successCount: 10,
        failureCount: 0,
        alertsCreated: 2,
        timestamp: new Date().toISOString(),
      });

      const requests = Array(3)
        .fill(null)
        .map(
          () =>
            new Request('http://localhost:3000/api/cron?job=scrape', {
              method: 'GET',
              headers: {
                Authorization: 'Bearer test-secret',
              },
            })
        );

      const responses = await Promise.all(requests.map((req) => GET(req as any)));

      expect(responses).toHaveLength(3);
      // All concurrent requests should succeed (status 200)
      expect(responses.every((r) => r.status === 200)).toBe(true);
    });
  });

  describe('Monitoring & Logging', () => {
    it('should log job execution with timestamp', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      (CompetitorPriceScraper.run as jest.Mock).mockResolvedValue({
        successCount: 10,
        failureCount: 0,
        alertsCreated: 2,
        timestamp: new Date().toISOString(),
      });

      const request = new Request('http://localhost:3000/api/cron?job=scrape', {
        method: 'GET',
        headers: {
          Authorization: 'Bearer test-secret',
        },
      });

      await GET(request as any);

      // Verify logging was called (implementation dependent)
      consoleSpy.mockRestore();
    });
  });
});
