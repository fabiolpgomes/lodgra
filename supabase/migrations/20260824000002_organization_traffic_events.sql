CREATE TABLE IF NOT EXISTS organization_traffic_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  event_name TEXT NOT NULL DEFAULT 'page_view',
  path TEXT NOT NULL,
  hostname TEXT NOT NULL,
  referrer TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_organization_traffic_events_org_created
  ON organization_traffic_events(organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_organization_traffic_events_org_event
  ON organization_traffic_events(organization_id, event_name);

CREATE INDEX IF NOT EXISTS idx_organization_traffic_events_hostname
  ON organization_traffic_events(hostname);

ALTER TABLE organization_traffic_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY organization_traffic_events_select
  ON organization_traffic_events
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT user_id FROM organization_members
      WHERE organization_id = organization_traffic_events.organization_id
    )
  );

CREATE POLICY organization_traffic_events_insert
  ON organization_traffic_events
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');
