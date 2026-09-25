-- SECURITY FIX: guests_insert e guests_update requerem role
-- Conditional: guests table may not exist yet
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'guests') THEN
    DROP POLICY IF EXISTS "guests_insert" ON public.guests;
    DROP POLICY IF EXISTS "guests_update" ON public.guests;

    CREATE POLICY "guests_insert" ON public.guests FOR INSERT TO authenticated
      WITH CHECK (
        organization_id = public.get_user_organization_id()
        AND EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
      );

    CREATE POLICY "guests_update" ON public.guests FOR UPDATE TO authenticated
      USING (
        organization_id = public.get_user_organization_id()
        AND EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
      )
      WITH CHECK (organization_id = public.get_user_organization_id());
  END IF;
END $$;
