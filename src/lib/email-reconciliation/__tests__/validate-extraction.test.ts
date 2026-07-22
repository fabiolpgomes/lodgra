import { validateExtraction, calculatePropertyAdr } from '../validate-extraction'
import { ExtractionResult } from '../extraction.schema'

describe('Deterministic Validation — AC4 Phase 3', () => {
  // RULE 1: Reject check_out <= check_in
  describe('Rule 1: Date Validation (check_out > check_in)', () => {
    it('should reject when check_out equals check_in', () => {
      const extraction: ExtractionResult = {
        success: true,
        data: {
          guest_name: 'João Silva',
          check_in: '2026-08-15',
          check_out: '2026-08-15', // SAME DAY = INVALID
        },
        confidence: 0.95,
        raw_response: '{}',
      }

      const result = validateExtraction(extraction)

      expect(result.valid).toBe(false)
      expect(result.confidence).toBe(0)
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          field: 'dates',
          severity: 'error',
          message: expect.stringContaining('must be after'),
        })
      )
    })

    it('should reject when check_out is before check_in', () => {
      const extraction: ExtractionResult = {
        success: true,
        data: {
          guest_name: 'Maria Santos',
          check_in: '2026-08-20',
          check_out: '2026-08-15', // BEFORE = INVALID
        },
        confidence: 0.90,
        raw_response: '{}',
      }

      const result = validateExtraction(extraction)

      expect(result.valid).toBe(false)
      expect(result.issues.some(i => i.field === 'dates' && i.severity === 'error')).toBe(true)
    })

    it('should accept valid date range', () => {
      const extraction: ExtractionResult = {
        success: true,
        data: {
          guest_name: 'Ana Costa',
          check_in: '2026-08-15',
          check_out: '2026-08-20', // VALID
        },
        confidence: 0.95,
        raw_response: '{}',
      }

      const result = validateExtraction(extraction)

      expect(result.valid).toBe(true)
      expect(result.issues.filter(i => i.severity === 'error')).toHaveLength(0)
    })
  })

  // RULE 2: Reduce confidence if total_value diverges >3× from historical ADR
  describe('Rule 2: Total Value Validation (ADR deviation)', () => {
    const historicalAdr = { adultNights: 150, avgRate: 100 } // €100/night avg

    it('should reduce confidence when value exceeds 3× ADR', () => {
      const extraction: ExtractionResult = {
        success: true,
        data: {
          guest_name: 'Guest A',
          check_in: '2026-08-15',
          check_out: '2026-08-20', // 5 nights
          total_value: 2000, // €2000 / 5 nights = €400/night (4× ADR) = TOO HIGH
        },
        confidence: 0.95,
        raw_response: '{}',
      }

      const result = validateExtraction(extraction, historicalAdr)

      expect(result.valid).toBe(true) // Not blocking, just warning
      expect(result.confidence).toBeLessThan(0.95) // Confidence reduced
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          field: 'total_value',
          severity: 'warning',
          message: expect.stringContaining('diverges'),
        })
      )
    })

    it('should reduce confidence when value is below 1/3 ADR', () => {
      const extraction: ExtractionResult = {
        success: true,
        data: {
          guest_name: 'Guest B',
          check_in: '2026-08-15',
          check_out: '2026-08-20', // 5 nights
          total_value: 100, // €100 / 5 nights = €20/night (0.2× ADR) = TOO LOW
        },
        confidence: 0.90,
        raw_response: '{}',
      }

      const result = validateExtraction(extraction, historicalAdr)

      expect(result.valid).toBe(true)
      expect(result.confidence).toBeLessThan(0.90)
      expect(result.issues.some(i => i.field === 'total_value')).toBe(true)
    })

    it('should not warn when value is within ±3× range', () => {
      const extraction: ExtractionResult = {
        success: true,
        data: {
          guest_name: 'Guest C',
          check_in: '2026-08-15',
          check_out: '2026-08-20', // 5 nights
          total_value: 500, // €500 / 5 nights = €100/night (1× ADR) = OK
        },
        confidence: 0.95,
        raw_response: '{}',
      }

      const result = validateExtraction(extraction, historicalAdr)

      expect(result.valid).toBe(true)
      expect(result.confidence).toBe(0.95) // No reduction
      expect(result.issues.filter(i => i.field === 'total_value')).toHaveLength(0)
    })
  })

  // RULE 3: Allow empty/generic name but mark incomplete
  describe('Rule 3: Guest Name Validation (allow empty/generic)', () => {
    it('should not block but reduce confidence for empty name', () => {
      const extraction: ExtractionResult = {
        success: true,
        data: {
          guest_name: '',
          check_in: '2026-08-15',
          check_out: '2026-08-20',
        },
        confidence: 0.95,
        raw_response: '{}',
      }

      const result = validateExtraction(extraction)

      expect(result.valid).toBe(true) // NOT BLOCKING
      expect(result.confidence).toBeLessThan(0.95) // But confidence reduced
      expect(result.issues).toContainEqual(
        expect.objectContaining({
          field: 'guest_name',
          severity: 'warning', // Warning, not error
          message: expect.stringContaining('empty or generic'),
        })
      )
    })

    it('should not block but reduce confidence for generic Portuguese name', () => {
      const extraction: ExtractionResult = {
        success: true,
        data: {
          guest_name: 'Hóspede',
          check_in: '2026-08-15',
          check_out: '2026-08-20',
        },
        confidence: 0.85,
        raw_response: '{}',
      }

      const result = validateExtraction(extraction)

      expect(result.valid).toBe(true)
      expect(result.confidence).toBeLessThan(0.85)
      expect(result.issues.some(i => i.field === 'guest_name')).toBe(true)
    })

    it('should accept valid guest name without penalty', () => {
      const extraction: ExtractionResult = {
        success: true,
        data: {
          guest_name: 'João Silva Pereira',
          check_in: '2026-08-15',
          check_out: '2026-08-20',
        },
        confidence: 0.95,
        raw_response: '{}',
      }

      const result = validateExtraction(extraction)

      expect(result.valid).toBe(true)
      expect(result.confidence).toBe(0.95) // No reduction
      expect(result.issues.filter(i => i.field === 'guest_name')).toHaveLength(0)
    })
  })

  // Property ADR calculation utility
  describe('Helper: calculatePropertyAdr', () => {
    it('should calculate average rate from bookings', () => {
      const bookings = [
        { checkIn: new Date('2026-08-01'), checkOut: new Date('2026-08-05'), totalValue: 400 }, // 4 nights @ €100/night
        { checkIn: new Date('2026-08-06'), checkOut: new Date('2026-08-13'), totalValue: 700 }, // 7 nights @ €100/night
      ]

      const adr = calculatePropertyAdr(bookings)

      expect(adr.adultNights).toBe(11)
      expect(adr.avgRate).toBe(100) // (400 + 700) / 11 ≈ 100
    })

    it('should return zero for empty bookings', () => {
      const adr = calculatePropertyAdr([])

      expect(adr.adultNights).toBe(0)
      expect(adr.avgRate).toBe(0)
    })
  })

  // Edge cases
  describe('Edge Cases', () => {
    it('should handle all three issues simultaneously', () => {
      const extraction: ExtractionResult = {
        success: true,
        data: {
          guest_name: 'Guest', // Generic
          check_in: '2026-08-20',
          check_out: '2026-08-15', // INVALID
          total_value: 3000, // Too high
        },
        confidence: 0.95,
        raw_response: '{}',
      }

      const historicalAdr = { adultNights: 100, avgRate: 100 }
      const result = validateExtraction(extraction, historicalAdr)

      expect(result.valid).toBe(false) // Blocked by date error
      expect(result.issues.filter(i => i.severity === 'error')).toContainEqual(
        expect.objectContaining({ field: 'dates' })
      )
    })
  })
})
