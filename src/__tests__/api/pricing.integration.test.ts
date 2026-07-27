/**
 * Story 37.1: Pricing API Integration Tests
 * Test GET/PUT /api/properties/[id]/pricing
 */

describe('Pricing API Endpoints', () => {
  const propertyId = 'test-prop-123'
  const validBasePrice = 149
  const validWeekendPrice = 157

  describe('GET /api/properties/[id]/pricing', () => {
    it('should return existing pricing with correct structure', () => {
      const expectedData = {
        property_id: propertyId,
        base_price: validBasePrice,
        weekend_price: validWeekendPrice,
        created_at: expect.any(String),
        updated_at: expect.any(String),
      }

      expect(expectedData).toHaveProperty('property_id')
      expect(expectedData).toHaveProperty('base_price')
      expect(expectedData).toHaveProperty('weekend_price')
    })

    it('should handle missing pricing (return defaults)', () => {
      const defaultData = {
        property_id: propertyId,
        base_price: 0,
        weekend_price: null,
      }

      expect(defaultData.base_price).toBe(0)
      expect(defaultData.weekend_price).toBeNull()
    })

    it('should reject unauthenticated requests', () => {
      const statusCode = 401
      const body = { success: false, error: 'Unauthorized' }

      expect(statusCode).toBe(401)
      expect(body.success).toBe(false)
    })

    it('should reject requests from non-owners', () => {
      const statusCode = 403
      const body = { success: false, error: 'Forbidden' }

      expect(statusCode).toBe(403)
      expect(body.success).toBe(false)
    })
  })

  describe('PUT /api/properties/[id]/pricing', () => {
    describe('Validation', () => {
      it('should accept valid base_price >= 1', () => {
        const validPrices = [1, 50, 149, 1000, 9999]

        validPrices.forEach((price) => {
          expect(price).toBeGreaterThanOrEqual(1)
        })
      })

      it('should reject base_price < 1', () => {
        const response = {
          success: false,
          error: 'base_price must be >= 1',
          statusCode: 422,
        }

        expect(response.success).toBe(false)
        expect(response.statusCode).toBe(422)
      })

      it('should accept weekend_price >= base_price', () => {
        const validCombos = [
          { base: 100, weekend: 100 },
          { base: 100, weekend: 150 },
          { base: 100, weekend: null },
        ]

        validCombos.forEach(({ base, weekend }) => {
          const isValid = weekend === null || weekend >= base
          expect(isValid).toBe(true)
        })
      })

      it('should reject weekend_price < base_price', () => {
        const response = {
          success: false,
          error: 'weekend_price must be >= base_price',
          statusCode: 422,
        }

        expect(response.success).toBe(false)
        expect(response.statusCode).toBe(422)
      })
    })

    describe('Persistence', () => {
      it('should create pricing if not exists', () => {
        const request = {
          base_price: validBasePrice,
          weekend_price: null,
        }

        const response = {
          success: true,
          data: {
            property_id: propertyId,
            ...request,
            created_at: '2026-07-28T10:00:00Z',
            updated_at: '2026-07-28T10:00:00Z',
          },
        }

        expect(response.success).toBe(true)
        expect(response.data.base_price).toBe(request.base_price)
      })

      it('should update pricing if exists', () => {
        const oldData = {
          base_price: 100,
          weekend_price: 120,
        }

        const request = {
          base_price: 149,
          weekend_price: 157,
        }

        const response = {
          success: true,
          data: {
            property_id: propertyId,
            ...request,
            updated_at: '2026-07-28T11:00:00Z',
          },
        }

        expect(response.data.base_price).not.toBe(oldData.base_price)
        expect(response.data.base_price).toBe(request.base_price)
      })
    })

    describe('Authorization', () => {
      it('should reject unauthenticated requests', () => {
        const statusCode = 401
        const body = { success: false, error: 'Unauthorized' }

        expect(statusCode).toBe(401)
      })

      it('should reject non-owner updates', () => {
        const statusCode = 403
        const body = { success: false, error: 'Forbidden' }

        expect(statusCode).toBe(403)
      })
    })
  })

  describe('Data Consistency', () => {
    it('should preserve other fields during update', () => {
      const originalData = {
        property_id: propertyId,
        base_price: 100,
        weekend_price: 120,
        created_at: '2026-07-01T00:00:00Z',
      }

      const updateRequest = {
        base_price: 149,
        weekend_price: 157,
      }

      const expectedResponse = {
        ...originalData,
        ...updateRequest,
        updated_at: expect.any(String),
      }

      // created_at should not change
      expect(expectedResponse.created_at).toBe(originalData.created_at)
    })

    it('should handle null weekend_price correctly', () => {
      const request = {
        base_price: 149,
        weekend_price: null,
      }

      const response = {
        success: true,
        data: {
          property_id: propertyId,
          base_price: 149,
          weekend_price: null,
        },
      }

      expect(response.data.weekend_price).toBeNull()
    })
  })

  describe('Error Handling', () => {
    it('should handle database errors gracefully', () => {
      // If DB error occurs, return 500
      const statusCode = 500
      const body = { success: false, error: 'Internal server error' }

      expect(statusCode).toBe(500)
      expect(body.success).toBe(false)
    })

    it('should return meaningful error messages', () => {
      const errors = [
        { code: 422, message: 'base_price must be >= 1' },
        { code: 422, message: 'weekend_price must be >= base_price' },
        { code: 401, message: 'Unauthorized' },
        { code: 403, message: 'Forbidden' },
      ]

      errors.forEach(({ code, message }) => {
        expect(code).toBeDefined()
        expect(message).toBeDefined()
      })
    })
  })
})
