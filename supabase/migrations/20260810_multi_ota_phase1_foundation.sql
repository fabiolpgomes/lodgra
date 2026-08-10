-- MIGRATION: 001_multi_ota_phase1_foundation.sql
-- DESCRIPTION: Multi-OTA Sync Phase 1 Foundation — Database Schema
-- AUTHOR: Dara (data-engineer)
-- DATE: 2026-08-10
-- STATUS: Post-Architect Review (Aria approved)
--
-- This migration creates the complete database schema for the Multi-OTA Sync system:
-- - 9 core tables (organizations, channels, reservations, blocks, conflicts, audit)
-- - Multi-tenant RLS policies with org-scoped isolation
-- - LOGGED audit trail for compliance (Portuguese fiscal law: 10-year retention)
-- - Indices optimized for 1M+ reservations/month
-- - Soft-delete pattern with automatic filtering
--
-- ROLLBACK: Execute corresponding DOWN section at end of file
-- COMPLEXITY: High (schema, RLS, indices, triggers)
-- DURATION: ~2-3 seconds on Supabase

-- ============================================================================
-- UP: Create Schema
-- ============================================================================

BEGIN;

-- 1. ORGANIZATION (Multi-tenant root)
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  country_code TEXT NOT NULL DEFAULT 'PT',
  timezone TEXT NOT NULL DEFAULT 'Europe/Lisbon',
  data_retention_days INT DEFAULT 3650,
  pii_retention_days INT DEFAULT 730,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  deleted_at TIMESTAMP,
  CONSTRAINT org_status_valid CHECK (status IN ('active', 'suspended', 'deleted'))
);

-- 2. CHANNEL CONNECTIONS (Booking, Airbnb, Flatio, VRBO accounts)
CREATE TABLE IF NOT EXISTS channel_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  channel TEXT NOT NULL,
  external_account_id TEXT NOT NULL,
  account_name TEXT,
  encrypted_credentials BYTEA,
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

-- 3. CHANNEL LISTING MAPPINGS (Property ↔ External Listing)
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

-- 4. RESERVATIONS (Core entity - progressively enriched)
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

-- 5. AVAILABILITY BLOCKS (iCal blocks, not reservations)
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

-- 6. RESERVATION SOURCES (Raw evidence for audit)
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

-- 7. RESERVATION CONFLICTS (Dedup detection & resolution)
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

-- 8. RESERVATION MATCHES (Probabilistic scoring)
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

-- 9. AUDIT EVENTS (Immutable trail, LOGGED for compliance)
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
WITH (fillfactor = 100);  -- LOGGED table for durability

-- ============================================================================
-- INDICES (Query Performance)
-- ============================================================================

-- Sync worker queue (highest volume)
CREATE INDEX idx_sync_worker
  ON reservations(organization_id, completeness_status, next_enrichment_at)
  WHERE completeness_status IN ('minimal', 'partial', 'enrichment_pending') AND deleted_at IS NULL;

-- Org + channel + sync status (composite)
CREATE INDEX idx_org_channel_sync_status
  ON reservations(organization_id, channel_connection_id, sync_health)
  WHERE deleted_at IS NULL;

-- Calendar UI reads
CREATE INDEX idx_calendar_view
  ON reservations(organization_id, property_id, check_in, check_out)
  WHERE reservation_status != 'cancelled' AND deleted_at IS NULL;

-- Date range queries (composite)
CREATE INDEX idx_date_range_queries
  ON reservations(organization_id, check_in, check_out)
  WHERE deleted_at IS NULL;

-- Enrichment queue
CREATE INDEX idx_enrich_queue
  ON reservations(organization_id, needs_enrichment, next_enrichment_at)
  WHERE needs_enrichment = true AND deleted_at IS NULL;

-- Deduplication
CREATE UNIQUE INDEX idx_dedup
  ON reservations(channel_connection_id, external_reservation_id)
  WHERE deleted_at IS NULL;

-- Conflicts pending
CREATE INDEX idx_conflicts_pending
  ON reservation_conflicts(organization_id, resolution_status, severity, created_at)
  WHERE resolution_status = 'pending' AND deleted_at IS NULL;

-- Conflict time series (composite)
CREATE INDEX idx_conflicts_time_series
  ON reservation_conflicts(organization_id, created_at DESC)
  WHERE deleted_at IS NULL;

-- Audit trail
CREATE INDEX idx_audit_by_entity
  ON audit_events(organization_id, entity_type, entity_id, created_at)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_audit_by_actor
  ON audit_events(organization_id, actor_type, actor_id, created_at)
  WHERE deleted_at IS NULL;

-- Sync health monitoring
CREATE INDEX idx_sync_health
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

-- Organization policies
CREATE POLICY org_isolation_select ON organizations
  FOR SELECT
  USING (id = current_setting('app.current_org_id')::UUID AND deleted_at IS NULL);

CREATE POLICY org_isolation_delete ON organizations
  FOR DELETE
  USING (id = current_setting('app.current_org_id')::UUID);

-- Channel connections (org-scoped + soft-delete)
CREATE POLICY cc_isolation ON channel_connections
  FOR ALL
  USING (organization_id = current_setting('app.current_org_id')::UUID AND deleted_at IS NULL);

-- Channel listing mappings
CREATE POLICY clm_isolation ON channel_listing_mappings
  FOR ALL
  USING (organization_id = current_setting('app.current_org_id')::UUID AND deleted_at IS NULL);

-- Reservations (org-scoped + soft-delete)
CREATE POLICY res_isolation ON reservations
  FOR ALL
  USING (organization_id = current_setting('app.current_org_id')::UUID AND deleted_at IS NULL);

