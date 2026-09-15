BEGIN;
DO $patch$
DECLARE f regprocedure := 'lodgra_private.replace_reservation_financial_snapshot(uuid,integer,text,text,numeric,numeric,numeric,numeric,numeric,numeric,numeric,numeric,numeric,numeric,numeric,numeric,numeric,text,text,text)'::regprocedure;
d text;
BEGIN
SELECT pg_get_functiondef(f) INTO d;
IF strpos(d,'AND rr.allow_declared_owner_base IS TRUE;') > 0 THEN
  EXECUTE replace(d,'AND rr.allow_declared_owner_base IS TRUE;','AND rr.allow_declared_owner_base IS TRUE FOR SHARE;');
ELSIF strpos(d,'AND rr.allow_declared_owner_base IS TRUE FOR SHARE;') = 0 THEN
  RAISE EXCEPTION 'Unexpected declared capture definition; contract lock not installed';
END IF;
END $patch$;
COMMIT;
