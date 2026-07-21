/**
 * Pricing configuration types for Story 36.1
 */

export type DiscountType = 'weekly' | 'monthly' | 'excellent_guest' | 'last_minute' | 'advance';

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
