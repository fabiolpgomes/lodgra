BEGIN;

-- Restore previous explicit business-conflict codes (including previous retry behavior).
DO $patch$
DECLARE
  f record;
  d text;
BEGIN
  FOR f IN
    SELECT p.oid, p.proname
    FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'lodgra_private'
      AND p.proname IN ('replace_reservation_financial_snapshot', 'protect_declared_reservation_total')
  LOOP
    SELECT pg_catalog.pg_get_functiondef(f.oid) INTO d;
    IF pg_catalog.strpos(d, 'ERRCODE = ''PT409''') > 0 THEN
      EXECUTE pg_catalog.replace(d, 'ERRCODE = ''PT409''', 'ERRCODE = ''40001''');
    ELSIF pg_catalog.strpos(d, 'ERRCODE = ''40001''') = 0 THEN
      RAISE EXCEPTION 'Unexpected financial function definition: %', f.proname;
    END IF;
  END LOOP;
  IF (SELECT count(*) FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace
      WHERE n.nspname='lodgra_private'
      AND p.proname IN ('replace_reservation_financial_snapshot','protect_declared_reservation_total')) <> 2 THEN
    RAISE EXCEPTION 'Expected financial functions are absent or ambiguous';
  END IF;
END $patch$;

COMMIT;
