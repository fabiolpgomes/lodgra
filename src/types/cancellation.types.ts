/**
 * Cancellation Policy Types (Story 37.4)
 * Airbnb-exact model for flexible, moderate, limited, firm, and rigid policies
 */

// ==============================================================================
// ENUMS
// ==============================================================================

export type CancellationPolicyType = 'flexible' | 'moderate' | 'limited' | 'firm' | 'rigid';

export type StayDuration = 'short' | 'long'; // short: <28 nights, long: 28+ nights

// ==============================================================================
// DATABASE MODELS
// ==============================================================================

export interface PropertyCancellationPolicy {
  id: string;
  property_id: string;

  // Policy metadata
  policy_type: CancellationPolicyType;
  is_long_stay: boolean; // true = 28+ nights, false = <28 nights

  // Refund windows & percentages (Airbnb model)
  full_refund_days: number; // Days before check-in for 100% refund
  partial_refund_days: number | null; // Days before check-in for partial refund
  partial_refund_percent: number | null; // % refunded in partial window (typically 50)

  // Non-refundable option (for short-stay policies)
  non_refundable_discount_percent: number; // Discount if guest chooses non-refundable rate

  // Metadata
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CancellationPolicySnapshot {
  policy_type: CancellationPolicyType;
  is_long_stay: boolean;
  full_refund_days: number;
  partial_refund_days: number | null;
  partial_refund_percent: number | null;
  non_refundable_discount_percent: number;
  captured_at: string; // ISO 8601 timestamp when snapshot was taken
}

// ==============================================================================
// RESERVATION CANCELLATION FIELDS (extends reservations table)
// ==============================================================================

export interface ReservationCancellationInfo {
  cancellation_policy_id: string | null; // FK to property_cancellation_policies
  cancellation_policy_snapshot: CancellationPolicySnapshot | null; // Snapshot at booking time
  refund_amount: number | null; // EUR amount to refund
  stripe_refund_id: string | null; // Stripe refund ID
  refund_processed_at: string | null; // ISO 8601 timestamp when processed
}

// ==============================================================================
// REFUND CALCULATION TYPES
// ==============================================================================

export interface RefundCalculationInput {
  policy_type: CancellationPolicyType;
  stay_duration: StayDuration;
  days_until_checkin: number; // Negative if already in stay
  during_stay: boolean; // true if cancellation is after check-in
  total_reservation_amount: number; // Original total in EUR
}

export interface RefundCalculationResult {
  refund_percentage: number; // 0-100
  refund_amount: number; // EUR
  reason: string; // Human-readable explanation (e.g., "Flexible policy: 1 day before check-in")
  policy_type: CancellationPolicyType;
  stay_duration: StayDuration;
}

// ==============================================================================
// POLICY DEFINITION REFERENCE (for documentation)
// ==============================================================================

/**
 * AIRBNB CANCELLATION POLICIES (Exactly Replicated)
 *
 * SHORT-STAY POLICIES (<28 nights):
 *
 * 1. FLEXIBLE
 *    - 100% refund until 1 day before check-in
 *    - 50% refund until 1 day after check-in
 *    - If cancelled <1 day before: charged 1 night
 *    - If cancelled during stay: charged 1 extra night + rest refunded
 *
 * 2. MODERATE
 *    - 100% refund until 5 days before check-in
 *    - 50% refund until 5 days after check-in
 *    - If cancelled <5 days before/during: charged 1 extra night + 50% of remaining
 *
 * 3. LIMITED
 *    - 100% refund until 14 days before check-in
 *    - 50% refund 7-14 days before check-in
 *    - After day 14: non-refundable
 *
 * 4. FIRM
 *    - 100% refund until 30 days before check-in
 *    - 50% refund 7-30 days before check-in
 *    - After day 30: non-refundable
 *
 * 5. NON-REFUNDABLE (variant, not a full policy type)
 *    - 0% refund (non-refundable)
 *    - Guest pays 10% less on rate (discount for commitment)
 *
 * LONG-STAY POLICIES (28+ nights):
 *
 * 1. FLEXIBLE (same as short)
 *    - 100% refund until 1 day before check-in
 *    - 50% refund until 1 day after check-in
 *
 * 2. MODERATE (same as short)
 *    - 100% refund until 5 days before check-in
 *    - 50% refund until 5 days after check-in
 *
 * 3. LIMITED (same as short)
 *    - 100% refund until 14 days before check-in
 *    - 50% refund 7-14 days before check-in
 *
 * 4. FIRM (same as short)
 *    - 100% refund until 30 days before check-in
 *    - 50% refund 7-30 days before check-in
 *
 * 5. RIGID (long-stay ONLY)
 *    - 0% refund (completely non-refundable)
 *    - No discount option
 *    - Used for long-term commitments
 */

// ==============================================================================
// API REQUEST/RESPONSE TYPES
// ==============================================================================

export interface CreateCancellationPolicyPayload {
  policy_type: CancellationPolicyType;
  is_long_stay: boolean;
  full_refund_days: number;
  partial_refund_days?: number | null;
  partial_refund_percent?: number | null;
  non_refundable_discount_percent?: number;
}

export interface UpdateCancellationPolicyPayload {
  policy_type?: CancellationPolicyType;
  full_refund_days?: number;
  partial_refund_days?: number | null;
  partial_refund_percent?: number | null;
  non_refundable_discount_percent?: number;
  is_active?: boolean;
}

export interface CancellationPolicyResponse {
  success: boolean;
  data?: PropertyCancellationPolicy;
  error?: string | null;
}

export interface CancellationPoliciesListResponse {
  success: boolean;
  data?: PropertyCancellationPolicy[];
  error?: string | null;
}

// ==============================================================================
// CANCELLATION REQUEST/RESPONSE
// ==============================================================================

export interface CancelReservationRequest {
  reservation_id: string;
  reason?: string; // Optional reason from guest/admin
  force?: boolean; // Skip validation if admin
}

export interface CancelReservationResponse {
  success: boolean;
  reservation_id: string;
  status: string; // 'cancelled'
  refund_info?: {
    refund_amount: number;
    refund_percentage: number;
    stripe_refund_id: string;
    processed_at: string;
  };
  error?: string | null;
}

// ==============================================================================
// GUEST LOYALTY STATUS (for Story 37.5)
// ==============================================================================

export interface GuestLoyaltyStatus {
  is_loyal: boolean;
  average_rating: number | null;
  reservation_count: number;
  previous_reservations_at_property: number; // At this specific property
}

// ==============================================================================
// HELPER: Default Policy Definitions
// ==============================================================================

export const DEFAULT_POLICIES: Record<CancellationPolicyType, Record<StayDuration, Omit<PropertyCancellationPolicy, 'id' | 'property_id' | 'created_at' | 'updated_at'>>> = {
  flexible: {
    short: {
      policy_type: 'flexible',
      is_long_stay: false,
      full_refund_days: 1,
      partial_refund_days: null,
      partial_refund_percent: null,
      non_refundable_discount_percent: 0,
      is_active: true,
    },
    long: {
      policy_type: 'flexible',
      is_long_stay: true,
      full_refund_days: 1,
      partial_refund_days: null,
      partial_refund_percent: null,
      non_refundable_discount_percent: 0,
      is_active: true,
    },
  },
  moderate: {
    short: {
      policy_type: 'moderate',
      is_long_stay: false,
      full_refund_days: 5,
      partial_refund_days: 5,
      partial_refund_percent: 50,
      non_refundable_discount_percent: 0,
      is_active: true,
    },
    long: {
      policy_type: 'moderate',
      is_long_stay: true,
      full_refund_days: 5,
      partial_refund_days: 5,
      partial_refund_percent: 50,
      non_refundable_discount_percent: 0,
      is_active: true,
    },
  },
  limited: {
    short: {
      policy_type: 'limited',
      is_long_stay: false,
      full_refund_days: 14,
      partial_refund_days: 7,
      partial_refund_percent: 50,
      non_refundable_discount_percent: 0,
      is_active: true,
    },
    long: {
      policy_type: 'limited',
      is_long_stay: true,
      full_refund_days: 14,
      partial_refund_days: 7,
      partial_refund_percent: 50,
      non_refundable_discount_percent: 0,
      is_active: true,
    },
  },
  firm: {
    short: {
      policy_type: 'firm',
      is_long_stay: false,
      full_refund_days: 30,
      partial_refund_days: 7,
      partial_refund_percent: 50,
      non_refundable_discount_percent: 0,
      is_active: true,
    },
    long: {
      policy_type: 'firm',
      is_long_stay: true,
      full_refund_days: 30,
      partial_refund_days: 7,
      partial_refund_percent: 50,
      non_refundable_discount_percent: 0,
      is_active: true,
    },
  },
  rigid: {
    short: {
      // Rigid can be short-stay non-refundable variant
      policy_type: 'rigid',
      is_long_stay: false,
      full_refund_days: 0,
      partial_refund_days: null,
      partial_refund_percent: null,
      non_refundable_discount_percent: 10, // Standard 10% discount
      is_active: true,
    },
    long: {
      // Rigid for long-stay: 0% refund, no discount
      policy_type: 'rigid',
      is_long_stay: true,
      full_refund_days: 0,
      partial_refund_days: null,
      partial_refund_percent: null,
      non_refundable_discount_percent: 0,
      is_active: true,
    },
  },
};
