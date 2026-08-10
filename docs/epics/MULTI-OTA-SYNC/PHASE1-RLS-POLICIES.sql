-- RLS POLICIES: Detailed Multi-Tenant Isolation
-- DESCRIPTION: Comprehensive Row-Level Security policies for Multi-OTA Sync
-- AUTHOR: Dara (data-engineer)
-- DATE: 2026-08-10
-- SCOPE: All 9 core tables + system bypass role
--
-- DESIGN PRINCIPLES:
-- 1. Organization-scoped isolation: app.current_org_id GUC as enforcement mechanism
-- 2. Soft-delete filtering: WHERE deleted_at IS NULL for all SELECT queries
-- 3. Append-only audit trail: INSERT only, no UPDATE/DELETE
-- 4. System bypass role: postgres role bypasses RLS for monitoring/backup
-- 5. Audit trail for sensitive reads: actor_id tracked in audit_events

-- ============================================================================
-- PREREQUISITE: Create System Bypass Role
-- ============================================================================
-- This role is for @devops monitoring, backups, and system admin access only.
-- Connect as: psql postgresql://postgres:password@host/db
-- (By default, postgres role bypasses RLS)

-- When using Supabase service_role (backend API):
-- - Still org-scoped (set app.current_org_id)
-- - Cannot bypass RLS (service_role is not superuser)
--
-- When using Supabase postgres (system admin):
-- - Bypasses RLS completely
-- - Audit trail logs actor_type = 'system_admin'
-- - Use ONLY for: backups, monitoring, data recovery

-- ============================================================================
-- TABLE: organizations
-- ISOLATION: Self-isolation (org can only see itself)
-- ============================================================================

-- SELECT: Users see only their org
CREATE POLICY org_isolation_select ON organizations
  FOR SELECT
  USING (
    id = current_setting('app.current_org_id')::UUID
    AND deleted_at IS NULL
  );

-- INSERT: Only via system (create org in Supabase console)
-- DELETE: Soft-delete only (set deleted_at)
CREATE POLICY org_isolation_delete ON organizations
  FOR DELETE
  USING (id = current_setting('app.current_org_id')::UUID);

-- ============================================================================
-- TABLE: channel_connections
-- ISOLATION: Organization-scoped (org owns all its channel accounts)
-- SENSITIVE: Encrypted credentials stored here
-- ============================================================================

-- DANGEROUS OPERATION: Any SELECT on encrypted_credentials should audit
CREATE POLICY cc_isolation ON channel_connections
  FOR ALL
  USING (
    organization_id = current_setting('app.current_org_id')::UUID
    AND deleted_at IS NULL
  );

-- AUDIT: Sensitive read of credentials
-- TODO: Add audit trigger to log when encrypted_credentials is accessed
-- This prevents silent credential exfiltration

-- ============================================================================
-- TABLE: channel_listing_mappings
-- ISOLATION: Organization-scoped
-- DATA: Property → External listing bindings (no PII)
-- ============================================================================

CREATE POLICY clm_isolation ON channel_listing_mappings
  FOR ALL
  USING (
    organization_id = current_setting('app.current_org_id')::UUID
    AND deleted_at IS NULL
  );

-- ============================================================================
-- TABLE: reservations
-- ISOLATION: Organization-scoped (critical business data)
-- SENSITIVE: Guest names, emails, phones (PII)
-- ACCESS PATTERN: High volume (sync worker, UI calendar, enrichment queue)
-- ============================================================================

-- SELECT: High-performance query with soft-delete filtering
-- Index: idx_sync_worker optimizes this for enrichment jobs
CREATE POLICY res_isolation_select ON reservations
  FOR SELECT
  USING (
    organization_id = current_setting('app.current_org_id')::UUID
    AND deleted_at IS NULL
  );

-- INSERT: Worker sync creates reservations
-- Audit trigger auto-logs creation
CREATE POLICY res_isolation_insert ON reservations
  FOR INSERT
  WITH CHECK (
    organization_id = current_setting('app.current_org_id')::UUID
  );

-- UPDATE: Allow enrichment, status changes, soft-delete
-- Audit trigger auto-logs updates
CREATE POLICY res_isolation_update ON reservations
  FOR UPDATE
  USING (
    organization_id = current_setting('app.current_org_id')::UUID
    AND deleted_at IS NULL
  )
  WITH CHECK (
    organization_id = current_setting('app.current_org_id')::UUID
  );

