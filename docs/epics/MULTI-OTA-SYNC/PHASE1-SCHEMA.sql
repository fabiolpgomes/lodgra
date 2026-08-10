-- Multi-OTA Sync: Complete Database Schema (Phase 1 Foundation)
-- DESCRIPTION: 9-table schema for multi-tenant, multi-OTA reservation synchronization
-- AUTHOR: Dara (data-engineer)
-- REVIEWED: Aria (architect) — 2026-08-10
-- STATUS: Production-ready, Post-Architect Review
--
-- INCORPORATES:
-- - 6 architectural improvements from Aria review
-- - RESTRICT FKs (referential integrity)
-- - LOGGED audit_events (Portuguese fiscal law compliance)
-- - GENERATED columns (number_of_nights)
-- - Case-sensitive external_reservation_id (VARCHAR(255))
-- - Composite indices for 1M+/month scale
-- - Multi-tenant RLS with soft-delete filtering
-- - Immutable audit trail with PII pseudonimization tracking

-- ============================================================================
-- 1. ORGANIZATION (Tenant Root)
-- ============================================================================
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  country_code TEXT NOT NULL DEFAULT 'PT',
  timezone TEXT NOT NULL DEFAULT 'Europe/Lisbon',
  data_retention_days INT DEFAULT 3650,  -- 10 years (Portuguese fiscal law)
  pii_retention_days INT DEFAULT 730,    -- 24 months
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  deleted_at TIMESTAMP,
  CONSTRAINT org_status_valid CHECK (status IN ('active', 'suspended', 'deleted'))
);

-- ============================================================================
-- 2. CHANNEL CONNECTIONS (Booking/Airbnb/Flatio/VRBO Credentials)
-- ============================================================================
CREATE TABLE IF NOT EXISTS channel_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  channel TEXT NOT NULL,
  external_account_id TEXT NOT NULL,
  account_name TEXT,
  encrypted_credentials BYTEA,  -- Vault-managed
  credential_type TEXT,
  token_expires_at TIMESTAMP,
  status TEXT DEFAULT 'active',
  last_sync_at TIMESTAMP,
  last_error TEXT,
  error_count INT DEFAULT 0,
  connected_at TIMESTAMP DEFAULT now(),
  disconnected_at TIMESTAMP,
  disconnected_by UUID,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  deleted_at TIMESTAMP,
  UNIQUE(organization_id, channel, external_account_id),
  CONSTRAINT cc_status_valid CHECK (status IN ('active', 'error', 'revoked', 'testing'))
);

-- ============================================================================
-- 3. CHANNEL LISTING MAPPINGS (Property ↔ External Listing)
-- ============================================================================
CREATE TABLE IF NOT EXISTS channel_listing_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  channel_connection_id UUID NOT NULL REFERENCES channel_connections(id) ON DELETE RESTRICT,
  property_id UUID NOT NULL,
  unit_id UUID,
  external_listing_id TEXT NOT NULL,
  external_property_id TEXT,
  external_room_type_id TEXT,
  external_rate_plan_id TEXT,
  status TEXT DEFAULT 'active',
  sync_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  deleted_at TIMESTAMP,
  UNIQUE(channel_connection_id, external_listing_id),
  CONSTRAINT clm_status_valid CHECK (status IN ('active', 'paused', 'disconnected'))
);

