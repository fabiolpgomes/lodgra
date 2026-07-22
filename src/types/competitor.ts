/**
 * TypeScript types for competitor price monitoring (Story 36.10)
 */

export type CompetitorPlatform = 'airbnb' | 'booking.com' | 'vrbo' | 'other';
export type MonitoringFrequency = 'daily' | 'weekly' | 'monthly';

export interface Competitor {
  id: string;
  propertyId: string;
  competitorUrl: string;
  platform: CompetitorPlatform;
  competitorName: string;
  competitorPropertyType?: string | null;
  isActive: boolean;
  monitoringFrequency: MonitoringFrequency;
  priceAlertThreshold: number; // percentage
  lastScrapedAt?: string | null;
  lastScrapedPrice?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface CompetitorPriceHistory {
  id: string;
  competitorId: string;
  price: number;
  scrapeDate: string;
  recordedAt: string;
  scrapeSource: 'automated' | 'manual';
  isValid: boolean;
}

export interface CompetitorPriceAlert {
  id: string;
  propertyId: string;
  competitorId: string;
  previousPrice: number;
  newPrice: number;
  priceChange: number;
  percentageChange: number;
  alertType: 'increase' | 'decrease';
  isRead: boolean;
  dismissedAt?: string | null;
  createdAt: string;
}

export interface CompetitorBenchmark {
  id: string;
  propertyId: string;
  cacheDate: string;
  marketAveragePrice: number;
  marketMinPrice: number;
  marketMaxPrice: number;
  marketVolatility: number;
  confidenceScore: number;
  sampleSize: number;
  activeCompetitors: number;
  cachedAt: string;
  expiresAt: string;
}

export interface CompetitorMonitoringAPIResponse {
  competitors: Competitor[];
  benchmark: CompetitorBenchmark | null;
  recentAlerts: CompetitorPriceAlert[];
  priceHistory: Record<string, CompetitorPriceHistory[]>;
  analysis: MarketPositionAnalysis;
}

export interface MarketPositionAnalysis {
  marketAveragePrice: number;
  hostPrice: number;
  percentageDifference: number;
  pricePosition: 'very_low' | 'low' | 'competitive' | 'high' | 'very_high';
  marketRange: {
    min: number;
    max: number;
  };
  recommendation: string;
}

export interface CompetitorFormData {
  competitorUrl: string;
  monitoringFrequency: MonitoringFrequency;
  priceAlertThreshold: number;
}

export interface CompetitorMonitoringHookData {
  isLoading: boolean;
  error: string | null;
  data: CompetitorMonitoringAPIResponse | null;
  addCompetitor: (formData: CompetitorFormData) => Promise<void>;
  removeCompetitor: (competitorId: string) => Promise<void>;
  updateCompetitor: (competitorId: string, updates: Partial<Competitor>) => Promise<void>;
  dismissAlert: (alertId: string) => Promise<void>;
  refresh: () => Promise<void>;
}

export interface BenchmarkReportData {
  property: {
    name: string;
    currentPrice: number;
  };
  competitors: CompetitorReportRow[];
  marketAnalysis: MarketPositionAnalysis;
  generatedAt: string;
}

export interface CompetitorReportRow {
  competitor: Competitor;
  currentPrice: number | null;
  priceChange7d: number | null;
  percentageChange7d: number | null;
  daysMonitored: number;
}
