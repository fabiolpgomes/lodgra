/**
 * Pricing configuration types for Story 36.1 and 36.4
 */

export type DiscountType = 'weekly' | 'monthly' | 'excellent_guest' | 'last_minute' | 'advance';

// Story 36.4: PricingCalculator types
export interface PricingConfig {
  checkInDate: string; // ISO 8601: YYYY-MM-DD
  checkOutDate: string; // ISO 8601: YYYY-MM-DD
  nightlyRate: number;
  weekendMultiplier?: number; // e.g., 1.2 for 20% increase
  minNights?: number; // Minimum nights validation
  sevenNightDiscount?: number; // e.g., 0.05 for 5% discount
  twentyEightNightDiscount?: number; // e.g., 0.10 for 10% discount
  dailyPrices?: DailyPrice[]; // Daily price overrides
}

export interface BreakdownItem {
  component: 'base' | 'weekend' | 'discount_7night' | 'discount_28night' | 'override';
  nightCount: number;
  ratePerNight: number;
  value: number;
  reason: string;
}

export interface PricingResult {
  total: number; // Final price in EUR
  avgNightly: number; // Average per night (2 decimals)
  breakdown: BreakdownItem[];
  error?: {
    code: string;
    message: string;
    required?: number;
  };
}

// Story 36.4: Daily price with override support
export interface DailyPrice {
  id?: string;
  property_id?: string;
  date: string; // YYYY-MM-DD
  basePrice?: number;
  weekendPrice?: number;
  override?: number | null; // null = no override
  price?: number; // Fallback compatibility
  created_at?: string;
  updated_at?: string;
}

// Database Models
export interface PropertyPrices {
  id: string;
  property_id: string;
  base_price: number;
  weekend_price?: number;
  created_at: string;
  updated_at: string;
}

export interface PropertyDiscount {
  id: string;
  property_id: string;
  discount_type: DiscountType;
  percentage: number;
  min_nights?: number;
  conditions?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// Story 36.6: Seasonal Pricing Rules
export interface SeasonalPricingRule {
  id: string;
  property_id: string;
  name: string;
  date_start: string; // YYYY-MM-DD
  date_end: string; // YYYY-MM-DD
  price_per_night: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Story 36.6: Pricing Constraints
export interface PricingConstraints {
  min_nightly_price?: number | null;
  max_nightly_price?: number | null;
}

export interface PropertyPricingConstraints extends PricingConstraints {
  property_id: string;
}

export interface PropertyAvailability {
  id: string;
  property_id: string;
  min_nights: number;
  max_nights: number;
  advance_notice_days: number;
  notice_for_same_day: string;
  preparation_days: number;
  created_at: string;
  updated_at: string;
}

export interface PropertyDailyPrice {
  id: string;
  property_id: string;
  date: string; // YYYY-MM-DD
  price: number;
  created_at: string;
  updated_at: string;
}

// API Request/Response Types
export interface PricesPayload {
  base_price: number;
  weekend_price?: number;
}

export interface CreateDiscountPayload {
  discount_type: DiscountType;
  percentage: number;
  min_nights?: number;
  conditions?: Record<string, unknown>;
}

export interface UpdateDiscountPayload {
  percentage?: number;
  min_nights?: number;
  conditions?: Record<string, unknown>;
}

export interface AvailabilityPayload {
  min_nights?: number;
  max_nights?: number;
  advance_notice_days?: number;
  notice_for_same_day?: string;
  preparation_days?: number;
}

export interface DailyPricePayload {
  date: string; // YYYY-MM-DD
  price: number;
}

// Story 36.6: Seasonal Rule and Constraint Payloads
export interface SeasonalRulePayload {
  name: string;
  date_start: string; // YYYY-MM-DD
  date_end: string; // YYYY-MM-DD
  price_per_night: number;
  is_active?: boolean;
}

export interface UpdateSeasonalRulePayload {
  name?: string;
  date_start?: string;
  date_end?: string;
  price_per_night?: number;
  is_active?: boolean;
}

export interface PricingConstraintsPayload {
  min_nightly_price?: number | null;
  max_nightly_price?: number | null;
}

// API Response Wrapper
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string | null;
}

// Validation
export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors?: ValidationError[];
}

// Story 36.7: Price History & Analytics
export interface PriceHistory {
  id: string;
  property_id: string;
  price: number;
  date_applied: string; // YYYY-MM-DD
  changed_by: string; // User ID
  change_reason?: string;
  is_revert: boolean;
  previous_price_record_id?: string;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

export interface PriceAnalytics {
  id: string;
  property_id: string;
  period_start: string; // YYYY-MM-DD
  period_end: string; // YYYY-MM-DD
  min_price?: number;
  max_price?: number;
  avg_price?: number;
  change_count: number;
  revenue_impact?: number;
  created_at: string;
  updated_at: string;
}

export interface PriceStatistics {
  minPrice: number;
  maxPrice: number;
  avgPrice: number;
  changeCount: number;
  stdDeviation?: number;
}

export interface RevenueImpactAnalysis {
  priceChange: number;
  estimatedBookings: number;
  estimatedImpact: number;
  percentageChange: number;
}

export interface HistoryFiltersPayload {
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  search?: string;
  page?: number;
  limit?: number;
}

export interface PriceHistoryResponse {
  data: PriceHistory[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface RevertPricePayload {
  recordId: string;
  reason?: string;
}
