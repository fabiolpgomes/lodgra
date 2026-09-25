-- Story 6.1: Fix commission tracking
-- Add UNIQUE index on materialized view for CONCURRENT refresh safety
CREATE UNIQUE INDEX IF NOT EXISTS idx_commission_summary_unique
  ON commission_summary(organization_id, property_id, commission_date);

-- Note: Materialized views cannot have RLS policies.
-- Access control is handled at the API/application layer.
