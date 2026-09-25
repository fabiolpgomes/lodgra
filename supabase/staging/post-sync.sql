-- Executado pelo scripts/sync-prod-to-staging.sh DEPOIS do restore no staging.
-- O `DROP SCHEMA public CASCADE` do sync remove objetos fora de public que dependem dele
-- (trigger em auth.users, policies de storage que consultam public.properties) e o dump
-- com --schema não recria extensões. Isto repõe o que a baseline de produção tem.
-- Jobs de pg_cron NÃO são criados no staging (chamariam lodgra.io de produção).

create extension if not exists "http" with schema "public";

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

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
