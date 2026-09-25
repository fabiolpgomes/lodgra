-- Reset do histórico de migrations para a baseline de produção.
-- RODAR SÓ DEPOIS de o arquivo supabase/migrations/20260925000000_baseline_producao.sql existir no repo.
-- Escreve apenas em supabase_migrations (não toca em dados nem no schema da aplicação).
-- Rodar em produção (brjumbfpvijrkhrherpt) e, se o staging for mantido, também em staging (wrqjpyyopwgyqluqkcga).

begin;

-- 1) Backup do histórico atual (reversível)
create table if not exists supabase_migrations.schema_migrations_backup_20260925 as
  select * from supabase_migrations.schema_migrations;

-- 2) Limpa o histórico e registra só a baseline
delete from supabase_migrations.schema_migrations;
insert into supabase_migrations.schema_migrations (version, name)
values ('20260925000000', 'baseline_producao'), ('20260925000001', 'baseline_auth_storage_cron');

-- 3) Conferência: deve retornar 2 linhas, e o backup deve ter 208 (prod) ou 109 (staging)
select (select count(*) from supabase_migrations.schema_migrations) historico,
       (select count(*) from supabase_migrations.schema_migrations_backup_20260925) backup;

commit;

-- Rollback, se precisar:
-- begin; delete from supabase_migrations.schema_migrations;
-- insert into supabase_migrations.schema_migrations select * from supabase_migrations.schema_migrations_backup_20260925; commit;
