import {
  calculateRevenueForReservation,
  aggregateMonthlyRevenue,
  calculateProfit,
  calculateForecast
} from '@/lib/financial/revenue-calculator'

describe('Revenue Calculator', () => {
  // AC1: Forecast by currency
  describe('AC1: Forecast (by currency)', () => {
    it('should aggregate forecasts by currency', () => {
      const reservations = [
        {
          id: 'res-001',
          totalAmount: 1000,
          checkIn: '2026-05-01',
          checkOut: '2026-05-06',
          currency: 'EUR',
          status: 'confirmed' as const
        },
        {
          id: 'res-002',
          totalAmount: 2000,
          checkIn: '2026-05-10',
          checkOut: '2026-05-20',
          currency: 'EUR',
          status: 'confirmed' as const
        },
        {
          id: 'res-003',
          totalAmount: 1500,
          checkIn: '2026-05-05',
          checkOut: '2026-05-15',
          currency: 'BRL',
          status: 'confirmed' as const
        }
      ]

      const forecast = calculateForecast(reservations)

      expect(forecast.get('EUR')).toBe(3000)
      expect(forecast.get('BRL')).toBe(1500)
    })

    it('should exclude cancelled reservations from forecast', () => {
      const reservations = [
        {
          id: 'res-001',
          totalAmount: 1000,
          checkIn: '2026-05-01',
          checkOut: '2026-05-06',
          currency: 'EUR',
          status: 'confirmed' as const
        },
        {
          id: 'res-002',
          totalAmount: 2000,
          checkIn: '2026-05-10',
          checkOut: '2026-05-20',
          currency: 'EUR',
          status: 'cancelled' as const
        }
      ]

      const forecast = calculateForecast(reservations)

      expect(forecast.get('EUR')).toBe(1000)
    })
  })

  // AC2: Simple reservations (≤30 days)
  describe('AC2: Simple reservations (≤30 days)', () => {
    it('should allocate 100% revenue in check-in month', () => {
      const reservation = {
        id: 'res-001',
        totalAmount: 1000,
        checkIn: new Date('2026-05-01'),
        checkOut: new Date('2026-05-06'),
        currency: 'EUR',
        status: 'confirmed' as const
      }

      const result = calculateRevenueForReservation(reservation)

      expect(result.durationDays).toBe(5)
      expect(result.monthlyBreakdown).toHaveLength(1)
      expect(result.monthlyBreakdown[0]).toMatchObject({
        month: '2026-05',
        value: 1000,
        isActual: true
      })
    })

    it('should handle exactly 30-day reservations as simple case', () => {
      const reservation = {
        id: 'res-001',
        totalAmount: 3000,
        checkIn: new Date('2026-05-01'),
        checkOut: new Date('2026-05-31'),
        currency: 'EUR',
        status: 'confirmed' as const
      }

      const result = calculateRevenueForReservation(reservation)

      expect(result.durationDays).toBe(30)
      expect(result.monthlyBreakdown).toHaveLength(1)
      expect(result.monthlyBreakdown[0].value).toBe(3000)
    })
  })

  // AC3: Complex reservations (>30 days) with proportional distribution
  describe('AC3: Proportional distribution (>30 days)', () => {
    it('should distribute 94-night reservation correctly', () => {
      const reservation = {
        id: 'res-001',
        totalAmount: 17230,
        checkIn: new Date('2026-05-02'),
        checkOut: new Date('2026-08-04'),
        currency: 'BRL',
        status: 'confirmed' as const
      }

      const result = calculateRevenueForReservation(reservation)

      expect(result.durationDays).toBe(94)
      expect(result.monthlyBreakdown).toHaveLength(4)

      // Verify breakdown structure and total (allow for rounding differences)
      const months = result.monthlyBreakdown
      expect(months[0].month).toBe('2026-05')
      expect(months[0].value).toBeGreaterThan(5300)
      expect(months[0].value).toBeLessThan(5330)

      expect(months[1].month).toBe('2026-06')
      expect(months[1].value).toBeGreaterThan(5490)
      expect(months[1].value).toBeLessThan(5510)

      expect(months[2].month).toBe('2026-07')
      expect(months[2].value).toBeGreaterThan(5490)
      expect(months[2].value).toBeLessThan(5700)

      expect(months[3].month).toBe('2026-08')
      expect(months[3].value).toBeGreaterThan(500)
      expect(months[3].value).toBeLessThan(750)

      // Verify total approximates original (accounting for rounding)
      const total = months.reduce((sum, m) => sum + m.value, 0)
      expect(total).toBeCloseTo(17230, 0)
    })

    it('should handle leap year February correctly (>60 days)', () => {
      // 2024 is a leap year - 80 days to cross Feb 29
      const reservation = {
        id: 'res-001',
        totalAmount: 8000,
        checkIn: new Date('2024-02-01'),
        checkOut: new Date('2024-04-20'),
        currency: 'EUR',
        status: 'confirmed' as const
      }

      const result = calculateRevenueForReservation(reservation)

      expect(result.durationDays).toBe(79)
      expect(result.monthlyBreakdown.length).toBeGreaterThan(1)

      // Feb 2024 has 29 days (leap year)
      const febBreakdown = result.monthlyBreakdown.find(m => m.month === '2024-02')
      expect(febBreakdown).toBeDefined()
      expect(febBreakdown?.daysInMonth).toBe(29)
    })

    it('should distribute 64-night EUR reservation correctly', () => {
      const reservation = {
        id: 'res-002',
        totalAmount: 4500,
        checkIn: new Date('2026-06-10'),
        checkOut: new Date('2026-08-13'),
        currency: 'EUR',
        status: 'confirmed' as const
      }

      const result = calculateRevenueForReservation(reservation)

      expect(result.durationDays).toBe(64)
      expect(result.monthlyBreakdown.length).toBe(3)

      // Verify approximate breakdown (allow for rounding)
      const juneValue = result.monthlyBreakdown.find(m => m.month === '2026-06')?.value
      const julyValue = result.monthlyBreakdown.find(m => m.month === '2026-07')?.value
      const augValue = result.monthlyBreakdown.find(m => m.month === '2026-08')?.value

      expect(juneValue).toBeGreaterThan(1400)
      expect(juneValue).toBeLessThan(1500)

      expect(julyValue).toBeGreaterThan(2000)
      expect(julyValue).toBeLessThan(2200)

      expect(augValue).toBeGreaterThan(900)
      expect(augValue).toBeLessThan(1000)

      // Verify total
      const total = result.monthlyBreakdown.reduce((sum, m) => sum + m.value, 0)
      expect(total).toBeCloseTo(4500, 0)
    })
  })

  // AC4: Aggregation by month and currency
  describe('AC4: Monthly aggregation', () => {
    it('should aggregate multiple reservations by currency and month', () => {
      const reservations = [
        {
          id: 'res-001',
          totalAmount: 1000,
          checkIn: new Date('2026-05-01'),
          checkOut: new Date('2026-05-10'),
          currency: 'EUR',
          status: 'confirmed' as const
        },
        {
          id: 'res-002',
          totalAmount: 500,
          checkIn: new Date('2026-05-05'),
          checkOut: new Date('2026-05-15'),
          currency: 'EUR',
          status: 'confirmed' as const
        }
      ]

      const result = aggregateMonthlyRevenue(reservations)
      const eurData = result.get('EUR')

      expect(eurData).toBeDefined()
      expect(eurData![0].actual).toBeCloseTo(1500, 1)
    })
  })

  // AC5: Profit calculation
  describe('AC5: Profit calculation', () => {
    it('should calculate profit correctly', () => {
      const profit = calculateProfit(5000, 486.80)
      expect(profit).toBeCloseTo(4513.2, 2)
    })

    it('should handle zero expenses', () => {
      const profit = calculateProfit(1000, 0)
      expect(profit).toBe(1000)
    })

    it('should handle negative profit', () => {
      const profit = calculateProfit(1000, 1500)
      expect(profit).toBe(-500)
    })
  })

  // AC6: Rounding consistency
  describe('AC6: Rounding consistency', () => {
    it('should round all values to 2 decimal places', () => {
      const reservation = {
        id: 'res-001',
        totalAmount: 1000.456,
        checkIn: new Date('2026-05-01'),
        checkOut: new Date('2026-07-10'),
        currency: 'USD',
        status: 'confirmed' as const
      }

      const result = calculateRevenueForReservation(reservation)

      // Verify all values have max 2 decimal places
      for (const month of result.monthlyBreakdown) {
        const decimalPlaces = (month.value.toString().split('.')[1] || '').length
        expect(decimalPlaces).toBeLessThanOrEqual(2)
      }
    })
  })

  // Real vs Predicted based on Checkout rules
  describe('Real vs Predicted (Checkout-based classification)', () => {
    it('should classify < 30 days as Predicted in checkout month', () => {
      // Reserva 15/05-10/06 (26 dias)
      const reservation = {
        id: 'res-001',
        totalAmount: 1000,
        checkIn: '2026-05-15',
        checkOut: '2026-06-10',
        currency: 'BRL',
        status: 'confirmed' as const
      }

      const result = calculateRevenueForReservation(reservation)

      expect(result.durationDays).toBe(26)
      expect(result.monthlyBreakdown).toHaveLength(1)
      expect(result.monthlyBreakdown[0]).toMatchObject({
        month: '2026-06', // Checkout month
        value: 1000,
        isActual: true // Real in checkout month
      })
    })

    it('should classify 30-60 days as Predicted in checkout month', () => {
      // Reserva 20/05-28/06 (39 dias)
      const reservation = {
        id: 'res-001',
        totalAmount: 2000,
        checkIn: '2026-05-20',
        checkOut: '2026-06-28',
        currency: 'EUR',
        status: 'confirmed' as const
      }

      const result = calculateRevenueForReservation(reservation)

      expect(result.durationDays).toBe(39)
      expect(result.monthlyBreakdown).toHaveLength(1)
      expect(result.monthlyBreakdown[0]).toMatchObject({
        month: '2026-06', // Checkout month
        value: 2000,
        isActual: true // Real in checkout month
      })
    })

    it('should classify > 60 days with proportional distribution', () => {
      // Reserva 02/05-04/08 (94 dias - > 60)
      // Real em Maio (check-in month), Previsto em Junho/Julho/Agosto
      const reservation = {
        id: 'res-001',
        totalAmount: 17230,
        checkIn: '2026-05-02',
        checkOut: '2026-08-04',
        currency: 'BRL',
        status: 'confirmed' as const
      }

      const result = calculateRevenueForReservation(reservation)

      expect(result.durationDays).toBe(94)
      expect(result.monthlyBreakdown.length).toBe(4)

      // May (check-in month) should be Real
      const mayBreakdown = result.monthlyBreakdown.find(m => m.month === '2026-05')
      expect(mayBreakdown?.isActual).toBe(true) // Check-in month - Real
      // Allow rounding variance (≈ 0.04%)
      expect(mayBreakdown?.value).toBeGreaterThan(5310)
      expect(mayBreakdown?.value).toBeLessThan(5325)

      // June, July, August should be Previsto (Predicted)
      const juneBreakdown = result.monthlyBreakdown.find(m => m.month === '2026-06')
      const julyBreakdown = result.monthlyBreakdown.find(m => m.month === '2026-07')
      const augBreakdown = result.monthlyBreakdown.find(m => m.month === '2026-08')

      expect(juneBreakdown?.isActual).toBe(false) // Previsto
      expect(julyBreakdown?.isActual).toBe(false) // Previsto
      expect(augBreakdown?.isActual).toBe(false) // Previsto

      // Total should match
      const total = result.monthlyBreakdown.reduce((sum, m) => sum + m.value, 0)
      expect(total).toBeCloseTo(17230, 0)
    })

    it('should consider leap year (Feb 29) in > 60 days calculation', () => {
      // 2024 is leap year - crossing Feb 29 (69 days > 60)
      const reservation = {
        id: 'res-001',
        totalAmount: 6900,
        checkIn: '2024-02-01',
        checkOut: '2024-04-10',
        currency: 'USD',
        status: 'confirmed' as const
      }

      const result = calculateRevenueForReservation(reservation)

      // Should span Feb (31 days - leap year), Mar (31 days), Apr (7 days)
      const febBreakdown = result.monthlyBreakdown.find(m => m.month === '2024-02')
      const marBreakdown = result.monthlyBreakdown.find(m => m.month === '2024-03')
      const aprilBreakdown = result.monthlyBreakdown.find(m => m.month === '2024-04')

      expect(febBreakdown?.daysInMonth).toBe(29) // Leap year Feb
      expect(marBreakdown?.daysInMonth).toBe(31) // March has 31 days

      // February (check-in month) should be Real, others Previsto
      expect(febBreakdown?.isActual).toBe(true) // Check-in month - Real
      expect(marBreakdown?.isActual).toBe(false) // Previsto
      expect(aprilBreakdown?.isActual).toBe(false) // Previsto
    })
  })

  // Timezone handling: UTC for financial calculations
  describe('Timezone Handling (UTC)', () => {
    it('should produce identical results regardless of input date format', () => {
      // Same reservation, different input formats (36 days, 30-60 category)
      const isoString = {
        id: 'res-001',
        totalAmount: 5000,
        checkIn: '2026-05-15',
        checkOut: '2026-06-20',
        currency: 'EUR',
        status: 'confirmed' as const
      }

      const dateObject = {
        id: 'res-001',
        totalAmount: 5000,
        checkIn: new Date('2026-05-15'),
        checkOut: new Date('2026-06-20'),
        currency: 'EUR',
        status: 'confirmed' as const
      }

      const result1 = calculateRevenueForReservation(isoString)
      const result2 = calculateRevenueForReservation(dateObject)

      // Results should be identical
      expect(result1.durationDays).toBe(result2.durationDays)
      expect(result1.durationDays).toBe(36) // 30-60 days category
      expect(result1.monthlyBreakdown).toEqual(result2.monthlyBreakdown)
      expect(result1.monthlyBreakdown[0].month).toBe('2026-06') // Checkout month
    })

    it('should handle leap year correctly (crossing Feb 29)', () => {
      // 2024 is leap year, test crossing Feb 29 (79 days = >60 days category)
      const reservation = {
        id: 'res-001',
        totalAmount: 7900,
        checkIn: '2024-02-01',
        checkOut: '2024-04-20',
        currency: 'EUR',
        status: 'confirmed' as const
      }

      const result = calculateRevenueForReservation(reservation)

      // Should have breakdown for Feb, Mar, Apr (>60 days = proportional)
      expect(result.monthlyBreakdown.length).toBeGreaterThanOrEqual(2)

      const febBreakdown = result.monthlyBreakdown.find(m => m.month === '2024-02')
      const marBreakdown = result.monthlyBreakdown.find(m => m.month === '2024-03')

      expect(febBreakdown).toBeDefined()
      expect(marBreakdown).toBeDefined()

      // Feb 2024 should have 29 days (leap year)
      expect(febBreakdown?.daysInMonth).toBe(29)
      expect(marBreakdown?.daysInMonth).toBe(31)

      // Total should match
      const total = result.monthlyBreakdown.reduce((sum, m) => sum + m.value, 0)
      expect(total).toBeCloseTo(7900, 0)
    })

    it('should handle non-leap year correctly (Feb 28 in > 60 days)', () => {
      // 2025 is not leap year - 80 days
      const reservation = {
        id: 'res-001',
        totalAmount: 8000,
        checkIn: '2025-02-01',
        checkOut: '2025-04-21',
        currency: 'EUR',
        status: 'confirmed' as const
      }

      const result = calculateRevenueForReservation(reservation)

      const febBreakdown = result.monthlyBreakdown.find(m => m.month === '2025-02')

      // Feb 2025 should have 28 days (non-leap year)
      expect(febBreakdown?.daysInMonth).toBe(28)

      // Total should match
      const total = result.monthlyBreakdown.reduce((sum, m) => sum + m.value, 0)
      expect(total).toBeCloseTo(8000, 0)
    })

    it('should calculate month boundaries correctly in UTC', () => {
      // Reservation that spans multiple months
      const reservation = {
        id: 'res-001',
        totalAmount: 9000,
        checkIn: '2026-04-20',
        checkOut: '2026-08-10',
        currency: 'BRL',
        status: 'confirmed' as const
      }

      const result = calculateRevenueForReservation(reservation)

      // Should span April, May, June, July, August
      const months = result.monthlyBreakdown.map(m => m.month)
      expect(months).toContain('2026-04')
      expect(months).toContain('2026-05')
      expect(months).toContain('2026-06')
      expect(months).toContain('2026-07')
      expect(months).toContain('2026-08')

      // Verify days in each month (accounting for month lengths)
      const mayBreakdown = result.monthlyBreakdown.find(m => m.month === '2026-05')
      expect(mayBreakdown!.daysInMonth).toBe(31) // May has 31 days

      const juneBreakdown = result.monthlyBreakdown.find(m => m.month === '2026-06')
      expect(juneBreakdown!.daysInMonth).toBe(30) // June has 30 days
    })
  })
})
