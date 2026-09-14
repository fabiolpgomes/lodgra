-- Read-only metadata snapshot, verified 2026-09-14 before migration.
-- Production: reservations.deleted_at = timestamp without time zone, nullable,
-- no default. Staging: column absent (RPC test raised SQLSTATE 42703).
SELECT format_type(a.atttypid,a.atttypmod) AS data_type,
       a.attnotnull, pg_get_expr(d.adbin,d.adrelid) AS column_default
FROM pg_attribute a
LEFT JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum
WHERE a.attrelid='public.reservations'::regclass AND a.attname='deleted_at';
