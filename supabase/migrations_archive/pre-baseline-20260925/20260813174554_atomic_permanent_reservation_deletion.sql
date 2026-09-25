-- Authenticated administrators may write their own immutable audit entries.
DROP POLICY IF EXISTS audit_logs_admin_insert ON public.audit_logs;
CREATE POLICY audit_logs_admin_insert
ON public.audit_logs FOR INSERT TO authenticated
WITH CHECK (
  user_id = (SELECT auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = (SELECT auth.uid()) AND up.role = 'admin'
  )
);

-- Deletion and audit insertion execute in the same database transaction.
CREATE OR REPLACE FUNCTION public.permanently_delete_cancelled_reservation(
  p_reservation_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_status text;
BEGIN
  DELETE FROM public.reservations
  WHERE id = p_reservation_id
    AND reservation_status = 'cancelled'
  RETURNING reservation_status INTO v_status;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  INSERT INTO public.audit_logs (
    user_id, action, resource_type, resource_id, details
  ) VALUES (
    (SELECT auth.uid()),
    'reservation_permanently_deleted',
    'reservation',
    p_reservation_id,
    jsonb_build_object('reservation_status', v_status)
  );

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.permanently_delete_cancelled_reservation(uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.permanently_delete_cancelled_reservation(uuid)
  TO authenticated, service_role;
