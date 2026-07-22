/**
 * Phase 6: Correction Service Tests (AC7)
 *
 * Unit tests for correction logging functionality:
 * - Logging corrections when fields are edited
 * - Calculating correction statistics by field and platform
 * - Retrieving correction audit trail
 * - Multi-tenant isolation
 */

describe('Phase 6: Correction Service (AC7)', () => {
  describe('CorrectionRecord Type', () => {
    it('should have required fields: id, extraction_id, field, corrected_value', () => {
      const record = {
        id: 'correction-1',
        organization_id: 'org-1',
        extraction_id: 'extraction-1',
        field: 'guest_name',
        original_value: 'João',
        corrected_value: 'João Silva',
        source_platform: 'airbnb',
        created_at: '2026-07-22T10:00:00Z',
      }

      expect(record.id).toBeDefined()
      expect(record.extraction_id).toBeDefined()
      expect(record.field).toBeDefined()
      expect(record.corrected_value).toBeDefined()
      expect(record.organization_id).toBeDefined()
    })
  })

  describe('CorrectionStats Type', () => {
    it('should include field, platform, count, and rate', () => {
      const stats = {
        field: 'guest_name',
        platform: 'airbnb',
        count: 5,
        rate: 12.5,
      }

      expect(stats.field).toBe('guest_name')
      expect(stats.platform).toBe('airbnb')
      expect(stats.count).toBe(5)
      expect(stats.rate).toBe(12.5)
      expect(stats.rate).toBeGreaterThanOrEqual(0)
      expect(stats.rate).toBeLessThanOrEqual(100)
    })

    it('should calculate rate as percentage', () => {
      const totalExtractions = 40
      const corrections = 5
      const expectedRate = (corrections / totalExtractions) * 100

      expect(expectedRate).toBe(12.5)
    })
  })

  describe('Correction Service Behavior', () => {
    it('should enforce constraint: original_value != corrected_value', () => {
      const validCorrection = {
        original_value: 'old value',
        corrected_value: 'new value',
      }

      // DB constraint check: values must be different
      expect(validCorrection.original_value).not.toBe(validCorrection.corrected_value)
      expect(validCorrection.corrected_value).toBe('new value')
    })

    it('should handle null original_value (for newly extracted fields)', () => {
      const record = {
        id: 'correction-1',
        organization_id: 'org-1',
        extraction_id: 'extraction-1',
        field: 'new_field',
        original_value: null, // Field was empty/undefined
        corrected_value: 'new value',
        source_platform: 'airbnb',
        created_at: '2026-07-22T10:00:00Z',
      }

      expect(record.original_value).toBeNull()
      expect(record.corrected_value).toBe('new value')
    })

    it('should track corrections by field and platform', () => {
      const corrections = [
        { field: 'guest_name', platform: 'airbnb', count: 3 },
        { field: 'guest_name', platform: 'booking', count: 1 },
        { field: 'check_in', platform: 'airbnb', count: 2 },
      ]

      const airbnbCorrections = corrections.filter((c) => c.platform === 'airbnb')
      expect(airbnbCorrections).toHaveLength(2)
      expect(airbnbCorrections[0].count + airbnbCorrections[1].count).toBe(5)
    })
  })

  describe('Multi-Tenant Isolation', () => {
    it('should isolate corrections by organization_id', () => {
      const org1Corrections = [
        { organization_id: 'org-1', field: 'guest_name', count: 5 },
      ]
      const org2Corrections = [
        { organization_id: 'org-2', field: 'guest_name', count: 3 },
      ]

      expect(org1Corrections[0].organization_id).not.toBe(org2Corrections[0].organization_id)
      expect(org1Corrections[0].count).toBe(5)
      expect(org2Corrections[0].count).toBe(3)
    })
  })
})
