/**
 * Calendar component types for Story 36.3
 */

export interface DailyPrice {
  id?: string;
  property_id?: string;
  date: string; // YYYY-MM-DD
  price: number;
  created_at?: string;
  updated_at?: string;
}

export interface CalendarDay {
  date: Date;
  dayOfWeek: number; // 0-6 (Sun-Sat)
  isCurrentMonth: boolean;
  priceType: 'base' | 'weekend' | 'override' | 'disabled';
  price?: number;
  dayOfMonth: number;
}

export interface DailyPriceOverride {
  date: string; // YYYY-MM-DD
  price: number;
}

export interface PricingCalendarProps {
  propertyId: string;
  basePrices?: {
    basePrice: number;
    weekendPrice?: number;
  };
}
