import type { SupabaseClient } from '@supabase/supabase-js'
import {
  claimStripeEvent,
  markStripeEventProcessed,
  releaseStripeEvent,
} from '@/lib/stripe/webhook-idempotency'

const event = { id: 'evt_123', type: 'checkout.session.completed' }

function clientWithRpc(result: { data: unknown; error: { message: string } | null }) {
  return { rpc: jest.fn().mockResolvedValue(result) } as unknown as SupabaseClient & { rpc: jest.Mock }
}

describe('claimStripeEvent', () => {
  it.each(['claimed', 'duplicate', 'in_progress'] as const)('devolve %s vindo da função do banco', async status => {
    const supabase = clientWithRpc({ data: status, error: null })
    await expect(claimStripeEvent(supabase, 'booking', event)).resolves.toBe(status)
    expect(supabase.rpc).toHaveBeenCalledWith('claim_stripe_webhook_event', {
      p_event_id: 'evt_123', p_endpoint: 'booking', p_event_type: 'checkout.session.completed',
    })
  })

  it('lança erro quando o banco falha (a rota responde 500 e o Stripe reenvia)', async () => {
    const supabase = clientWithRpc({ data: null, error: { message: 'boom' } })
    await expect(claimStripeEvent(supabase, 'platform', event)).rejects.toThrow('boom')
  })

  it('lança erro em resposta inesperada', async () => {
    const supabase = clientWithRpc({ data: 'weird', error: null })
    await expect(claimStripeEvent(supabase, 'platform', event)).rejects.toThrow('inesperada')
  })
})

describe('markStripeEventProcessed / releaseStripeEvent', () => {
  function tableClient() {
    const eq2 = jest.fn().mockResolvedValue({ error: null })
    const eq1 = jest.fn().mockReturnValue(Object.assign(Promise.resolve({ error: null }), { eq: eq2 }))
    const update = jest.fn().mockReturnValue({ eq: eq1 })
    const del = jest.fn().mockReturnValue({ eq: eq1 })
    const from = jest.fn().mockReturnValue({ update, delete: del })
    return { client: { from } as unknown as SupabaseClient, from, update, del, eq1, eq2 }
  }

  it('marca o evento como processado', async () => {
    const t = tableClient()
    await markStripeEventProcessed(t.client, 'evt_123')
    expect(t.from).toHaveBeenCalledWith('stripe_webhook_events')
    expect(t.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'processed' }))
    expect(t.eq1).toHaveBeenCalledWith('event_id', 'evt_123')
  })

  it('libera só evento ainda em processamento', async () => {
    const t = tableClient()
    await releaseStripeEvent(t.client, 'evt_123')
    expect(t.del).toHaveBeenCalled()
    expect(t.eq1).toHaveBeenCalledWith('event_id', 'evt_123')
    expect(t.eq2).toHaveBeenCalledWith('status', 'processing')
  })
})
