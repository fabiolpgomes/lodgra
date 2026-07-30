import { syncExtractedDataToReservation } from '../sync-to-reservations'
import { createAdminClient } from '@/lib/supabase/admin'

jest.mock('@/lib/supabase/admin')

describe('Email Extraction Sync Service', () => {
  let mockSupabase: any

  beforeEach(() => {
    jest.clearAllMocks()
    mockSupabase = {
      from: jest.fn(),
    }
    ;(createAdminClient as jest.Mock).mockResolvedValue(mockSupabase)
  })

  it('syncs extracted data to reservation', async () => {
    const extractionId = 'ext-123'
    const reservationId = 'res-456'

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'email_extractions') {
        return {
          select: () => ({
            eq: () => ({
              single: () =>
                Promise.resolve({
                  data: {
                    id: extractionId,
                    organization_id: 'org-789',
                    guest_name: 'João Silva',
                    phone: '+351 912345678',
                    total_value: 500,
                    check_in: '2026-08-20',
                    check_out: '2026-08-25',
                    sync_status: 'pending',
                  },
                  error: null,
                }),
            }),
          }),
          update: () => ({
            eq: () => Promise.resolve({ error: null }),
          }),
        }
      }

      if (table === 'reservations') {
        return {
          select: () => ({
            eq: () => ({
              gte: () => ({
                lte: () => ({
                  limit: () =>
                    Promise.resolve({
                      data: [{ id: reservationId, organization_id: 'org-789' }],
                      error: null,
                    }),
                }),
              }),
            }),
          }),
          update: () => ({
            eq: () => Promise.resolve({ error: null }),
          }),
        }
      }

      return {
        update: () => ({ eq: () => Promise.resolve({ error: null }) }),
      }
    })

    const result = await syncExtractedDataToReservation(extractionId)

    expect(result.success).toBe(true)
    expect(mockSupabase.from).toHaveBeenCalledWith('email_extractions')
    expect(mockSupabase.from).toHaveBeenCalledWith('reservations')
  })

  it('handles extraction not found', async () => {
    const extractionId = 'ext-999'

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'email_extractions') {
        return {
          select: () => ({
            eq: () => ({
              single: () =>
                Promise.resolve({
                  data: null,
                  error: { message: 'Not found' },
                }),
            }),
          }),
        }
      }
    })

    const result = await syncExtractedDataToReservation(extractionId)

    expect(result.success).toBe(false)
    expect(result.error).toContain('not found')
  })

  it('skips if already synced', async () => {
    const extractionId = 'ext-synced'

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'email_extractions') {
        return {
          select: () => ({
            eq: () => ({
              single: () =>
                Promise.resolve({
                  data: {
                    id: extractionId,
                    sync_status: 'synced',
                  },
                  error: null,
                }),
            }),
          }),
        }
      }
    })

    const result = await syncExtractedDataToReservation(extractionId)

    expect(result.success).toBe(true)
  })

  it('handles no matching reservation', async () => {
    const extractionId = 'ext-no-match'

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'email_extractions') {
        return {
          select: () => ({
            eq: () => ({
              single: () =>
                Promise.resolve({
                  data: {
                    id: extractionId,
                    organization_id: 'org-789',
                    guest_name: 'João Silva',
                    phone: '+351 912345678',
                    check_in: '2026-08-20',
                    check_out: '2026-08-25',
                    sync_status: 'pending',
                  },
                  error: null,
                }),
            }),
          }),
        }
      }

      if (table === 'reservations') {
        return {
          select: () => ({
            eq: () => ({
              gte: () => ({
                lte: () => ({
                  limit: () =>
                    Promise.resolve({
                      data: [],
                      error: null,
                    }),
                }),
              }),
            }),
          }),
        }
      }
    })

    const result = await syncExtractedDataToReservation(extractionId)

    // Should not fail if no reservation found (might be created later)
    expect(result.success).toBe(true)
  })

  it('splits guest name correctly', async () => {
    const extractionId = 'ext-name-split'
    const reservationId = 'res-999'
    let capturedUpdate: any

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'email_extractions') {
        return {
          select: () => ({
            eq: () => ({
              single: () =>
                Promise.resolve({
                  data: {
                    id: extractionId,
                    organization_id: 'org-789',
                    guest_name: 'João Manuel Silva',
                    phone: '+351 912345678',
                    check_in: '2026-08-20',
                    check_out: '2026-08-25',
                    sync_status: 'pending',
                  },
                  error: null,
                }),
            }),
          }),
          update: jest.fn(() => ({ eq: () => Promise.resolve({ error: null }) })),
        }
      }

      if (table === 'reservations') {
        return {
          select: () => ({
            eq: () => ({
              gte: () => ({
                lte: () => ({
                  limit: () =>
                    Promise.resolve({
                      data: [{ id: reservationId, organization_id: 'org-789' }],
                      error: null,
                    }),
                }),
              }),
            }),
          }),
          update: jest
            .fn()
            .mockImplementation((data) => {
              capturedUpdate = data
              return { eq: () => Promise.resolve({ error: null }) }
            }),
        }
      }
    })

    await syncExtractedDataToReservation(extractionId)

    expect(capturedUpdate).toMatchObject({
      first_name: 'João',
      last_name: 'Manuel Silva',
      guest_phone: '+351 912345678',
    })
  })
})
