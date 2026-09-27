-- Débito técnico (INVENTARIO-FUNCIONALIDADES.md, grupo A): objetos que o código usa e não existiam.
-- Acesso de escrita é sempre pelo service role (rotas de API); leitura autenticada restrita à organização.

-- 1) Descadastro de e-mails (link de unsubscribe dos e-mails de confirmação — RGPD)
create table public.email_unsubscribes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  customer_email text not null,
  unsubscribed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint email_unsubscribes_org_email_key unique (organization_id, customer_email)
);
create index idx_email_unsubscribes_unsubscribed_at on public.email_unsubscribes (unsubscribed_at);
alter table public.email_unsubscribes enable row level security;
create policy email_unsubscribes_tenant_select on public.email_unsubscribes
  for select to authenticated using (organization_id = public.get_user_organization_id());

-- 2) Log de e-mails transacionais enviados
create table public.email_sent (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  booking_id uuid references public.reservations(id) on delete set null,
  customer_email text not null,
  template_type text not null default 'confirmation',
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed')),
  sent_at timestamptz not null default now(),
  retry_count integer not null default 0
);
create index idx_email_sent_org_booking on public.email_sent (organization_id, booking_id);
create index idx_email_sent_booking_id on public.email_sent (booking_id);
create index idx_email_sent_sent_at on public.email_sent (sent_at);
alter table public.email_sent enable row level security;
create policy email_sent_tenant_select on public.email_sent
  for select to authenticated using (organization_id = public.get_user_organization_id());

-- 3) Resumo de comissões (dashboard de relatórios). View comum com security_invoker:
--    respeita o RLS de reservations/properties do usuário e está sempre atualizada.
create view public.commission_summary with (security_invoker = true) as
select
  r.organization_id,
  r.property_id,
  p.name as property_name,
  (date_trunc('day', r.commission_calculated_at))::date as commission_date,
  count(*)::integer as booking_count,
  sum(r.commission_amount) as total_commission,
  avg(r.commission_amount) as avg_commission_per_booking,
  max(r.commission_rate) as max_rate,
  min(r.commission_rate) as min_rate
from public.reservations r
join public.properties p on p.id = r.property_id
where r.status <> 'cancelled'
  and r.commission_amount is not null
  and r.commission_calculated_at is not null
group by r.organization_id, r.property_id, p.name, (date_trunc('day', r.commission_calculated_at))::date;
revoke all on public.commission_summary from anon;
grant select on public.commission_summary to authenticated, service_role;

-- Função de refresh da antiga view materializada (nunca existiu; nenhum trigger a usa).
drop function if exists public.refresh_commission_summary();

-- 4) Bucket privado de comprovantes de despesas (acesso só via service role em /api/expenses/[id]/documents)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'expense-documents', 'expense-documents', false, 20971520,
  array[
    'application/pdf', 'image/jpeg', 'image/jpg',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
)
on conflict (id) do nothing;