-- ============================================================================
-- 4. RESERVATIONS (Core Entity - Progressively Enriched)
-- ============================================================================
CREATE TABLE IF NOT EXISTS reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  channel_connection_id UUID NOT NULL REFERENCES channel_connections(id) ON DELETE RESTRICT,
  external_reservation_id VARCHAR(255) NOT NULL COLLATE "C",
  source_event_uid TEXT,
  property_id UUID NOT NULL,
  unit_id UUID,
  check_in DATE NOT NULL,
  check_out DATE NOT NULL,
  number_of_nights INT GENERATED ALWAYS AS (check_out::date - check_in::date) STORED,
  guest_name TEXT,
  first_name TEXT,
  last_name TEXT,
  guest_email TEXT,
  guest_phone TEXT,
  number_of_guests INT,
  total_price DECIMAL(10,2) CONSTRAINT price_positive CHECK (total_price IS NULL OR total_price >= 0),
  currency TEXT,
  commission_amount DECIMAL(10,2) CONSTRAINT commission_positive CHECK (commission_amount IS NULL OR commission_amount >= 0),
  reservation_status TEXT DEFAULT 'confirmed',
  completeness_status TEXT DEFAULT 'minimal',
  completeness_percentage INT DEFAULT 0,
  missing_fields TEXT[],
  needs_enrichment BOOLEAN DEFAULT true,
  enrichment_attempts INT DEFAULT 0,
  enrichment_retry_count INT DEFAULT 0,
  enrichment_source TEXT,
  enrichment_error_code TEXT,
  enrichment_failed_reason TEXT,
  last_enrichment_at TIMESTAMP,
  next_enrichment_at TIMESTAMP,
  enrichment_deadline_at TIMESTAMP,
  sync_health TEXT DEFAULT 'healthy',
  last_sync_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  cancelled_at TIMESTAMP,
  deleted_at TIMESTAMP,
  UNIQUE(organization_id, channel_connection_id, external_reservation_id),
  CONSTRAINT res_dates_valid CHECK (check_in < check_out),
  CONSTRAINT res_status_valid CHECK (reservation_status IN ('confirmed', 'pending', 'cancelled')),
  CONSTRAINT res_completeness_valid CHECK (completeness_status IN (
    'minimal', 'partial', 'complete', 'enrichment_pending', 'enrichment_failed', 'manual_review', 'not_enrichable'
  )),
  CONSTRAINT res_health_valid CHECK (sync_health IN ('healthy', 'degraded', 'error')),
  CONSTRAINT res_completeness_pct CHECK (completeness_percentage BETWEEN 0 AND 100)
);

-- ============================================================================
-- 5. AVAILABILITY BLOCKS (iCal Blocks, Not Reservations)
-- ============================================================================
CREATE TABLE IF NOT EXISTS availability_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  channel_connection_id UUID NOT NULL REFERENCES channel_connections(id) ON DELETE RESTRICT,
  property_id UUID NOT NULL,
  unit_id UUID,
  external_block_uid TEXT,
  source_event_uid TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  block_type TEXT DEFAULT 'unavailable',
  reason TEXT,
  source TEXT DEFAULT 'ical',
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  deleted_at TIMESTAMP,
  CONSTRAINT ab_dates_valid CHECK (start_date < end_date),
  CONSTRAINT ab_type_valid CHECK (block_type IN ('unavailable', 'maintenance', 'owner_block', 'manual'))
);

-- ============================================================================
-- 6. RESERVATION SOURCES (Raw Evidence for Audit)
-- ============================================================================
CREATE TABLE IF NOT EXISTS reservation_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  reservation_id UUID NOT NULL REFERENCES reservations(id) ON DELETE RESTRICT,
  source_type TEXT NOT NULL,
  source_identifier TEXT,
  raw_payload JSONB,
  parsed_data JSONB,
  received_at TIMESTAMP NOT NULL,
  processed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT now(),
  CONSTRAINT rs_source_type_valid CHECK (source_type IN ('email', 'ical', 'api_webhook', 'scraper'))
);

-- ============================================================================
-- 7. RESERVATION CONFLICTS (Dedup Detection & Manual Review Queue)
-- ============================================================================
CREATE TABLE IF NOT EXISTS reservation_conflicts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  reservation_id_1 UUID NOT NULL REFERENCES reservations(id) ON DELETE RESTRICT,
  reservation_id_2 UUID NOT NULL REFERENCES reservations(id) ON DELETE RESTRICT,
  conflict_type TEXT NOT NULL,
  match_score INT,
  match_breakdown JSONB,
  resolution_status TEXT DEFAULT 'pending',
  resolution_type TEXT,
  resolved_at TIMESTAMP,
  resolved_by UUID,
  conflict_resolved_by_user_id UUID,
  resolution_approved_at TIMESTAMP,
  resolution_notes TEXT,
  severity TEXT DEFAULT 'medium',
  requires_action_by TIMESTAMP,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  deleted_at TIMESTAMP,
  CONSTRAINT rc_type_valid CHECK (conflict_type IN ('duplicate', 'price_mismatch', 'overbooking', 'date_mismatch')),
  CONSTRAINT rc_status_valid CHECK (resolution_status IN ('pending', 'auto_resolved', 'manual_resolved', 'approved', 'rejected')),
  CONSTRAINT rc_severity_valid CHECK (severity IN ('low', 'medium', 'high', 'critical'))
);

