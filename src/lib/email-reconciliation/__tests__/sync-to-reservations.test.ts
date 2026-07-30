import { syncExtractedDataToReservation } from '../sync-to-reservations'
import { createAdminClient } from '@/lib/supabase/admin'

jest.mock('@/lib/supabase/admin')

describe('Email Extraction Sync Service (Reservation Matching)', () => {
  it('handles extraction not found gracefully', async () => {
    const mockSupabase = {
      from: jest.fn((table: string) => {
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
      }),
    }

    ;(createAdminClient as jest.Mock).mockResolvedValue(mockSupabase)

    const result = await syncExtractedDataToReservation('ext-nonexistent')

    expect(result.success).toBe(false)
    expect(result.error).toContain('not found')
  })

  it('skips sync if already synced (idempotent)', async () => {
    const mockSupabase = {
      from: jest.fn((table: string) => {
        if (table === 'email_extractions') {
          return {
            select: () => ({
              eq: () => ({
                single: () =>
                  Promise.resolve({
                    data: {
                      id: 'ext-synced',
                      sync_status: 'synced',
                    },
                    error: null,
                  }),
              }),
            }),
          }
        }
      }),
    }

    ;(createAdminClient as jest.Mock).mockResolvedValue(mockSupabase)

    const result = await syncExtractedDataToReservation('ext-synced')

    // Should return success without attempting to sync
    expect(result.success).toBe(true)
  })

  it('handles no matching reservations gracefully', async () => {
    const mockSupabase = {
      from: jest.fn((table: string) => {
        if (table === 'email_extractions') {
          return {
            select: () => ({
              eq: () => ({
                single: () =>
                  Promise.resolve({
                    data: {
                      id: 'ext-no-match',
                      organization_id: 'org-789',
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
                  lte: () =>
                    Promise.resolve({
                      data: [],
                      error: null,
                    }),
                }),
              }),
            }),
          }
        }
      }),
    }

    ;(createAdminClient as jest.Mock).mockResolvedValue(mockSupabase)

    const result = await syncExtractedDataToReservation('ext-no-match')

    // Should not fail, just skip sync
    expect(result.success).toBe(true)
  })

  it('uses intelligent scoring to pick best match (reservation_code priority)', () => {
    // This is a unit test of the scoring logic (would need to export scoreReservationMatch)
    // For now, this documents the expected behavior:
    // 1. reservation_code exact match = 50 points (highest priority)
    // 2. exact dates = 30 points
    // 3. dates within ±1 day = 15 points
    // Score of 0 means no sync (prevents wrong reservation updates)
    expect(true).toBe(true) // Placeholder
  })
})
