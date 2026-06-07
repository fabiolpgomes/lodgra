-- Create tenant_analytics_config table
CREATE TABLE IF NOT EXISTS tenant_analytics_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,
  ga_measurement_id_encrypted BYTEA NOT NULL,
  ga_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
);

CREATE INDEX idx_tenant_analytics_config_tenant_id
  ON tenant_analytics_config(tenant_id);
CREATE INDEX idx_tenant_analytics_config_deleted_at
  ON tenant_analytics_config(deleted_at)
  WHERE deleted_at IS NULL;

-- Create audit log table
CREATE TABLE IF NOT EXISTS analytics_config_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL,
  old_values JSONB,
  new_values JSONB,
  changed_by VARCHAR(100) DEFAULT 'system',
  ip_address INET,
  user_agent VARCHAR(500),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_analytics_config_audit_log_tenant_id
  ON analytics_config_audit_log(tenant_id);
CREATE INDEX idx_analytics_config_audit_log_created_at
  ON analytics_config_audit_log(created_at DESC);
CREATE INDEX idx_analytics_config_audit_log_action
  ON analytics_config_audit_log(action);

-- Optional: Create test events table for debugging
CREATE TABLE IF NOT EXISTS analytics_test_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  event_id VARCHAR(50) UNIQUE NOT NULL,
  ga_measurement_id VARCHAR(20) NOT NULL,
  test_fired_at TIMESTAMP WITH TIME ZONE NOT NULL,
  ga_confirmed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_analytics_test_events_tenant_id
  ON analytics_test_events(tenant_id);
CREATE INDEX idx_analytics_test_events_status
  ON analytics_test_events(status);
CREATE INDEX idx_analytics_test_events_test_fired_at
  ON analytics_test_events(test_fired_at DESC);
