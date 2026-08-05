-- FINAL FIX: Corrected RLS policies for reservations table
-- Issue: Previous migration (20260805_fix_reservations_rls_policy.sql) used non-existent property_id column
-- The reservations table has property_listing_id, not property_id
--
-- Solution: Use proper column reference and align with working org-based policies from 20260227030000_organizations.sql

-- Drop all previous incorrect policies
DROP POLICY IF EXISTS "Managers can review reservations" ON public.reservations;
DROP POLICY IF EXISTS "reservations_select" ON public.reservations;
DROP POLICY IF EXISTS "reservations_insert" ON public.reservations;
DROP POLICY IF EXISTS "reservations_update" ON public.reservations;
DROP POLICY IF EXISTS "reservations_delete" ON public.reservations;
DROP POLICY IF EXISTS "reservations_update_own_org" ON public.reservations;

-- Recreate correct policies that match 20260227030000_organizations.sql approach
-- This uses the property_listing_id → property_id JOIN with organization filtering

CREATE POLICY "reservations_select"
  ON public.reservations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.property_listings pl
      JOIN public.properties p ON p.id = pl.property_id
      WHERE pl.id = property_listing_id
        AND p.organization_id = (SELECT organization_id FROM public.user_profiles WHERE id = auth.uid())
        AND (
          -- User is admin or has access to this property
          EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE id = auth.uid()
              AND (
                role = 'admin'
                OR access_all_properties = TRUE
                OR EXISTS (
                  SELECT 1 FROM public.user_properties
                  WHERE user_id = auth.uid()
                    AND property_id = p.id
                )
              )
          )
        )
    )
  );

CREATE POLICY "reservations_insert"
  ON public.reservations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
    AND EXISTS (
      SELECT 1 FROM public.property_listings pl
      JOIN public.properties p ON p.id = pl.property_id
      WHERE pl.id = property_listing_id
        AND p.organization_id = (SELECT organization_id FROM public.user_profiles WHERE id = auth.uid())
        AND (
          EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE id = auth.uid()
              AND (
                role = 'admin'
                OR access_all_properties = TRUE
                OR EXISTS (
                  SELECT 1 FROM public.user_properties
                  WHERE user_id = auth.uid()
                    AND property_id = p.id
                )
              )
          )
        )
    )
  );

CREATE POLICY "reservations_update"
  ON public.reservations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
    AND EXISTS (
      SELECT 1 FROM public.property_listings pl
      JOIN public.properties p ON p.id = pl.property_id
      WHERE pl.id = property_listing_id
        AND p.organization_id = (SELECT organization_id FROM public.user_profiles WHERE id = auth.uid())
        AND (
          EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE id = auth.uid()
              AND (
                role = 'admin'
                OR access_all_properties = TRUE
                OR EXISTS (
                  SELECT 1 FROM public.user_properties
                  WHERE user_id = auth.uid()
                    AND property_id = p.id
                )
              )
          )
        )
    )
  );

CREATE POLICY "reservations_delete"
  ON public.reservations FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
    AND EXISTS (
      SELECT 1 FROM public.property_listings pl
      JOIN public.properties p ON p.id = pl.property_id
      WHERE pl.id = property_listing_id
        AND p.organization_id = (SELECT organization_id FROM public.user_profiles WHERE id = auth.uid())
        AND (
          EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE id = auth.uid()
              AND (
                role = 'admin'
                OR access_all_properties = TRUE
                OR EXISTS (
                  SELECT 1 FROM public.user_properties
                  WHERE user_id = auth.uid()
                    AND property_id = p.id
                )
              )
          )
        )
    )
  );

-- Keep service role bypass (essential for cron jobs and sync operations)
CREATE POLICY "Service role full access reservations"
  ON public.reservations
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
