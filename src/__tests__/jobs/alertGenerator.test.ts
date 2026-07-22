import { AlertGenerator } from '@/jobs/alertGenerator';

jest.mock('@/lib/db', () => ({
  getSupabaseClient: jest.fn(),
}));

describe('AlertGenerator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Alert Generation', () => {
    it('should generate alert for significant price increase', async () => {
      const priceChange = {
        competitorId: 'comp-1',
        previousPrice: 90,
        newPrice: 105,
        priceChangePercent: 16.67,
        threshold: 10,
      };

      const alert = await AlertGenerator.generateAlertForPriceChange(priceChange);

      expect(alert).toBeDefined();
      expect(alert.alertType).toBe('increase');
      expect(alert.isCreated).toBe(true);
    });

    it('should generate alert for significant price decrease', async () => {
      const priceChange = {
        competitorId: 'comp-1',
        previousPrice: 100,
        newPrice: 80,
        priceChangePercent: -20,
        threshold: 10,
      };

      const alert = await AlertGenerator.generateAlertForPriceChange(priceChange);

      expect(alert.alertType).toBe('decrease');
      expect(alert.isCreated).toBe(true);
    });

    it('should not generate alert for small price changes below threshold', async () => {
      const priceChange = {
        competitorId: 'comp-1',
        previousPrice: 100,
        newPrice: 105,
        priceChangePercent: 5,
        threshold: 10,
      };

      const alert = await AlertGenerator.generateAlertForPriceChange(priceChange);

      expect(alert.isCreated).toBe(false);
    });
  });

  describe('Alert Deduplication', () => {
    it('should prevent duplicate alerts for same competitor on same day', async () => {
      const competitorId = 'comp-1';
      const today = new Date().toISOString().split('T')[0];

      // Create first alert
      await AlertGenerator.createAlert({
        competitorId,
        previousPrice: 90,
        newPrice: 105,
        propertyId: 'prop-1',
      });

      // Try to create duplicate
      const isDuplicate = await AlertGenerator.isDuplicateAlert({
        competitorId,
        date: today,
      });

      expect(isDuplicate).toBe(true);
    });

    it('should allow alerts on different days', async () => {
      const competitorId = 'comp-1';
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0];

      const isDuplicate = await AlertGenerator.isDuplicateAlert({
        competitorId,
        date: yesterday,
      });

      expect(isDuplicate).toBe(false);
    });
  });

  describe('Email Notification', () => {
    it('should queue email notification if user has email alerts enabled', async () => {
      const alert = {
        id: 'alert-1',
        propertyId: 'prop-1',
        competitorId: 'comp-1',
        previousPrice: 90,
        newPrice: 105,
      };

      const emailQueued = await AlertGenerator.queueEmailNotification(alert);

      expect(emailQueued).toBe(true);
    });

    it('should aggregate daily alerts into summary email', async () => {
      const alerts = [
        { competitorId: 'comp-1', previousPrice: 90, newPrice: 105 },
        { competitorId: 'comp-2', previousPrice: 80, newPrice: 90 },
        { competitorId: 'comp-3', previousPrice: 100, newPrice: 85 },
      ];

      const summary = await AlertGenerator.generateEmailSummary(alerts);

      expect(summary).toHaveProperty('totalAlerts');
      expect(summary).toHaveProperty('increases');
      expect(summary).toHaveProperty('decreases');
      expect(summary.totalAlerts).toBe(3);
    });

    it('should include top price changes in email', async () => {
      const alerts = [
        { competitorId: 'comp-1', previousPrice: 100, newPrice: 150, percent: 50 },
        { competitorId: 'comp-2', previousPrice: 100, newPrice: 110, percent: 10 },
        { competitorId: 'comp-3', previousPrice: 100, newPrice: 80, percent: -20 },
      ];

      const summary = await AlertGenerator.generateEmailSummary(alerts);

      expect(summary.topChanges).toBeDefined();
      expect(summary.topChanges.length).toBeGreaterThan(0);
    });
  });

  describe('In-App Notifications', () => {
    it('should create in-app notification for alert', async () => {
      const alert = {
        id: 'alert-1',
        propertyId: 'prop-1',
        competitorId: 'comp-1',
      };

      const notification = await AlertGenerator.createInAppNotification(alert);

      expect(notification).toBeDefined();
      expect(notification.isRead).toBe(false);
    });

    it('should mark notification as read when dismissed', async () => {
      const notificationId = 'notif-1';

      const updated = await AlertGenerator.markNotificationAsRead(notificationId);

      expect(updated).toBe(true);
    });
  });

  describe('Alert Metadata', () => {
    it('should capture alert timestamp', async () => {
      const alert = await AlertGenerator.createAlert({
        competitorId: 'comp-1',
        previousPrice: 90,
        newPrice: 105,
        propertyId: 'prop-1',
      });

      expect(alert.createdAt).toBeDefined();
      expect(new Date(alert.createdAt)).toBeInstanceOf(Date);
    });

    it('should include all required fields in alert', async () => {
      const alert = await AlertGenerator.createAlert({
        competitorId: 'comp-1',
        previousPrice: 90,
        newPrice: 105,
        propertyId: 'prop-1',
      });

      expect(alert).toHaveProperty('id');
      expect(alert).toHaveProperty('propertyId');
      expect(alert).toHaveProperty('competitorId');
      expect(alert).toHaveProperty('previousPrice');
      expect(alert).toHaveProperty('newPrice');
      expect(alert).toHaveProperty('percentageChange');
      expect(alert).toHaveProperty('alertType');
    });

    it('should calculate percentage change accurately', () => {
      const percent1 = AlertGenerator.calculatePercentChange(100, 120);
      const percent2 = AlertGenerator.calculatePercentChange(100, 80);

      expect(percent1).toBe(20);
      expect(percent2).toBe(-20);
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      try {
        await AlertGenerator.createAlert({
          competitorId: 'comp-1',
          previousPrice: 90,
          newPrice: 105,
          propertyId: 'invalid-property',
        });
      } catch (error: any) {
        expect(error).toBeDefined();
      }
    });

    it('should log errors for debugging', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      AlertGenerator.logError('Test error message');

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('Job Execution', () => {
    it('should execute alert generator and return summary', async () => {
      const result = await AlertGenerator.run();

      expect(result).toHaveProperty('alertsCreated');
      expect(result).toHaveProperty('emailsQueued');
      expect(result).toHaveProperty('timestamp');
    });

    it('should return execution status', async () => {
      const result = await AlertGenerator.run();

      expect(result.alertsCreated).toBeGreaterThanOrEqual(0);
      expect(result.emailsQueued).toBeGreaterThanOrEqual(0);
    });
  });
});
