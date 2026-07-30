# Pricing & Availability Architecture (Epic 43)

## Overview

Lodgra now consolidates all pricing, availability, and rate management through a **calendar-based interface**. This document outlines the database schema and validation logic.

---

## Database Schema

### Core Tables

#### `property_prices` (Base Price Configuration)
```sql
id UUID PRIMARY KEY
property_id UUID -- references properties(id)
base_price DECIMAL(10, 2) -- default nightly rate
weekend_price DECIMAL(10, 2) -- optional: higher rate for Fri/Sat
created_at TIMESTAMP
updated_at TIMESTAMP
```

**Use**: Stores base and weekend pricing tiers. Used as fallback when no daily overrides exist.

---

#### `property_daily_prices` (Calendar Pricing Overrides)
```sql
id UUID PRIMARY KEY
property_id UUID -- references properties(id)
date DATE -- specific date override
price DECIMAL(10, 2) -- price for this date
created_at TIMESTAMP
updated_at TIMESTAMP
UNIQUE(property_id, date)
```

**Use**: Stores per-day price overrides. For example, higher rates during peak season, lower rates for early-bird promotions.

---

#### `property_discounts` (Duration-Based Discounts)
```sql
id UUID PRIMARY KEY
property_id UUID -- references properties(id)
discount_type TEXT -- 'weekly', 'monthly', 'excellent_guest', etc.
percentage INT -- discount percentage (0-100)
min_nights INT -- minimum stay to qualify
created_at TIMESTAMP
updated_at TIMESTAMP
```

**Use**: Stores discount rules (e.g., 10% off for 7+ nights, 20% off for 28+ nights).

---

#### `property_cancellation_policies` (Refund Terms)
```sql
id UUID PRIMARY KEY
property_id UUID -- references properties(id)
policy_type TEXT -- 'flexible', 'moderate', 'limited', 'firm', 'rigid'
is_long_stay BOOLEAN -- true = 28+ nights, false = <28 nights
full_refund_days INT -- days before check-in for 100% refund
partial_refund_days INT -- days before check-in for partial refund
partial_refund_percent INT -- % refunded during partial window
created_at TIMESTAMP
updated_at TIMESTAMP
UNIQUE(property_id, policy_type, is_long_stay)
```

**Use**: Stores refund policies. Different policies for short vs. long stays.

---

## Pricing Calculation Flow

```
┌─────────────────────────────────────────┐
│ User Selects Dates (Check-in/Check-out) │
└──────────────────┬──────────────────────┘
                   │
                   ▼
         ┌─────────────────────┐
         │ ReservationValidator│
         │  validatePrice()    │
         └──────────┬──────────┘
                    │
         ┌──────────┴──────────┐
         │                     │
         ▼                     ▼
    ┌─────────────┐      ┌──────────────┐
    │ Daily       │      │ Base Price   │
    │ Prices?     │      │ (Fallback)   │
    │             │      │              │
    │ YES: USE    │  NO: │ properties   │
    └─────────────┘      │ prices       │
         │               └──────────────┘
         ▼
    ┌───────────────────────┐
    │ Calculate Subtotal    │
    │ (Sum of nightly rates)│
    └──────────┬────────────┘
               │
               ▼
    ┌──────────────────────────┐
    │ validateDiscounts()      │
    │ - Check if 7+ nights     │
    │ - Check if 28+ nights    │
    │ - Apply percentage       │
    └──────────┬───────────────┘
               │
               ▼
    ┌──────────────────────────┐
    │ validateFees()           │
    │ - Add cleaning fee       │
    │ - Add pet fee            │
    └──────────┬───────────────┘
               │
               ▼
    ┌──────────────────────────┐
    │ Final Price with Breakdown
    │ - Base: €360             │
    │ - Discount: -€36 (10%)   │
    │ - Cleaning: +€30         │
    │ - Total: €354            │
    └──────────────────────────┘
```

---

## Validation Rules

### Minimum/Maximum Nights
- **Minimum**: 1 night (no restriction)
- **Maximum**: 365 nights (no restriction)
- Availability constraints now managed via calendar UI (blocking unavailable dates)

### Discounts
- **7+ nights**: Apply `min_stay` discount (e.g., 10%)
- **28+ nights**: Apply `extended_stay` discount (e.g., 20%)
- Applied automatically during validation

### Cancellation Policy
- Fetched based on property + stay duration (short vs. long)
- Used for refund calculation, not reservation validation

### Fees
- **Cleaning fee**: per_stay or per_night
- **Pet fee**: per_stay or per_night
- Added to final price

---

## Removed (Legacy)

### ❌ `property_availability` table
- **Reason**: Superseded by calendar pricing model
- **Removed**: Epic 43
- **Replacement**: All constraints now managed via calendar

### ❌ `properties.min_nights` column
- **Reason**: No longer needed with calendar-based availability
- **Removed**: Epic 43
- **Replacement**: Calendar blocks unavailable dates

---

## API Endpoints

### Get Price Breakdown
```
POST /api/admin/reservations/validate
{
  "propertyId": "prop-123",
  "checkIn": "2026-09-01",
  "checkOut": "2026-09-05"
}

Response:
{
  "success": true,
  "finalPrice": 354,
  "breakdown": {
    "basePrice": 360,
    "discountAmount": 36,
    "discountPercentage": 10,
    "cleaningFee": 30,
    "petFee": 0,
    "subtotal": 324,
    "totalFees": 30,
    "finalPrice": 354,
    "currency": "EUR"
  }
}
```

---

## Testing

All pricing logic is covered by integration tests:
- `src/__tests__/lib/reservation-validator.test.ts` (24 tests)
- Date range calculations
- Discount application
- Fee calculation
- Edge cases (1-day stays, overlap detection, etc.)

---

## Future Enhancements

- Dynamic pricing (ML-based rate suggestions)
- Seasonal pricing templates
- Early-bird/last-minute discount automation
- Currency multi-support
- Loyalty program integration

---

**Last Updated**: Epic 43 (2026-07-31)  
**Status**: Production Ready  
**Test Coverage**: 2833/2833 tests passing
