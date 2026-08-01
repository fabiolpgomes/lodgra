import { createProperty } from '../actions'
import { requireRole } from '@/lib/auth/requireRole'
import { createClient } from '@/lib/supabase/server'

// Mock dependencies
jest.mock('@/lib/auth/requireRole')
jest.mock('@/lib/supabase/server')

describe('Property Creation Server Action', () => {
  const mockOrganizationId = '00000000-0000-0000-0000-000000000001'
  const validPropertyData = {
    name: 'Test Property',
    owner_id: null,
    address: '123 Test St',
    city: 'Test City',
    country: 'Test Country',
    postal_code: '12345',
    property_type: 'apartment',
    bedrooms: 2,
    bathrooms: 1,
    max_guests: 4,
    currency: 'EUR',
    management_percentage: 15,
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Authorization', () => {
    it('should reject non-admin/manager users', async () => {
      ;(requireRole as jest.Mock).mockRejectedValueOnce(
        new Error('User does not have required role')
      )

      const result = await createProperty(validPropertyData)

      expect(result.error).toBe('User does not have required role')
      expect(requireRole).toHaveBeenCalledWith(['admin', 'gestor'])
    })

    it('should accept admin users', async () => {
      ;(requireRole as jest.Mock).mockResolvedValueOnce({
        organizationId: mockOrganizationId,
      })
      ;(createClient as jest.Mock).mockResolvedValueOnce({
        from: jest.fn().mockReturnValue({
          insert: jest.fn().mockReturnValue({
            then: jest.fn((callback) =>
              callback({ data: { id: '123' }, error: null })
            ),
          }),
        }),
      })

      const result = await createProperty(validPropertyData)

      expect(result.success).toBe(true)
    })
  })

  describe('Data Validation', () => {
    it('should include organization_id from auth context', async () => {
      ;(requireRole as jest.Mock).mockResolvedValueOnce({
        organizationId: mockOrganizationId,
      })

      const mockInsert = jest.fn().mockReturnValue({})
      const mockFrom = jest.fn().mockReturnValue({
        insert: mockInsert,
      })

      ;(createClient as jest.Mock).mockResolvedValueOnce({
        from: mockFrom,
      })

      await createProperty(validPropertyData)

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          organization_id: mockOrganizationId,
          name: validPropertyData.name,
        })
      )
    })

    it('should set is_active to true', async () => {
      ;(requireRole as jest.Mock).mockResolvedValueOnce({
        organizationId: mockOrganizationId,
      })

      const mockInsert = jest.fn().mockReturnValue({})
      const mockFrom = jest.fn().mockReturnValue({
        insert: mockInsert,
      })

      ;(createClient as jest.Mock).mockResolvedValueOnce({
        from: mockFrom,
      })

      await createProperty(validPropertyData)

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          is_active: true,
        })
      )
    })
  })

  describe('Error Handling', () => {
    it('should return error if insert fails', async () => {
      ;(requireRole as jest.Mock).mockResolvedValueOnce({
        organizationId: mockOrganizationId,
      })

      const mockError = new Error('Database error')
      ;(createClient as jest.Mock).mockResolvedValueOnce({
        from: jest.fn().mockReturnValue({
          insert: jest.fn().mockReturnValue({
            then: jest.fn((callback) =>
              callback({ data: null, error: mockError })
            ),
          }),
        }),
      })

      const result = await createProperty(validPropertyData)

      expect(result.error).toBeDefined()
    })
  })
})
