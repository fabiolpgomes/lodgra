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
