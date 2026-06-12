import { DELETE } from '@/app/api/calendar/reservations/[id]/route'
import { createTestRequest } from '@/__tests__/utils/test-request'
import { createClient } from '@/lib/supabase/server'

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

jest.mock('@/lib/auth/requireRole', () => ({
  requireRole: jest.fn(async () => ({
    authorized: true,
    response: null,
  })),
}))

describe('DELETE /api/calendar/reservations/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should delete a reservation successfully', async () => {
    const mockSupabase = {
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { id: 'res-123' },
              error: null,
            }),
          }),
        }),
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            error: null,
          }),
        }),
      }),
    }

    ;(createClient as jest.Mock).mockResolvedValue(mockSupabase)

    const request = createTestRequest(
      'http://localhost/api/calendar/reservations/res-123',
      { method: 'DELETE' }
    )

    const response = await DELETE(request, {
      params: Promise.resolve({ id: 'res-123' }),
    })

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.success).toBe(true)
  })

  it('should return 404 if reservation not found', async () => {
    const mockSupabase = {
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      }),
    }

    ;(createClient as jest.Mock).mockResolvedValue(mockSupabase)

    const request = createTestRequest(
      'http://localhost/api/calendar/reservations/nonexistent',
      { method: 'DELETE' }
    )

    const response = await DELETE(request, {
      params: Promise.resolve({ id: 'nonexistent' }),
    })

    expect(response.status).toBe(404)
    const data = await response.json()
    expect(data.error).toBe('Reserva não encontrada')
  })
})