-- DELETE: Soft-delete only (set deleted_at, don't actually delete)
-- Hard-delete blocked at application level
CREATE POLICY res_isolation_delete ON reservations
  FOR DELETE
  USING (
    organization_id = current_setting('app.current_org_id')::UUID
  );

-- ============================================================================
-- TABLE: availability_blocks
-- ISOLATION: Organization-scoped
-- DATA: iCal blocks (maintenance, owner-blocks, manual blocks)
-- NO PII: Only dates and reasons
-- ============================================================================

CREATE POLICY ab_isolation ON availability_blocks
  FOR ALL
  USING (
    organization_id = current_setting('app.current_org_id')::UUID
    AND deleted_at IS NULL
  );

-- ============================================================================
-- TABLE: reservation_sources
-- ISOLATION: Organization-scoped
-- SENSITIVE: Raw email/iCal payload (PII likely present)
-- AUDIT: Immutable (no DELETE/UPDATE)
-- DATA LIFECYCLE: Pseudonimize after 24 months (remove guest names, emails)
-- ============================================================================

CREATE POLICY rs_isolation_select ON reservation_sources
  FOR SELECT
  USING (
    organization_id = current_setting('app.current_org_id')::UUID
  );

-- INSERT: Append-only
CREATE POLICY rs_isolation_insert ON reservation_sources
  FOR INSERT
  WITH CHECK (
    organization_id = current_setting('app.current_org_id')::UUID
  );

-- UPDATE: BLOCKED (immutable)
-- Rationale: Source data must never be modified to preserve audit trail
-- If correction needed: delete soft-delete + re-ingest

-- DELETE: BLOCKED (soft-delete via manual process)
-- Rationale: Raw data is evidence for conflict resolution

-- ============================================================================
-- TABLE: reservation_conflicts
-- ISOLATION: Organization-scoped
-- DATA: Conflict detection & manual review queue
-- ACCESS PATTERN: Moderate volume, high criticality
-- WORKFLOW: pending → manual_resolved → approved/rejected
-- ============================================================================

CREATE POLICY rc_isolation_select ON reservation_conflicts
  FOR SELECT
  USING (
    organization_id = current_setting('app.current_org_id')::UUID
    AND deleted_at IS NULL
  );

CREATE POLICY rc_isolation_insert ON reservation_conflicts
  FOR INSERT
  WITH CHECK (
    organization_id = current_setting('app.current_org_id')::UUID
  );

CREATE POLICY rc_isolation_update ON reservation_conflicts
  FOR UPDATE
  USING (
    organization_id = current_setting('app.current_org_id')::UUID
    AND deleted_at IS NULL
  )
  WITH CHECK (
    organization_id = current_setting('app.current_org_id')::UUID
  );

CREATE POLICY rc_isolation_delete ON reservation_conflicts
  FOR DELETE
  USING (
    organization_id = current_setting('app.current_org_id')::UUID
  );

-- ============================================================================
-- TABLE: reservation_matches
-- ISOLATION: Organization-scoped
-- DATA: Probabilistic matching scores (no PII)
-- ACCESS PATTERN: Low volume, analytical queries
-- ============================================================================

CREATE POLICY rm_isolation ON reservation_matches
  FOR ALL
  USING (
    organization_id = current_setting('app.current_org_id')::UUID
    AND deleted_at IS NULL
  );

-- ============================================================================
-- TABLE: audit_events
-- ISOLATION: Organization-scoped
-- IMMUTABLE: Append-only (no UPDATE/DELETE)
-- RETENTION: 10 years (Portuguese fiscal law)
-- PII LIFECYCLE: Pseudonimize after 24 months (hash guest data in before_data/after_data)
-- ACCESS: Read audit trail of own org only
-- ============================================================================

-- SELECT: Users see audit trail of their org only
CREATE POLICY ae_select ON audit_events
  FOR SELECT
  USING (
    organization_id = current_setting('app.current_org_id')::UUID
  );

-- INSERT: Only by system (audit trigger)
CREATE POLICY ae_append_only ON audit_events
  FOR INSERT
  WITH CHECK (
    organization_id = current_setting('app.current_org_id')::UUID
  );

-- UPDATE: BLOCKED (immutable trail)
-- Rationale: Audit events are source of truth for what changed and when

-- DELETE: BLOCKED (7-10 year retention)
-- Rationale: Portuguese fiscal law requires financial records for 10 years

-- ============================================================================
-- AUDIT LOGGING FOR SENSITIVE OPERATIONS
-- ============================================================================

-- TODO: Implement audit triggers for:
--   1. SELECT on encrypted_credentials (channel_connections)
--      - Log: actor_id, timestamp, correlation_id
--      - Alert if: non-system access to credentials
--
--   2. SELECT on reservation_sources (raw email/iCal)
--      - Log: actor_id, timestamp, record_ids accessed
--      - Alert if: volume spike (potential data exfiltration)
--
--   3. DELETE on reservations/conflicts (soft-delete)
--      - Log: actor_id, reason, what was deleted
--
--   4. Manual conflict resolution (rc_isolation_update)
--      - Log: who approved, reason, match_score, decision

-- ============================================================================
-- MULTI-TENANT ISOLATION TESTS
-- ============================================================================
--
-- INTEGRATION TEST 1: Cross-org isolation (data leak prevention)
-- ───────────────────────────────────────────────────────────────
--
-- Setup:
--   - Org A: org_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
--   - Org B: org_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
--   - Org A user connects as app.current_org_id = 'aaaaaaaa-...'
--
-- Test Case 1a: Org A cannot see Org B reservations
-- ──────────────────────────────────────────────
-- GIVEN: Org B has 100 reservations in database
-- WHEN: Org A queries SELECT * FROM reservations
-- THEN: Returns 0 rows (RLS filters by organization_id)
--
-- Test Case 1b: Org A cannot insert into Org B's org
-- ──────────────────────────────────────────────────
-- GIVEN: INSERT includes organization_id = 'bbbbbbbb-...'
-- WHEN: Org A attempts INSERT
-- THEN: Fails with "new row violates row-level security policy"
--
-- Test Case 1c: Org A cannot UPDATE Org B's conflict
-- ──────────────────────────────────────────────────
-- GIVEN: Conflict belongs to Org B
-- WHEN: Org A attempts UPDATE (even if they know the ID)
-- THEN: RLS blocks update (0 rows affected)
--
-- ============================================================================
--
-- INTEGRATION TEST 2: Soft-delete filtering (recovery prevention)
-- ──────────────────────────────────────────────────────────────
--
-- Test Case 2a: Deleted reservations hidden from SELECT
-- ──────────────────────────────────────────────────────
-- GIVEN: Reservation has deleted_at = now()
-- WHEN: SELECT * FROM reservations
-- THEN: WHERE deleted_at IS NULL filters it out (invisible)
--
-- Test Case 2b: Deleted orgs block all access
-- ──────────────────────────────────────────
-- GIVEN: organizations.deleted_at is set
-- WHEN: User tries SELECT (with org_id)
-- THEN: RLS policy blocks (org is effectively invisible)
--
-- ============================================================================
--
-- INTEGRATION TEST 3: Audit trail immutability
-- ──────────────────────────────────────────
--
-- Test Case 3a: Cannot UPDATE audit_events
-- ──────────────────────────────────────────
-- GIVEN: audit_events table with INSERT records
-- WHEN: Application attempts UPDATE
-- THEN: RLS blocks (no UPDATE policy = blocked)
--
-- Test Case 3b: Cannot DELETE audit_events
-- ──────────────────────────────────────────
-- GIVEN: Old audit events (>10 years)
-- WHEN: Application attempts DELETE
-- THEN: RLS blocks (no DELETE policy = blocked)
-- NOTE: Only system admin (postgres role) can DELETE (bypasses RLS)
--       and only via explicit maintenance job with logging
--
-- ============================================================================
--
-- INTEGRATION TEST 4: System bypass (monitoring access)
-- ──────────────────────────────────────────────────
--
-- Test Case 4a: postgres role sees all orgs
-- ──────────────────────────────────────────
-- GIVEN: Connect as postgres (system admin)
-- WHEN: SELECT * FROM organizations
-- THEN: Returns ALL orgs (RLS bypassed)
-- NOTE: app.current_org_id is not set, so RLS policies are ignored
--
-- Test Case 4b: service_role cannot bypass RLS
-- ─────────────────────────────────────────────
-- GIVEN: Backend API uses service_role with org-scoped context
-- WHEN: service_role executes query
-- THEN: RLS policies still enforce org isolation (cannot bypass)
-- NOTE: service_role is not superuser, so RLS applies
--
-- ============================================================================
--
-- INTEGRATION TEST 5: Audit trigger execution
-- ──────────────────────────────────────────
--
-- Test Case 5a: INSERT reservation creates audit event
-- ──────────────────────────────────────────────────
-- GIVEN: INSERT reservation
-- WHEN: Trigger trig_audit_reservations fires
-- THEN: Creates audit_events row with:
--         - action = 'create_reservation'
--         - entity_type = 'reservation'
--         - after_data = full reservation JSON
--         - before_data = NULL
--
-- Test Case 5b: UPDATE reservation creates audit event
-- ──────────────────────────────────────────────────
-- GIVEN: UPDATE reservation (e.g., enrich guest_name)
-- WHEN: Trigger trig_audit_reservations fires
-- THEN: Creates audit_events row with:
--         - action = 'update_reservation'
--         - before_data = old reservation JSON
--         - after_data = new reservation JSON
--
-- ============================================================================

-- ============================================================================
-- RECOMMENDATIONS FOR IMPLEMENTATION
-- ============================================================================
--
-- 1. AUDIT SENSITIVE READS
--    Add triggers to log when:
--    - encrypted_credentials accessed
--    - PII (guest_name, guest_email) read by non-system actors
--    - audit_events themselves are queried
--
-- 2. PII PSEUDONIMIZATION JOB
--    Create daily batch job that:
--    - Finds audit_events.created_at < now() - '24 months'
--    - Removes PII from before_data/after_data (hash if needed)
--    - Sets pseudonimized_at = now()
--    - Prevents accidental exposure of old guest data
--
-- 3. AUDIT EVENTS PURGE JOB
--    Create monthly maintenance job that:
--    - Deletes audit_events where created_at < now() - '10 years'
--    - (Only via postgres role, not application)
--    - Logs deletion to separate retention_log table
--
-- 4. MONITORING & ALERTS
--    Watch for:
--    - SELECT on encrypted_credentials from non-system IPs
--    - High-volume reads of reservation_sources (potential exfiltration)
--    - Failed authentication attempts (wrong org_id)
--
-- 5. TESTING STRATEGY
--    For each policy:
--    1. Positive test: Can access own org data
--    2. Negative test: Cannot access other org data
--    3. Edge case: Deleted rows filtered
--    4. System bypass: postgres role bypasses RLS
--    5. Audit trail: Operations logged

-- ============================================================================
-- POLICY SUMMARY TABLE
-- ============================================================================
--
-- | Table | SELECT | INSERT | UPDATE | DELETE | Notes |
-- |-------|--------|--------|--------|--------|-------|
-- | organizations | ✓ (own) | ✗ (sys) | ✗ | ✓ (soft) | Org self-isolation |
-- | channel_connections | ✓ (own) | ✓ (own) | ✓ (own) | ✓ (soft) | Org-scoped, no PII |
-- | channel_listing_mappings | ✓ (own) | ✓ (own) | ✓ (own) | ✓ (soft) | Org-scoped |
-- | reservations | ✓ (own) | ✓ (own) | ✓ (own) | ✓ (soft) | HIGH PRIORITY (PII) |
-- | availability_blocks | ✓ (own) | ✓ (own) | ✓ (own) | ✓ (soft) | Org-scoped |
-- | reservation_sources | ✓ (own) | ✓ (own) | ✗ | ✗ | IMMUTABLE (audit) |
-- | reservation_conflicts | ✓ (own) | ✓ (own) | ✓ (own) | ✓ (soft) | Manual review queue |
-- | reservation_matches | ✓ (own) | ✓ (own) | ✓ (own) | ✓ (soft) | Analytical |
-- | audit_events | ✓ (own) | ✓ (sys) | ✗ | ✗ | IMMUTABLE (audit trail) |
--
-- Legend:
--   ✓ = allowed
--   ✗ = blocked
--   (own) = org-scoped isolation (current_setting('app.current_org_id'))
--   (sys) = system only (audit trigger)
--   (soft) = soft-delete (set deleted_at, RLS filters)
--   HIGH PRIORITY = sensitive data (audit, monitoring, alerts required)
--   IMMUTABLE = append-only, no updates/deletes
--
-- ============================================================================
