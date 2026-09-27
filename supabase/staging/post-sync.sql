-- Executado pelo scripts/sync-prod-to-staging.sh DEPOIS do restore no staging.
-- O `DROP SCHEMA public CASCADE` do sync remove objetos fora de public que dependem dele
-- (ex.: trigger em auth.users) e o dump
-- com --schema não recria extensões. Isto repõe o que a baseline de produção tem.
-- Jobs de pg_cron NÃO são criados no staging (chamariam lodgra.io de produção).

create extension if not exists "http" with schema "public";

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();
