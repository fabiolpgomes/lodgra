import { EmailExtractionSchema } from '../extraction.schema'

describe('Email extraction schema', () => {
  it('validates required fields', () => {
    const validData = {
      guest_name: 'João Silva',
      check_in: '2026-08-20',
      check_out: '2026-08-25',
    }

    const result = EmailExtractionSchema.safeParse(validData)
    expect(result.success).toBe(true)
  })

  it('rejects missing required fields', () => {
    const invalidData = {
      guest_name: 'João Silva',
      check_in: '2026-08-20',
      // missing check_out
    }

    const result = EmailExtractionSchema.safeParse(invalidData)
    expect(result.success).toBe(false)
  })

  it('validates date format', () => {
    const validDates = {
      guest_name: 'Test',
      check_in: '2026-12-25',
      check_out: '2026-12-31',
    }

    const result = EmailExtractionSchema.safeParse(validDates)
    expect(result.success).toBe(true)
  })

  it('rejects invalid date format', () => {
    const invalidDates = {
      guest_name: 'Test',
      check_in: '25/12/2026',
      check_out: '31/12/2026',
    }

    const result = EmailExtractionSchema.safeParse(invalidDates)
    expect(result.success).toBe(false)
  })

  it('accepts optional fields', () => {
    const withOptional = {
      guest_name: 'Test',
      check_in: '2026-12-25',
      check_out: '2026-12-31',
      number_of_guests: 2,
      total_value: 1000,
      currency: 'EUR',
    }

    const result = EmailExtractionSchema.safeParse(withOptional)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.number_of_guests).toBe(2)
      expect(result.data.total_value).toBe(1000)
    }
  })

  describe('Phone field (new)', () => {
    it('accepts phone as optional field', () => {
      const withPhone = {
        guest_name: 'João Silva',
        check_in: '2026-08-20',
        check_out: '2026-08-25',
        phone: '+351 912345678',
      }

      const result = EmailExtractionSchema.safeParse(withPhone)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.phone).toBe('+351 912345678')
      }
    })

    it('accepts phone with different formats', () => {
      const formats = [
        '+351 912345678',
        '+1 2025551234',
        '912345678',
        '+351912345678',
        '(201) 555-1234',
      ]

      formats.forEach((phone) => {
        const data = {
          guest_name: 'Test',
          check_in: '2026-08-20',
          check_out: '2026-08-25',
          phone,
        }
        const result = EmailExtractionSchema.safeParse(data)
        expect(result.success).toBe(true)
      })
    })

    it('allows missing phone (optional)', () => {
      const noPhone = {
        guest_name: 'Test',
        check_in: '2026-08-20',
        check_out: '2026-08-25',
      }

      const result = EmailExtractionSchema.safeParse(noPhone)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.phone).toBeUndefined()
      }
    })
  })
})