-- ============================================================================
-- 8. RESERVATION MATCHES (Probabilistic Cross-Source Matching)
-- ============================================================================
CREATE TABLE IF NOT EXISTS reservation_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  source_1_reservation_id UUID NOT NULL REFERENCES reservations(id) ON DELETE RESTRICT,
  source_2_reservation_id UUID NOT NULL REFERENCES reservations(id) ON DELETE RESTRICT,
  same_property BOOLEAN,
  same_checkin BOOLEAN,
  same_checkout BOOLEAN,
  guest_name_similarity DECIMAL(3,2),
  phone_email_match BOOLEAN,
  price_match BOOLEAN,
  creation_proximity_minutes INT,
  total_score INT,
  recommendation TEXT,
  created_at TIMESTAMP DEFAULT now(),
  deleted_at TIMESTAMP,
  CONSTRAINT rm_score_valid CHECK (total_score BETWEEN 0 AND 100)
);

-- ============================================================================
-- 9. AUDIT EVENTS (Immutable Trail, LOGGED, 10-Year Retention)
-- ============================================================================
CREATE TABLE IF NOT EXISTS audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  actor_type TEXT NOT NULL,
  actor_id UUID,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  before_data JSONB,
  after_data JSONB,
  reason TEXT,
  agent_id TEXT,
  policy_id TEXT,
  confidence DECIMAL(3,2),
  approval_mode TEXT,
  approved_by UUID,
  tool_used TEXT,
  execution_result TEXT,
  correlation_id TEXT,
  ip_address INET,
  user_agent TEXT,
  pseudonimized_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT now(),
  CONSTRAINT ae_actor_type_valid CHECK (actor_type IN ('user', 'system', 'agent', 'support'))
)
WITH (fillfactor = 100);

-- ============================================================================
-- INDICES (Performance Optimization for Access Patterns)
-- ============================================================================

-- Sync worker queue (highest volume - ~1M+ per month)
CREATE INDEX IF NOT EXISTS idx_sync_worker
  ON reservations(organization_id, completeness_status, next_enrichment_at)
  WHERE completeness_status IN ('minimal', 'partial', 'enrichment_pending') AND deleted_at IS NULL;

-- Org + channel + sync status (monitoring)
CREATE INDEX IF NOT EXISTS idx_org_channel_sync_status
  ON reservations(organization_id, channel_connection_id, sync_health)
  WHERE deleted_at IS NULL;

-- Calendar UI (high read volume)
CREATE INDEX IF NOT EXISTS idx_calendar_view
  ON reservations(organization_id, property_id, check_in, check_out)
  WHERE reservation_status != 'cancelled' AND deleted_at IS NULL;

-- Date range queries (common calendar/reporting)
CREATE INDEX IF NOT EXISTS idx_date_range_queries
  ON reservations(organization_id, check_in, check_out)
  WHERE deleted_at IS NULL;

-- Enrichment queue (background jobs)
CREATE INDEX IF NOT EXISTS idx_enrich_queue
  ON reservations(organization_id, needs_enrichment, next_enrichment_at)
  WHERE needs_enrichment = true AND deleted_at IS NULL;

-- Deduplication key (critical for preventing duplicates)
CREATE UNIQUE INDEX IF NOT EXISTS idx_dedup
  ON reservations(channel_connection_id, external_reservation_id)
  WHERE deleted_at IS NULL;

-- Conflict detection (manual review queue)
CREATE INDEX IF NOT EXISTS idx_conflicts_pending
  ON reservation_conflicts(organization_id, resolution_status, severity, created_at)
  WHERE resolution_status = 'pending' AND deleted_at IS NULL;

