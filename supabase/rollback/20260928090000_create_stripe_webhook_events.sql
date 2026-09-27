-- Rollback de 20260928090000_create_stripe_webhook_events.sql
-- Atenção: reverter também o código (src/lib/stripe/webhook-idempotency.ts e as duas rotas),
-- senão os webhooks passam a responder 500.
drop function if exists public.claim_stripe_webhook_event(text, text, text, interval);
drop table if exists public.stripe_webhook_events;
