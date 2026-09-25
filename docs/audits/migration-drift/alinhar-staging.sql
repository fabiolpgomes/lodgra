-- Alinha o STAGING (wrqjpyyopwgyqluqkcga) à baseline de produção.
-- Rodar no SQL Editor do projeto home-stay-staging. Transação única, com backup do histórico.
-- Não cria os jobs de pg_cron (chamariam lodgra.io de produção).
begin;
create table if not exists supabase_migrations.schema_migrations_backup_20260925 as select * from supabase_migrations.schema_migrations;
delete from supabase_migrations.schema_migrations;
insert into supabase_migrations.schema_migrations (version, name) values ('20260925000000','baseline_producao'), ('20260925000001','baseline_auth_storage_cron');

create extension if not exists "http" with schema "public";

drop policy if exists "Allow admins to delete images 107eh68_0" on storage.objects;
create policy "Allow admins to delete images 107eh68_0" on storage.objects for delete to authenticated
  using ((bucket_id = 'property-images') and ((auth.jwt() ->> 'role') = 'admin') and (((auth.jwt() ->> 'organization_id'))::uuid = (select properties.organization_id from public.properties where properties.id = (objects.path_tokens[2])::uuid)));
drop policy if exists "Allow managers to upload images 107eh68_0" on storage.objects;
create policy "Allow managers to upload images 107eh68_0" on storage.objects for insert to public
  with check ((bucket_id = 'property-images') and ((auth.jwt() ->> 'custom_claims_role') = any (array['admin','gestor'])) and (((auth.jwt() ->> 'organization_id'))::uuid = (select properties.organization_id from public.properties where properties.id = (objects.path_tokens[2])::uuid)));
drop policy if exists "Allow public access for public properties 107eh68_0" on storage.objects;
create policy "Allow public access for public properties 107eh68_0" on storage.objects for select to authenticated
  using ((bucket_id = 'property-images') and ((select properties.is_public from public.properties where properties.id = (objects.path_tokens[2])::uuid) = true));
drop policy if exists "Allow users to view organization images 107eh68_0" on storage.objects;
create policy "Allow users to view organization images 107eh68_0" on storage.objects for select to authenticated
  using ((bucket_id = 'property-images') and ((auth.jwt() ->> 'role') is not null) and (((auth.jwt() ->> 'organization_id'))::uuid in (select properties.organization_id from public.properties where properties.id = (objects.path_tokens[2])::uuid)));
commit;

-- Conferência: hist = 2 baselines, backup = 109, pol_storage = 7, http = 1, cron = 0
select (select string_agg(version, ',' order by version) from supabase_migrations.schema_migrations) hist,
       (select count(*) from supabase_migrations.schema_migrations_backup_20260925) backup,
       (select count(*) from pg_policies where schemaname = 'storage') pol_storage,
       (select count(*) from pg_extension where extname = 'http') http,
       (select count(*) from cron.job) cron;
