import { PATCH } from '../route'
import { createTestRequest } from '@/__tests__/utils/test-request'
import { createClient } from '@/lib/supabase/server'

jest.mock('@/lib/supabase/server', () => ({ createClient: jest.fn() }))

function chain(result: unknown) {
  const q: Record<string, unknown> = {}
  for (const m of ['select', 'eq', 'is', 'update']) q[m] = jest.fn(() => q)
  q.maybeSingle = jest.fn(() => Promise.resolve(result))
  q.then = (resolve: (v: unknown) => unknown) => Promise.resolve({ error: null }).then(resolve)
  return q
}

const call = (body: unknown) => PATCH(
  createTestRequest('http://localhost/api/reservations/r1/guest', { method: 'PATCH', body: JSON.stringify(body) }),
  { params: Promise.resolve({ id: 'r1' }) },
)

describe('PATCH /api/reservations/[id]/guest', () => {
  let reservations: ReturnType<typeof chain>
  let guests: ReturnType<typeof chain>
  beforeEach(() => {
    reservations = chain({ data: { id: 'r1', guest_id: 'g1' }, error: null })
    guests = chain({ data: null, error: null })
    ;(createClient as jest.Mock).mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }) },
      from: jest.fn((table: string) => table === 'guests' ? guests : reservations),
    })
  })

  it('updates only the guest fields and the placeholder guest record', async () => {
    const response = await call({ guest_name: 'Manuela Constantino', number_of_guests: 2, total_price: 247.84 })
    expect(response.status).toBe(200)
    expect(reservations.update).toHaveBeenCalledWith(expect.objectContaining({
      guest_name: 'Manuela Constantino', first_name: 'Manuela', last_name: 'Constantino', number_of_guests: 2, total_price: 247.84, total_amount: 247.84,
    }))
    expect(Object.keys((reservations.update as jest.Mock).mock.calls[0][0])).not.toContain('guest_email')
    expect(guests.update).toHaveBeenCalledWith(expect.objectContaining({ first_name: 'Manuela' }))
    expect(guests.eq).toHaveBeenCalledWith('first_name', 'Hóspede')
  })

  it('keeps the current total when no value is given', async () => {
    await call({ guest_name: 'Ana Silva' })
    expect(Object.keys((reservations.update as jest.Mock).mock.calls[0][0])).not.toContain('total_amount')
  })

  it.each([[{ guest_name: 'Hóspede' }], [{ guest_name: '' }], [{ guest_name: 'Ana', total_price: -1 }]])('rejects %j', async (body) => {
    expect((await call(body)).status).toBe(400)
    expect(reservations.update).not.toHaveBeenCalled()
  })
})
