-- Rollback de 20260929090000_stripe_connect_tenant_accounts.sql
alter table public.reservations drop constraint if exists reservations_stripe_connect_platform_check;
alter table public.reservations
  drop column if exists stripe_connect_platform,
  drop column if exists stripe_account_id;

alter table public.organizations drop constraint if exists organizations_stripe_connect_status_check;
alter table public.organizations drop constraint if exists organizations_stripe_connect_platform_check;
alter table public.organizations drop constraint if exists organizations_stripe_connect_account_id_key;
alter table public.organizations
  drop column if exists stripe_connect_updated_at,
  drop column if exists stripe_connect_status,
  drop column if exists stripe_connect_platform,
  drop column if exists stripe_connect_account_id;
