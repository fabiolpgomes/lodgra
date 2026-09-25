-- Auditoria de drift de migrations — SOMENTE LEITURA.
-- Rodar no SQL Editor de CADA projeto (staging wrqjpyyopwgyqluqkcga e prod brjumbfpvijrkhrherpt)
-- e exportar cada resultado como CSV: <ref>-A-history.csv e <ref>-B-catalog.csv

-- A) Histórico registrado pelo Supabase CLI
select version, name, coalesce(array_length(statements,1),0) as n_statements
from supabase_migrations.schema_migrations
order by version;

-- B) Snapshot do schema real (public + funções/triggers/policies/índices)
with cols as (
  select 'column' kind, table_name obj, column_name sub,
         data_type||'|'||is_nullable||'|'||coalesce(column_default,'') def
  from information_schema.columns where table_schema='public'
), pol as (
  select 'policy', tablename, policyname,
         cmd||'|'||array_to_string(roles,',')||'|'||coalesce(qual,'')||'|'||coalesce(with_check,'')
  from pg_policies where schemaname='public'
), fn as (
  select 'function', p.proname, pg_get_function_identity_arguments(p.oid), md5(pg_get_functiondef(p.oid))
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.prokind in ('f','p')
), trg as (
  select 'trigger', c.relname, t.tgname, md5(pg_get_triggerdef(t.oid))
  from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace
  where not t.tgisinternal and n.nspname in ('public','auth','storage')
), idx as (
  select 'index', tablename, indexname, indexdef from pg_indexes where schemaname='public'
), rls as (
  select 'rls', relname, '', relrowsecurity::text||'|'||relforcerowsecurity::text
  from pg_class c join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public' and c.relkind='r'
)
select * from cols union all select * from pol union all select * from fn
union all select * from trg union all select * from idx union all select * from rls
order by 1,2,3;
