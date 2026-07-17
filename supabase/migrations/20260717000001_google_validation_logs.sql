-- Google Vacation Rentals Validation Logs
CREATE TABLE IF NOT EXISTS google_validation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,

  -- Validation results
  status TEXT NOT NULL CHECK (status IN ('indexed', 'pending', 'rejected', 'error')),
  issue_count INT NOT NULL DEFAULT 0,
  critical_count INT NOT NULL DEFAULT 0,
  high_count INT NOT NULL DEFAULT 0,
  medium_count INT NOT NULL DEFAULT 0,
  low_count INT NOT NULL DEFAULT 0,

  -- Issues details
  issues JSONB, -- Array of {fieldName, severity, message, suggestion}

  -- Auto-fix tracking
  auto_fixes_applied INT DEFAULT 0,
  auto_fixes_data JSONB, -- Applied fixes with before/after values

  -- Tracking
  validation_type TEXT CHECK (validation_type IN ('feed', 'property', 'scheduled', 'manual')),
  is_resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(organization_id, property_id, created_at)
);

-- Index for fast lookups
CREATE INDEX idx_google_validation_logs_org_prop
  ON google_validation_logs(organization_id, property_id);

CREATE INDEX idx_google_validation_logs_created_at
  ON google_validation_logs(created_at DESC);

CREATE INDEX idx_google_validation_logs_status
  ON google_validation_logs(status);

CREATE INDEX idx_google_validation_logs_is_resolved
  ON google_validation_logs(is_resolved);

CREATE INDEX idx_google_validation_logs_critical
  ON google_validation_logs(critical_count DESC) WHERE critical_count > 0;

-- View: Recent critical issues (unresolved)
CREATE OR REPLACE VIEW google_validation_critical_issues AS
SELECT
  id,
  organization_id,
  property_id,
  issue_count,
  critical_count,
  created_at,
  issues
FROM google_validation_logs
WHERE is_resolved = FALSE
  AND critical_count > 0
ORDER BY created_at DESC;

-- Enable RLS
ALTER TABLE google_validation_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "org_isolation_google_validation_logs"
  ON google_validation_logs
  USING (organization_id IN (
    SELECT organization_id FROM user_profiles
    WHERE id = auth.uid()
  ));

-- Trigger to auto-update updated_at
CREATE TRIGGER update_google_validation_logs_updated_at
  BEFORE UPDATE ON google_validation_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger to auto-calculate severity counts
CREATE OR REPLACE FUNCTION calculate_issue_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.issues IS NOT NULL THEN
    NEW.issue_count = jsonb_array_length(NEW.issues);

    NEW.critical_count = (
      SELECT COUNT(*)
      FROM jsonb_array_elements(NEW.issues) AS item
      WHERE item->>'severity' = 'critical'
    );

    NEW.high_count = (
      SELECT COUNT(*)
      FROM jsonb_array_elements(NEW.issues) AS item
      WHERE item->>'severity' = 'high'
    );

    NEW.medium_count = (
      SELECT COUNT(*)
      FROM jsonb_array_elements(NEW.issues) AS item
      WHERE item->>'severity' = 'medium'
    );

    NEW.low_count = (
      SELECT COUNT(*)
      FROM jsonb_array_elements(NEW.issues) AS item
      WHERE item->>'severity' = 'low'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_issue_counts_trigger
  BEFORE INSERT OR UPDATE ON google_validation_logs
  FOR EACH ROW
  EXECUTE FUNCTION calculate_issue_counts();
