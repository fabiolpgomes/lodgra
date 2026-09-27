-- Idempotência dos webhooks do Stripe.
--
-- O Stripe entrega cada evento "pelo menos uma vez": reenvia em timeout/erro e pode
-- entregar o mesmo evento em paralelo. Esta tabela registra cada event.id recebido
-- pelos dois endpoints (/api/stripe/webhook = 'platform', /api/stripe/booking-webhook
-- = 'booking') para que um evento seja processado uma única vez.
--
-- Fluxo (src/lib/stripe/webhook-idempotency.ts):
--   claim_stripe_webhook_event → 'claimed' | 'duplicate' | 'in_progress'
--   sucesso → status 'processed'; falha → linha removida para o Stripe reprocessar.
-- Uma linha presa em 'processing' (ex.: timeout da função) é retomada após 10 minutos.
-- Acesso só pela service role (rotas de webhook); anon/authenticated sem acesso.

create table if not exists public.stripe_webhook_events (
  event_id     text primary key,
  endpoint     text not null check (endpoint in ('platform', 'booking')),
  event_type   text not null,
  status       text not null default 'processing' check (status in ('processing', 'processed')),
  attempts     integer not null default 1 check (attempts >= 1),
  received_at  timestamptz not null default now(),
  processed_at timestamptz
);

comment on table public.stripe_webhook_events is
  'Eventos do Stripe já recebidos (idempotência dos webhooks). Só service role.';

alter table public.stripe_webhook_events enable row level security;
revoke all on table public.stripe_webhook_events from anon, authenticated;
grant select, insert, update, delete on table public.stripe_webhook_events to service_role;

create or replace function public.claim_stripe_webhook_event(
  p_event_id text,
  p_endpoint text,
  p_event_type text,
  p_stale_after interval default interval '10 minutes'
) returns text
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_status text;
begin
  insert into public.stripe_webhook_events (event_id, endpoint, event_type)
  values (p_event_id, p_endpoint, p_event_type)
  on conflict (event_id) do nothing;
  if found then
    return 'claimed';
  end if;

  -- Retoma um processamento abandonado (a função caiu antes de concluir ou liberar).
  update public.stripe_webhook_events
     set attempts = attempts + 1, received_at = now()
   where event_id = p_event_id
     and status = 'processing'
     and received_at < now() - p_stale_after;
  if found then
    return 'claimed';
  end if;

  select status into v_status from public.stripe_webhook_events where event_id = p_event_id;
  return case when v_status = 'processed' then 'duplicate' else 'in_progress' end;
end;
$$;

comment on function public.claim_stripe_webhook_event(text, text, text, interval) is
  'Reserva o processamento de um evento Stripe: claimed | duplicate | in_progress.';

revoke all on function public.claim_stripe_webhook_event(text, text, text, interval) from public, anon, authenticated;
grant execute on function public.claim_stripe_webhook_event(text, text, text, interval) to service_role;
