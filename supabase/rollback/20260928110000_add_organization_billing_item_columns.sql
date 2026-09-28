-- Rollback de 20260928110000_add_organization_billing_item_columns.sql
-- Atenção: o webhook de assinaturas e lib/billing/stripe-usage dependem destas colunas.
alter table public.organizations drop constraint if exists organizations_billing_unit_count_positive;
alter table public.organizations
  drop column if exists stripe_subscription_item_id,
  drop column if exists stripe_metered_item_id,
  drop column if exists billing_unit_count;
