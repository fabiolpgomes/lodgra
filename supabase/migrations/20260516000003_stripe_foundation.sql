-- Stripe Foundation: Database Schema for SaaS Billing + Direct Booking Payments
-- Epic 12, Story 12.1
-- Adds Stripe columns to organizations, creates stripe_events, payments, invoices tables

-- ============================================================================
-- 1. ALTER organizations table — Add Stripe billing columns
-- ============================================================================

ALTER TABLE organizations ADD COLUMN IF NOT EXISTS stripe_br_customer_id VARCHAR;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS stripe_pt_connect_id VARCHAR;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS subscription_plan VARCHAR DEFAULT 'starter';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS subscription_status VARCHAR DEFAULT 'trial';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS billing_country VARCHAR;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS currency VARCHAR DEFAULT 'BRL';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMP;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS billing_period_start TIMESTAMP;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS billing_period_end TIMESTAMP;

-- ============================================================================
-- 2. CREATE stripe_events table — Webhook event tracking for audit trail
-- ============================================================================

CREATE TABLE IF NOT EXISTS stripe_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  event_type VARCHAR NOT NULL,
  stripe_event_id VARCHAR UNIQUE NOT NULL,
  payload JSONB NOT NULL,
  processed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stripe_events_org_id ON stripe_events(organization_id);
CREATE INDEX IF NOT EXISTS idx_stripe_events_stripe_id ON stripe_events(stripe_event_id);
CREATE INDEX IF NOT EXISTS idx_stripe_events_type ON stripe_events(event_type, created_at DESC);

-- ============================================================================
-- 3. CREATE payments table — Payment tracking for direct bookings
-- ============================================================================

CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  stripe_payment_id VARCHAR,
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR NOT NULL,
  status VARCHAR NOT NULL CHECK (status IN ('pending', 'succeeded', 'failed', 'refunded')),
  payment_type VARCHAR NOT NULL CHECK (payment_type IN ('booking', 'subscription')),
  payout_to_owner_id UUID,
  commission_amount DECIMAL(10, 2),
  stripe_platform_fee DECIMAL(10, 2),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_org_id ON payments(organization_id);
CREATE INDEX IF NOT EXISTS idx_payments_stripe_id ON payments(stripe_payment_id);
CREATE INDEX IF NOT EXISTS idx_payments_booking_id ON payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

-- ============================================================================
-- 4. CREATE invoices table — Invoice tracking for SaaS subscriptions
-- ============================================================================

CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  stripe_invoice_id VARCHAR UNIQUE,
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR NOT NULL,
  status VARCHAR NOT NULL CHECK (status IN ('draft', 'sent', 'paid', 'void', 'uncollectible')),
  period_start DATE,
  period_end DATE,
  due_date DATE,
  created_at TIMESTAMP DEFAULT NOW(),
  paid_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_invoices_org_id ON invoices(organization_id);
CREATE INDEX IF NOT EXISTS idx_invoices_stripe_id ON invoices(stripe_invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_period ON invoices(period_start, period_end);

-- ============================================================================
-- 5. RLS Policies — Multi-tenant data isolation
-- ============================================================================

-- stripe_events: Organizations can only see their own events
CREATE POLICY IF NOT EXISTS stripe_events_select_own ON stripe_events FOR SELECT
  USING (organization_id IN (SELECT id FROM organizations WHERE id = auth.uid()::UUID));

CREATE POLICY IF NOT EXISTS stripe_events_insert_own ON stripe_events FOR INSERT
  WITH CHECK (organization_id IN (SELECT id FROM organizations WHERE id = auth.uid()::UUID));

-- payments: Organizations can only see their own payments
CREATE POLICY IF NOT EXISTS payments_select_own ON payments FOR SELECT
  USING (organization_id IN (SELECT id FROM organizations WHERE id = auth.uid()::UUID));

-- invoices: Organizations can only see their own invoices
CREATE POLICY IF NOT EXISTS invoices_select_own ON invoices FOR SELECT
  USING (organization_id IN (SELECT id FROM organizations WHERE id = auth.uid()::UUID));

-- Enable RLS on new tables
ALTER TABLE stripe_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- End of migration
-- ============================================================================
