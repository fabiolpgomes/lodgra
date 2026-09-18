BEGIN;

DO $$
DECLARE
  v_oid regprocedure := pg_catalog.to_regprocedure(
    'lodgra_private.replace_reservation_financial_snapshot(uuid,integer,text,text,numeric,numeric,numeric,numeric,numeric,numeric,numeric,numeric,numeric,numeric,numeric,numeric,numeric,text,text,text)'
  );
  v_definition text;
  v_old_fragment text := 'v_reservation.booking_source IN (''ical'', ''manual'')';
  v_new_fragment text := '(v_reservation.booking_source = ''manual'' OR v_reservation.booking_source LIKE ''ical%'')';
BEGIN
  IF v_oid IS NULL THEN
    RAISE EXCEPTION 'replace_reservation_financial_snapshot implementation is missing';
  END IF;

  SELECT pg_catalog.pg_get_functiondef(v_oid::oid) INTO v_definition;
  IF pg_catalog.strpos(v_definition, v_new_fragment) = 0 THEN
    IF pg_catalog.strpos(v_definition, v_old_fragment) = 0 THEN
      RAISE EXCEPTION 'unexpected iCal compatibility predicate';
    END IF;
    EXECUTE pg_catalog.replace(v_definition, v_old_fragment, v_new_fragment);
  END IF;
END
$$;

COMMIT;
