-- Fix INSERT policy for google_feed_logs - enforce premium tier gating
-- Story 27.4: Premium SaaS Feature - Google Distribution Dashboard
-- Date: 2026-05-17
--
-- RATIONALE:
-- The original INSERT policy (20260516000001) allowed any organization member
-- to INSERT feed logs, regardless of premium tier. This creates a security gap:
-- - Non-premium organizations could theoretically log feed operations
-- - Inconsistent with SELECT policy which enforces tier='premium'
--
-- FIX:
-- Add premium tier validation to INSERT policy by checking that the
-- organization has at least one premium property (indicating active SaaS subscription).

-- Drop the old INSERT policy
DROP POLICY IF EXISTS google_feed_logs_insert_policy ON public.google_feed_logs;

-- Create corrected INSERT policy with premium tier enforcement
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
      -- NEW: Verify organization has premium tier properties
      AND EXISTS (
        SELECT 1 FROM public.properties pr
        WHERE pr.organization_id = o.id
        AND pr.tier = 'premium'
      )
    )
  );

-- Verify policy is correctly installed
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'google_feed_logs'
AND policyname = 'google_feed_logs_insert_policy';