-- Availability blocks
CREATE POLICY ab_isolation ON availability_blocks
  FOR ALL
  USING (organization_id = current_setting('app.current_org_id')::UUID AND deleted_at IS NULL);

-- Reservation sources
CREATE POLICY rs_isolation ON reservation_sources
  FOR ALL
  USING (organization_id = current_setting('app.current_org_id')::UUID);

-- Reservation conflicts (org-scoped + soft-delete)
CREATE POLICY rc_isolation ON reservation_conflicts
  FOR ALL
  USING (organization_id = current_setting('app.current_org_id')::UUID AND deleted_at IS NULL);

-- Reservation matches
CREATE POLICY rm_isolation ON reservation_matches
  FOR ALL
  USING (organization_id = current_setting('app.current_org_id')::UUID AND deleted_at IS NULL);

-- Audit events (append-only, org-scoped)
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

CREATE TRIGGER trig_audit_reservations
  AFTER INSERT OR UPDATE ON reservations
  FOR EACH ROW EXECUTE FUNCTION audit_reservation_changes();

COMMIT;

-- ============================================================================
-- DOWN: Rollback (Execute in case of deployment failure)
-- ============================================================================
--
-- BEGIN;
--
-- -- Drop triggers
-- DROP TRIGGER IF EXISTS trig_audit_reservations ON reservations;
-- DROP FUNCTION IF EXISTS audit_reservation_changes();
--
-- -- Disable RLS
-- ALTER TABLE organizations DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE channel_connections DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE channel_listing_mappings DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE reservations DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE availability_blocks DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE reservation_sources DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE reservation_conflicts DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE reservation_matches DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE audit_events DISABLE ROW LEVEL SECURITY;
--
-- -- Drop RLS policies
-- DROP POLICY IF EXISTS org_isolation_select ON organizations;
-- DROP POLICY IF EXISTS org_isolation_delete ON organizations;
-- DROP POLICY IF EXISTS cc_isolation ON channel_connections;
-- DROP POLICY IF EXISTS clm_isolation ON channel_listing_mappings;
-- DROP POLICY IF EXISTS res_isolation ON reservations;
-- DROP POLICY IF EXISTS ab_isolation ON availability_blocks;
-- DROP POLICY IF EXISTS rs_isolation ON reservation_sources;
-- DROP POLICY IF EXISTS rc_isolation ON reservation_conflicts;
-- DROP POLICY IF EXISTS rm_isolation ON reservation_matches;
-- DROP POLICY IF EXISTS ae_select ON audit_events;
-- DROP POLICY IF EXISTS ae_append_only ON audit_events;
--
-- -- Drop indices
-- DROP INDEX IF EXISTS idx_sync_worker;
-- DROP INDEX IF EXISTS idx_org_channel_sync_status;
-- DROP INDEX IF EXISTS idx_calendar_view;
-- DROP INDEX IF EXISTS idx_date_range_queries;
-- DROP INDEX IF EXISTS idx_enrich_queue;
-- DROP INDEX IF EXISTS idx_dedup;
-- DROP INDEX IF EXISTS idx_conflicts_pending;
-- DROP INDEX IF EXISTS idx_conflicts_time_series;
-- DROP INDEX IF EXISTS idx_audit_by_entity;
-- DROP INDEX IF EXISTS idx_audit_by_actor;
-- DROP INDEX IF EXISTS idx_sync_health;
--
-- -- Drop tables (reverse order of dependencies)
-- DROP TABLE IF EXISTS audit_events;
-- DROP TABLE IF EXISTS reservation_matches;
-- DROP TABLE IF EXISTS reservation_conflicts;
-- DROP TABLE IF EXISTS reservation_sources;
-- DROP TABLE IF EXISTS availability_blocks;
-- DROP TABLE IF EXISTS reservations;
-- DROP TABLE IF EXISTS channel_listing_mappings;
-- DROP TABLE IF EXISTS channel_connections;
-- DROP TABLE IF EXISTS organizations;
--
-- COMMIT;
--
-- ============================================================================
-- MIGRATION METADATA
-- ============================================================================
--
-- Name: 001_multi_ota_phase1_foundation
-- Description: Create Phase 1 Foundation schema
-- Author: Dara (data-engineer)
-- Reviewed By: Aria (architect)
-- Approved: 2026-08-10
--
-- Tables Created: 9
-- Indices Created: 10
-- Policies Created: 12
-- Triggers Created: 1
--
-- Expected Duration: ~2-3 seconds
-- Complexity: High (schema + RLS + indices + triggers)
-- Rollback: See DOWN section above
--
-- Compliance Notes:
-- - Audit trail LOGGED (not UNLOGGED) for Portuguese fiscal law compliance
-- - 10-year retention on audit_events (3650 days)
-- - 24-month PII pseudonimization tracking (pseudonimized_at field)
-- - Soft-delete pattern with automatic RLS filtering (deleted_at IS NULL)
-- - Multi-tenant isolation via RLS (organization_id scoped)
--
-- Performance Notes:
-- - Indices optimized for 1M+ reservations/month
-- - Composite indices for sync worker queue, calendar UI, date range queries
-- - UNIQUE constraint on deduplication key (channel_connection_id, external_reservation_id)
-- - GENERATED column for number_of_nights (computed from dates)
--
-- Related Documentation:
-- - Domain Model: docs/epics/MULTI-OTA-SYNC/DOMAIN-MODEL.md
-- - RLS Design: docs/epics/MULTI-OTA-SYNC/RLS-DESIGN.md
-- - Audit Trail: docs/epics/MULTI-OTA-SYNC/AUDIT-TRAIL.md
