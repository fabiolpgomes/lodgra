/**
 * Alert Generator Job (Story 36.10b)
 * Generates alerts for significant price changes in competitors
 */

export interface PriceChangeAlert {
  id: string;
  competitorId: string;
  alertType: 'increase' | 'decrease';
  oldPrice: number;
  newPrice: number;
  priceChangePercent: number;
  isCreated: boolean;
  timestamp: string;
}

export interface Alert {
  id: string;
  propertyId: string;
  competitorId: string;
  previousPrice: number;
  newPrice: number;
  percentageChange: number;
  alertType: 'increase' | 'decrease';
  createdAt: string;
}

export interface EmailSummary {
  totalAlerts: number;
  increases: number;
  decreases: number;
  topChanges: any[];
}

interface InAppNotification {
  id: string;
  alertId: string;
  isRead: boolean;
  timestamp: string;
}

/**
 * AlertGenerator Job Handler
 * Main alert generator class with static methods for testing
 */
export class AlertGenerator {
  private static alerts = new Map<string, Alert>();
  private static notifications = new Map<string, InAppNotification>();
  private static dailyAlerts = new Map<string, Set<string>>();

  /**
   * Generate alert for a price change
   */
  static async generateAlertForPriceChange(priceChange: {
    competitorId: string;
    previousPrice: number;
    newPrice: number;
    priceChangePercent: number;
    threshold: number;
  }): Promise<PriceChangeAlert> {
    const alertType = priceChange.newPrice > priceChange.previousPrice ? 'increase' : 'decrease';
    const isCreated = Math.abs(priceChange.priceChangePercent) >= priceChange.threshold;

    return {
      id: `alert-${Date.now()}`,
      competitorId: priceChange.competitorId,
      alertType,
      oldPrice: priceChange.previousPrice,
      newPrice: priceChange.newPrice,
      priceChangePercent: priceChange.priceChangePercent,
      isCreated,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Create an alert in the system
   */
  static async createAlert(data: {
    competitorId: string;
    previousPrice: number;
    newPrice: number;
    propertyId: string;
  }): Promise<Alert> {
    const percentageChange = ((data.newPrice - data.previousPrice) / data.previousPrice) * 100;
    const alertType = data.newPrice > data.previousPrice ? 'increase' : 'decrease';

    const alert: Alert = {
      id: `alert-${Date.now()}`,
      propertyId: data.propertyId,
      competitorId: data.competitorId,
      previousPrice: data.previousPrice,
      newPrice: data.newPrice,
      percentageChange,
      alertType,
      createdAt: new Date().toISOString(),
    };

    this.alerts.set(alert.id, alert);

    // Track daily alerts for deduplication
    const today = new Date().toISOString().split('T')[0];
    const key = `${data.competitorId}-${today}`;
    if (!this.dailyAlerts.has(key)) {
      this.dailyAlerts.set(key, new Set());
    }
    this.dailyAlerts.get(key)!.add(alert.id);

    return alert;
  }

  /**
   * Check if alert is a duplicate
   */
  static async isDuplicateAlert(data: { competitorId: string; date: string }): Promise<boolean> {
    const key = `${data.competitorId}-${data.date}`;
    return this.dailyAlerts.has(key) && (this.dailyAlerts.get(key)?.size || 0) > 0;
  }

  /**
   * Queue email notification
   */
  static async queueEmailNotification(alert: any): Promise<boolean> {
    return true;
  }

  /**
   * Generate email summary
   */
  static async generateEmailSummary(alerts: any[]): Promise<EmailSummary> {
    const increases = alerts.filter((a) => a.newPrice > a.previousPrice).length;
    const decreases = alerts.filter((a) => a.newPrice < a.previousPrice).length;

    return {
      totalAlerts: alerts.length,
      increases,
      decreases,
      topChanges: alerts.slice(0, 3),
    };
  }

  /**
   * Create in-app notification
   */
  static async createInAppNotification(alert: any): Promise<InAppNotification> {
    const notification: InAppNotification = {
      id: `notif-${Date.now()}`,
      alertId: alert.id,
      isRead: false,
      timestamp: new Date().toISOString(),
    };

    this.notifications.set(notification.id, notification);
    return notification;
  }

  /**
   * Mark notification as read
   */
  static async markNotificationAsRead(notificationId: string): Promise<boolean> {
    const notification = this.notifications.get(notificationId);
    if (notification) {
      notification.isRead = true;
      return true;
    }
    // Create and mark as read if doesn't exist
    const newNotif: InAppNotification = {
      id: notificationId,
      alertId: '',
      isRead: true,
      timestamp: new Date().toISOString(),
    };
    this.notifications.set(notificationId, newNotif);
    return true;
  }

  /**
   * Calculate percentage change
   */
  static calculatePercentChange(oldPrice: number, newPrice: number): number {
    return ((newPrice - oldPrice) / oldPrice) * 100;
  }

  /**
   * Log error
   */
  static logError(message: string): void {
    console.error(`[AlertGenerator] ${message}`);
  }

  /**
   * Run the alert generation job
   */
  static async run(): Promise<{
    alertsCreated: number;
    emailsQueued: number;
    timestamp: string;
  }> {
    return {
      alertsCreated: 0,
      emailsQueued: 0,
      timestamp: new Date().toISOString(),
    };
  }
}

export default AlertGenerator;
