-- Fix RLS policy on reservations table
-- The previous policy was comparing auth.uid() with owner_id (a reference to owners table)
-- but should compare with owners.user_id instead

-- Drop the incorrect policy
DROP POLICY IF EXISTS "Managers can review reservations" ON public.reservations;

-- Create corrected policy with proper JOIN to owners table
CREATE POLICY "Managers can review reservations"
  ON reservations
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT o.user_id
      FROM properties p
      JOIN owners o ON p.owner_id = o.id
      WHERE p.id = property_id
    )
  );

-- Also fix the older conflicting policies from 20260227030000_organizations.sql
-- Drop them first
DROP POLICY IF EXISTS "reservations_select" ON public.reservations;
DROP POLICY IF EXISTS "reservations_insert" ON public.reservations;
DROP POLICY IF EXISTS "reservations_update" ON public.reservations;
DROP POLICY IF EXISTS "reservations_delete" ON public.reservations;

-- Create corrected policies with proper owner verification via owners table
CREATE POLICY "reservations_select"
  ON reservations
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT o.user_id
      FROM properties p
      JOIN owners o ON p.owner_id = o.id
      WHERE p.id = property_id
    )
  );

CREATE POLICY "reservations_insert"
  ON reservations
  FOR INSERT
  WITH CHECK (
    auth.uid() IN (
      SELECT o.user_id
      FROM properties p
      JOIN owners o ON p.owner_id = o.id
      WHERE p.id = property_id
    )
  );

CREATE POLICY "reservations_update"
  ON reservations
  FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT o.user_id
      FROM properties p
      JOIN owners o ON p.owner_id = o.id
      WHERE p.id = property_id
    )
  )
  WITH CHECK (
    auth.uid() IN (
      SELECT o.user_id
      FROM properties p
      JOIN owners o ON p.owner_id = o.id
      WHERE p.id = property_id
    )
  );

CREATE POLICY "reservations_delete"
  ON reservations
  FOR DELETE
  USING (
    auth.uid() IN (
      SELECT o.user_id
      FROM properties p
      JOIN owners o ON p.owner_id = o.id
      WHERE p.id = property_id
    )
  );

-- Keep service role bypass policy
CREATE POLICY "Service role full access reservations"
  ON reservations
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
