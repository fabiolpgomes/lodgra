-- Story 37.4: Cancellation Policies Schema
-- Create table for property cancellation policies (Airbnb model)
-- Alter reservations to track applied policy and refund info

-- ==============================================================================
-- TABLE: property_cancellation_policies
-- ==============================================================================

CREATE TABLE IF NOT EXISTS property_cancellation_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,

  -- Policy Type & Duration
  policy_type TEXT NOT NULL CHECK (policy_type IN ('flexible', 'moderate', 'limited', 'firm', 'rigid')),
  is_long_stay BOOLEAN NOT NULL,  -- true = 28+ nights, false = <28 nights

  -- Refund Windows & Percentages (Airbnb-exact model)
  full_refund_days INT NOT NULL CHECK (full_refund_days >= 0),
    -- Days before check-in for 100% refund
    -- Flexible: 1, Moderate: 5, Limited: 14, Firm: 30

  partial_refund_days INT CHECK (partial_refund_days IS NULL OR partial_refund_days >= 0),
    -- Days before check-in for partial refund (if applicable)
    -- Flexible: null (no window), Moderate: null, Limited: 7, Firm: 7

  partial_refund_percent INT CHECK (partial_refund_percent IS NULL OR (partial_refund_percent >= 0 AND partial_refund_percent <= 100)),
    -- % refunded during partial period (typically 50%)
    -- Flexible: null, Moderate: 50, Limited: 50, Firm: 50

  -- Non-Refundable Option (for short-stay policies)
  non_refundable_discount_percent INT DEFAULT 0 CHECK (non_refundable_discount_percent >= 0 AND non_refundable_discount_percent <= 100),
    -- Discount offered if guest chooses non-refundable rate (typically 10%)
    -- Only for short-stay Rigid policy

  -- Metadata
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  -- Unique constraint: one policy per property per type per duration
  UNIQUE(property_id, policy_type, is_long_stay)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_property_cancellation_policies_property_id
  ON property_cancellation_policies(property_id);

CREATE INDEX IF NOT EXISTS idx_property_cancellation_policies_type_duration
  ON property_cancellation_policies(property_id, policy_type, is_long_stay);

-- RLS Policies
ALTER TABLE property_cancellation_policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own property cancellation policies"
  ON property_cancellation_policies FOR SELECT
  USING (
    property_id IN (
      SELECT id FROM properties WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage own property cancellation policies"
  ON property_cancellation_policies FOR ALL
  USING (
    property_id IN (
      SELECT id FROM properties WHERE owner_id = auth.uid()
    )
  );

-- ==============================================================================
-- ALTER TABLE: reservations (add cancellation policy & refund tracking)
-- ==============================================================================

ALTER TABLE reservations ADD COLUMN IF NOT EXISTS cancellation_policy_id UUID REFERENCES property_cancellation_policies(id) ON DELETE SET NULL;

ALTER TABLE reservations ADD COLUMN IF NOT EXISTS cancellation_policy_snapshot JSONB;
  -- Snapshot of the policy at booking time (for audit trail)
  -- Stores: { policy_type, is_long_stay, full_refund_days, partial_refund_days, partial_refund_percent }

ALTER TABLE reservations ADD COLUMN IF NOT EXISTS refund_amount DECIMAL(10, 2) CHECK (refund_amount IS NULL OR refund_amount >= 0);
  -- Amount refunded when cancellation processed

ALTER TABLE reservations ADD COLUMN IF NOT EXISTS stripe_refund_id TEXT;
  -- Stripe refund ID for tracking

ALTER TABLE reservations ADD COLUMN IF NOT EXISTS refund_processed_at TIMESTAMP WITH TIME ZONE;
  -- When refund was processed

-- Index for refund queries
CREATE INDEX IF NOT EXISTS idx_reservations_stripe_refund_id ON reservations(stripe_refund_id);

-- ==============================================================================
-- SEED: Default Cancellation Policies (Airbnb Model - Short Stay)
-- ==============================================================================

-- These are DEFAULT policies — properties can override
-- Short-stay policies (<28 nights)

-- Insert policies for each new property (handled by trigger or app layer)
-- This is a template; real insertion happens when property is created

-- ==============================================================================
-- COMMENT: Policy Reference (for clarity)
-- ==============================================================================

COMMENT ON TABLE property_cancellation_policies IS
  'Cancellation policies for properties (Airbnb model).
  Policies differ by stay duration: <28 nights (short) vs 28+ nights (long).
  - Flexible: 100% refund until 1 day before check-in
  - Moderate: 100% until 5 days, 50% until 5 days after check-in
  - Limited: 100% until 14 days, 50% from 7-14 days before
  - Firm: 100% until 30 days, 50% from 7-30 days before
  - Rigid (long-stay only): Non-refundable (0%)
  - Non-refundable (short-stay only): 0% refund but -10% discount on rate';

COMMENT ON COLUMN property_cancellation_policies.full_refund_days IS
  'Days before check-in after which full refund is guaranteed. After this period, partial or zero refund applies.';

COMMENT ON COLUMN property_cancellation_policies.partial_refund_days IS
  'Days before check-in after which partial refund applies (if applicable). Before this, full refund.';

COMMENT ON COLUMN property_cancellation_policies.partial_refund_percent IS
  'Percentage refunded during partial refund window (e.g., 50 for 50% refund).';

COMMENT ON COLUMN reservations.cancellation_policy_snapshot IS
  'JSONB snapshot of the policy that was active at booking time. Ensures refund calculation is accurate even if policy changes later.';