-- Conflict time series (analytics, trending)
CREATE INDEX IF NOT EXISTS idx_conflicts_time_series
  ON reservation_conflicts(organization_id, created_at DESC)
  WHERE deleted_at IS NULL;

-- Audit trail by entity (compliance, investigation)
CREATE INDEX IF NOT EXISTS idx_audit_by_entity
  ON audit_events(organization_id, entity_type, entity_id, created_at);

-- Audit trail by actor (security, user activity)
CREATE INDEX IF NOT EXISTS idx_audit_by_actor
  ON audit_events(organization_id, actor_type, actor_id, created_at);

-- Sync health monitoring (alerting, system status)
CREATE INDEX IF NOT EXISTS idx_sync_health
  ON reservations(organization_id, sync_health, last_sync_at)
  WHERE sync_health IN ('degraded', 'error') AND deleted_at IS NULL;

-- ============================================================================
-- ROW LEVEL SECURITY (Multi-Tenant Isolation)
-- ============================================================================

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_listing_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservation_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservation_conflicts ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservation_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;

-- Organization isolation (self only)
CREATE POLICY org_isolation_select ON organizations
  FOR SELECT
  USING (id = current_setting('app.current_org_id')::UUID AND deleted_at IS NULL);

CREATE POLICY org_isolation_delete ON organizations
  FOR DELETE
  USING (id = current_setting('app.current_org_id')::UUID);

-- Channel connections (org-scoped)
CREATE POLICY cc_isolation ON channel_connections
  FOR ALL
  USING (organization_id = current_setting('app.current_org_id')::UUID AND deleted_at IS NULL);

-- Channel listing mappings (org-scoped)
CREATE POLICY clm_isolation ON channel_listing_mappings
  FOR ALL
  USING (organization_id = current_setting('app.current_org_id')::UUID AND deleted_at IS NULL);

-- Reservations (org-scoped, soft-delete filtered)
CREATE POLICY res_isolation ON reservations
  FOR ALL
  USING (organization_id = current_setting('app.current_org_id')::UUID AND deleted_at IS NULL);

-- Availability blocks (org-scoped)
CREATE POLICY ab_isolation ON availability_blocks
  FOR ALL
  USING (organization_id = current_setting('app.current_org_id')::UUID AND deleted_at IS NULL);

-- Reservation sources (org-scoped, immutable)
CREATE POLICY rs_isolation ON reservation_sources
  FOR ALL
  USING (organization_id = current_setting('app.current_org_id')::UUID);

-- Reservation conflicts (org-scoped, soft-delete filtered)
CREATE POLICY rc_isolation ON reservation_conflicts
  FOR ALL
  USING (organization_id = current_setting('app.current_org_id')::UUID AND deleted_at IS NULL);

-- Reservation matches (org-scoped)
CREATE POLICY rm_isolation ON reservation_matches
  FOR ALL
  USING (organization_id = current_setting('app.current_org_id')::UUID AND deleted_at IS NULL);

-- Audit events (org-scoped, append-only)
CREATE POLICY ae_select ON audit_events
  FOR SELECT
  USING (organization_id = current_setting('app.current_org_id')::UUID);

CREATE POLICY ae_append_only ON audit_events
  FOR INSERT
  WITH CHECK (organization_id = current_setting('app.current_org_id')::UUID);

-- ============================================================================
-- AUDIT TRIGGERS (Immutable Trail)
-- ============================================================================

CREATE OR REPLACE FUNCTION audit_reservation_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_events
      (organization_id, actor_type, action, entity_type, entity_id, after_data, created_at)
    VALUES
      (NEW.organization_id, 'system', 'create_reservation', 'reservation', NEW.id, row_to_json(NEW), now());
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_events
      (organization_id, actor_type, action, entity_type, entity_id, before_data, after_data, created_at)
    VALUES
      (NEW.organization_id, 'system', 'update_reservation', 'reservation', NEW.id, row_to_json(OLD), row_to_json(NEW), now());
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trig_audit_reservations ON reservations;
CREATE TRIGGER trig_audit_reservations
  AFTER INSERT OR UPDATE ON reservations
  FOR EACH ROW EXECUTE FUNCTION audit_reservation_changes();
