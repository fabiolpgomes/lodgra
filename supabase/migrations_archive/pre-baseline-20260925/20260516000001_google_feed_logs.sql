-- Create google_feed_logs table for tracking Google Vacation Rentals feed generation
-- Story 27.4: Premium SaaS Feature - Google Distribution Dashboard

CREATE TABLE IF NOT EXISTS public.google_feed_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  action TEXT NOT NULL CHECK (action IN ('auto', 'manual')),
  status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'queued', 'in_progress')),
  duration_ms INTEGER,
  error_message TEXT,
  properties_count INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_google_feed_logs_property_id_timestamp
  ON public.google_feed_logs(property_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_google_feed_logs_organization_id_timestamp
  ON public.google_feed_logs(organization_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_google_feed_logs_created_at
  ON public.google_feed_logs(created_at DESC);

-- Enable RLS on google_feed_logs table
ALTER TABLE public.google_feed_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only SELECT logs for properties they own
-- This query gets the owner_id from properties table to verify access
CREATE POLICY google_feed_logs_select_policy ON public.google_feed_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = google_feed_logs.property_id
      AND p.organization_id = (
        SELECT organization_id FROM public.user_profiles
        WHERE user_id = auth.uid()
      )
      AND p.tier = 'premium'
    )
  );

-- RLS Policy: Only authenticated users in the organization can INSERT logs (for admin operations)
CREATE POLICY google_feed_logs_insert_policy ON public.google_feed_logs
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organizations o
      WHERE o.id = google_feed_logs.organization_id
      AND EXISTS (
        SELECT 1 FROM public.user_profiles up
        WHERE up.organization_id = o.id
        AND up.user_id = auth.uid()
      )
    )
  );

-- Grant permissions to authenticated users
GRANT SELECT ON public.google_feed_logs TO authenticated;
GRANT INSERT ON public.google_feed_logs TO authenticated;
