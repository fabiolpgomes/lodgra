-- RPC function to fix incorrectly cancelled reservations bypassing conflict checks
-- This function updates reservation status without triggering booking conflict validation

CREATE OR REPLACE FUNCTION update_cancelled_reservations_batch(
  start_date DATE,
  end_date DATE
)
RETURNS TABLE(
  fixed_count INTEGER,
  reservations JSON
) AS $$
DECLARE
  v_fixed_count INTEGER;
  v_reservations JSON;
BEGIN
  -- Update reservations and capture results
  WITH updated AS (
    UPDATE reservations
    SET
      status = 'confirmed',
      cancelled_at = NULL,
      cancellation_reason = NULL,
      updated_at = now()
    WHERE
      status = 'cancelled'
      AND check_in >= start_date
      AND check_in <= end_date
    RETURNING
      id,
      check_in,
      check_out,
      external_reservation_id
  )
  SELECT
    COUNT(*)::INTEGER,
    COALESCE(json_agg(json_build_object(
      'id', id,
      'check_in', check_in,
      'check_out', check_out,
      'external_id', external_reservation_id
    )), '[]'::json)
  INTO v_fixed_count, v_reservations
  FROM updated;

  RETURN QUERY
  SELECT v_fixed_count, v_reservations;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION update_cancelled_reservations_batch TO authenticated;
