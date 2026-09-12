BEGIN;

CREATE INDEX IF NOT EXISTS idx_reservations_calendar_event_org_fk
  ON public.reservations (calendar_event_id, organization_id);
CREATE INDEX IF NOT EXISTS idx_reservations_email_extraction_org_fk
  ON public.reservations (email_extraction_id, organization_id);
DO $index_compatibility$
BEGIN
  IF to_regclass('public.idx_reservations_property_org_fk') IS NULL
     AND to_regclass('public.idx_reservations_property_organization') IS NULL THEN
    CREATE INDEX idx_reservations_property_org_fk
      ON public.reservations (property_id, organization_id);
  END IF;
END;
$index_compatibility$;

-- This legacy policy exists only in some brownfield environments. Optimize it
-- without assuming that every environment shares the same historical policy.
DO $policy$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'calendar_blocks'
      AND policyname = 'users_can_manage_own_property_blocks'
  ) THEN
    ALTER POLICY users_can_manage_own_property_blocks
      ON public.calendar_blocks
      USING (
        (SELECT auth.uid()) IN (
          SELECT properties.owner_id
          FROM public.properties
          WHERE properties.id = calendar_blocks.property_id
        )
      )
      WITH CHECK (
        (SELECT auth.uid()) IN (
          SELECT properties.owner_id
          FROM public.properties
          WHERE properties.id = calendar_blocks.property_id
        )
      );
  END IF;
END;
$policy$;

COMMIT;
