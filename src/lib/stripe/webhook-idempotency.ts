import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Idempotência dos webhooks do Stripe (tabela public.stripe_webhook_events).
 *
 * O Stripe entrega cada evento "pelo menos uma vez" — reenvia em timeout/erro e pode
 * entregar o mesmo evento em paralelo. Antes de processar, a rota reserva o event.id:
 *   - 'claimed'     → processar; no fim chamar markStripeEventProcessed (ou release em erro)
 *   - 'duplicate'   → já processado: responder 200 sem refazer nada
 *   - 'in_progress' → outra entrega está processando: responder 409 (o Stripe tenta de novo)
 */
export type StripeWebhookEndpoint = 'platform' | 'booking'
export type StripeEventClaim = 'claimed' | 'duplicate' | 'in_progress'

type EventRef = { id: string; type: string }

export async function claimStripeEvent(
  supabase: SupabaseClient,
  endpoint: StripeWebhookEndpoint,
  event: EventRef,
): Promise<StripeEventClaim> {
  const { data, error } = await supabase.rpc('claim_stripe_webhook_event', {
    p_event_id: event.id,
    p_endpoint: endpoint,
    p_event_type: event.type,
  })
  if (error) throw new Error(`Falha ao registrar evento Stripe ${event.id}: ${error.message}`)
  if (data !== 'claimed' && data !== 'duplicate' && data !== 'in_progress') {
    throw new Error(`Resposta inesperada ao registrar evento Stripe ${event.id}: ${String(data)}`)
  }
  return data
}

export async function markStripeEventProcessed(supabase: SupabaseClient, eventId: string): Promise<void> {
  const { error } = await supabase
    .from('stripe_webhook_events')
    .update({ status: 'processed', processed_at: new Date().toISOString() })
    .eq('event_id', eventId)
  // O efeito do evento já foi aplicado; uma falha aqui só permite um reprocessamento
  // futuro (os handlers também têm guardas próprias). Não derrubar a resposta.
  if (error) console.error(`[stripe-webhook] Falha ao marcar evento ${eventId} como processado:`, error.message)
}

export async function releaseStripeEvent(supabase: SupabaseClient, eventId: string): Promise<void> {
  const { error } = await supabase
    .from('stripe_webhook_events')
    .delete()
    .eq('event_id', eventId)
    .eq('status', 'processing')
  // Se a liberação falhar, a reserva expira sozinha em 10 minutos (claim retoma).
  if (error) console.error(`[stripe-webhook] Falha ao liberar evento ${eventId}:`, error.message)
}
