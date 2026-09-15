BEGIN;
DROP FUNCTION IF EXISTS public.replace_reservation_financial_snapshot(
  uuid,integer,text,text,numeric,numeric,numeric,numeric,numeric,numeric,numeric,numeric,
  numeric,numeric,numeric,numeric,numeric,text,text,text
);
COMMIT;
