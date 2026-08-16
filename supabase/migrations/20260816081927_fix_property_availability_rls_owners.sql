-- property.owner_id references owners.id; authorization is based on owners.user_id.
DROP POLICY IF EXISTS "Users can view own property availability"
  ON public.property_availability;

DROP POLICY IF EXISTS "Users can manage own property availability"
  ON public.property_availability;

DROP POLICY IF EXISTS "Users can update own property availability"
  ON public.property_availability;

CREATE POLICY "Users can view own property availability"
  ON public.property_availability
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.properties p
      JOIN public.owners o ON o.id = p.owner_id
      WHERE p.id = property_availability.property_id
        AND o.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage own property availability"
  ON public.property_availability
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.properties p
      JOIN public.owners o ON o.id = p.owner_id
      WHERE p.id = property_availability.property_id
        AND o.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.properties p
      JOIN public.owners o ON o.id = p.owner_id
      WHERE p.id = property_availability.property_id
        AND o.user_id = auth.uid()
    )
  );
