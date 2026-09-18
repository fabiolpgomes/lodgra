BEGIN;

DROP FUNCTION IF EXISTS public.replace_reservation_financial_snapshot(
  uuid,integer,text,text,numeric,numeric,numeric,numeric,numeric,numeric,numeric,numeric,
  numeric,numeric,numeric,numeric,numeric,text,text,text
);

ALTER FUNCTION lodgra_private.replace_reservation_financial_snapshot(
  uuid,integer,text,text,numeric,numeric,numeric,numeric,numeric,numeric,numeric,numeric,
  numeric,numeric,numeric,numeric,numeric,text,text,text
) SET SCHEMA public;

REVOKE ALL ON FUNCTION public.replace_reservation_financial_snapshot(
  uuid,integer,text,text,numeric,numeric,numeric,numeric,numeric,numeric,numeric,numeric,
  numeric,numeric,numeric,numeric,numeric,text,text,text
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.replace_reservation_financial_snapshot(
  uuid,integer,text,text,numeric,numeric,numeric,numeric,numeric,numeric,numeric,numeric,
  numeric,numeric,numeric,numeric,numeric,text,text,text
) TO authenticated, service_role;

COMMIT;
