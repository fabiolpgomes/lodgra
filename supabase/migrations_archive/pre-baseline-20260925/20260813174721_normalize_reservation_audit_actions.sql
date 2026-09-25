-- Normalize reservation audit actions to the audit_logs action contract.
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
    'delete',
    'reservation',
    p_reservation_id,
    jsonb_build_object(
      'event', 'reservation_permanently_deleted',
      'reservation_status', v_status
    )
  );

  RETURN true;
END;
$$;
