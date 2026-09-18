BEGIN;

DO $$
DECLARE
  v_signature text := 'uuid,integer,text,text,numeric,numeric,numeric,numeric,numeric,numeric,numeric,numeric,numeric,numeric,numeric,numeric,numeric,text,text,text';
  v_public_oid regprocedure;
  v_private_oid regprocedure;
  v_public_is_definer boolean;
  v_private_is_definer boolean;
  v_public_config text[];
  v_private_config text[];
  v_private_source text;
BEGIN
  IF NOT has_function_privilege(
    'authenticated', 'public.replace_reservation_financial_snapshot(' || v_signature || ')', 'EXECUTE'
  ) OR has_function_privilege(
    'anon', 'public.replace_reservation_financial_snapshot(' || v_signature || ')', 'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'financial snapshot RPC grants are unsafe';
  END IF;

  v_public_oid := pg_catalog.to_regprocedure(
    'public.replace_reservation_financial_snapshot(' || v_signature || ')'
  );
  v_private_oid := pg_catalog.to_regprocedure(
    'lodgra_private.replace_reservation_financial_snapshot(' || v_signature || ')'
  );

  SELECT p.prosecdef, p.proconfig
    INTO v_public_is_definer, v_public_config
  FROM pg_catalog.pg_proc p
  WHERE p.oid = v_public_oid;

  SELECT p.prosecdef, p.prosrc, p.proconfig
    INTO v_private_is_definer, v_private_source, v_private_config
  FROM pg_catalog.pg_proc p
  WHERE p.oid = v_private_oid;

  IF v_public_oid IS NULL OR v_public_is_definer
     OR ('search_path=""' = ANY(v_public_config)) IS DISTINCT FROM TRUE
     OR ('search_path=""' = ANY(v_private_config)) IS DISTINCT FROM TRUE
     OR v_private_oid IS NULL OR NOT v_private_is_definer
     OR v_private_source NOT ILIKE '%FOR UPDATE%'
     OR v_private_source NOT ILIKE '%FINANCIAL_FACTS_CONFLICT%'
     OR v_private_source NOT ILIKE '%user_has_property_access%'
     OR v_private_source NOT ILIKE '%v_role IS NULL%'
     OR v_private_source NOT ILIKE '%allow_declared_owner_base IS TRUE FOR SHARE%'
     OR v_private_source NOT ILIKE '%booking_source LIKE ''ical%''%' THEN
    RAISE EXCEPTION 'financial snapshot RPC lost an authorization, concurrency, or compatibility invariant';
  END IF;
END
$$;

-- Behavioral fixtures live in 20260912_harden_declared_financial_capture.sql.
-- They create dedicated rows and roll back instead of selecting business reservations.
ROLLBACK;
