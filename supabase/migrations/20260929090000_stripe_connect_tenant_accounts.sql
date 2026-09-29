-- Stripe Connect: cada organização (tenant) recebe as reservas diretas na sua própria
-- conta Stripe (conta conectada, Accounts v2, cobranças diretas).
-- Plano: docs/stripe/CONNECT-PAGAMENTOS-TENANTS.md

alter table public.organizations
  add column if not exists stripe_connect_account_id text,
  add column if not exists stripe_connect_platform text,
  add column if not exists stripe_connect_status text not null default 'none',
  add column if not exists stripe_connect_updated_at timestamptz;

alter table public.organizations
  add constraint organizations_stripe_connect_account_id_key unique (stripe_connect_account_id);

alter table public.organizations
  add constraint organizations_stripe_connect_platform_check
    check (stripe_connect_platform is null or stripe_connect_platform in ('brl', 'eur'));

alter table public.organizations
  add constraint organizations_stripe_connect_status_check
    check (stripe_connect_status in ('none', 'pending', 'active', 'restricted'));

comment on column public.organizations.stripe_connect_account_id is
  'Conta Stripe conectada do tenant (acct_...), onde as reservas diretas são cobradas.';
comment on column public.organizations.stripe_connect_platform is
  'Plataforma Lodgra à qual a conta está ligada: brl = Lodgra BR, eur = Lodgra PT.';
comment on column public.organizations.stripe_connect_status is
  'none = sem conta; pending = cadastro incompleto; active = aceita pagamentos; restricted = bloqueada pelo Stripe.';

-- Em que conta foi cobrada cada reserva (para reembolsos e cancelamentos).
-- null = modelo anterior (chave própria da AHS em STRIPE_PT_SECRET_KEY).
alter table public.reservations
  add column if not exists stripe_account_id text,
  add column if not exists stripe_connect_platform text;

alter table public.reservations
  add constraint reservations_stripe_connect_platform_check
    check (stripe_connect_platform is null or stripe_connect_platform in ('brl', 'eur'));
