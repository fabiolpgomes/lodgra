-- Colunas de cobrança da assinatura Lodgra (Stripe) em organizations.
--
-- O webhook /api/stripe/webhook e lib/billing/stripe-usage gravam/leem o item base
-- (preço por unidade/propriedade), o item medido (metered) e a quantidade faturada,
-- mas as colunas nunca existiram em produção: a primeira assinatura paga faria o
-- webhook falhar ao atualizar/criar a organização. O cliente Stripe continua em
-- organizations.stripe_customer_id (stripe_br_customer_id nunca existiu; o código
-- foi unificado nessa coluna).

alter table public.organizations
  add column if not exists stripe_subscription_item_id text,
  add column if not exists stripe_metered_item_id text,
  add column if not exists billing_unit_count integer not null default 1;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'organizations_billing_unit_count_positive'
  ) then
    alter table public.organizations
      add constraint organizations_billing_unit_count_positive check (billing_unit_count >= 1);
  end if;
end $$;

comment on column public.organizations.stripe_subscription_item_id is
  'Item base da assinatura Stripe (preço por propriedade).';
comment on column public.organizations.stripe_metered_item_id is
  'Item medido da assinatura Stripe (reservas/receita), quando o plano tem.';
comment on column public.organizations.billing_unit_count is
  'Quantidade faturada no item base (nº de propriedades cobradas).';
