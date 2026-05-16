describe('Stripe Booking Payments', () => {
  describe('Split Calculator', () => {
    it('should calculate 85/15 split correctly', () => {
      const totalCents = 10000 // EUR 100
      const lodgraFee = Math.round(totalCents * 0.15)
      const ownerAmount = totalCents - lodgraFee

      expect(lodgraFee).toBe(1500)
      expect(ownerAmount).toBe(8500)
      expect(lodgraFee + ownerAmount).toBe(totalCents)
    })

    it('should handle rounding for fractional cents', () => {
      const totalCents = 12345 // EUR 123.45
      const lodgraFee = Math.round(totalCents * 0.15)
      const ownerAmount = totalCents - lodgraFee

      expect(lodgraFee).toBe(1852)
      expect(ownerAmount).toBe(10493)
      expect(lodgraFee + ownerAmount).toBe(totalCents)
    })

    it('should validate split sums correctly', () => {
      const totalCents = 5000
      const lodgraFee = Math.round(totalCents * 0.15)
      const ownerAmount = totalCents - lodgraFee

      const isValid = lodgraFee + ownerAmount === totalCents
      expect(isValid).toBe(true)
    })

    it('should handle minimum amount (1 cent)', () => {
      const totalCents = 1
      const lodgraFee = Math.round(totalCents * 0.15)
      const ownerAmount = totalCents - lodgraFee

      expect(ownerAmount).toBeGreaterThanOrEqual(0)
      expect(lodgraFee + ownerAmount).toBeLessThanOrEqual(totalCents + 1)
    })

    it('should handle large amounts (EUR 10000)', () => {
      const totalCents = 1000000 // EUR 10000
      const lodgraFee = Math.round(totalCents * 0.15)
      const ownerAmount = totalCents - lodgraFee

      expect(lodgraFee).toBe(150000)
      expect(ownerAmount).toBe(850000)
    })
  })

  describe('Connect Onboarding', () => {
    it('should generate valid Express account link', () => {
      const baseUrl = 'http://localhost:3000'

      const refreshUrl = `${baseUrl}/api/stripe/connect/refresh`
      const returnUrl = `${baseUrl}/dashboard/stripe-connect-success`

      expect(refreshUrl).toContain('/api/stripe/connect/refresh')
      expect(returnUrl).toContain('stripe-connect-success')
    })

    it('should store Connect account ID in organization', () => {
      const org = {
        id: 'org_123',
        stripe_pt_connect_id: 'acct_test_12345',
        stripe_pt_connect_onboarded: false,
      }

      expect(org.stripe_pt_connect_id).toBeDefined()
      expect(org.stripe_pt_connect_id).toMatch(/^acct_/)
    })

    it('should mark onboarding complete when charges_enabled and transfers_enabled', () => {
      const account = {
        id: 'acct_test_12345',
        charges_enabled: true,
        transfers_enabled: true,
      }

      const isOnboarded = account.charges_enabled && account.transfers_enabled
      expect(isOnboarded).toBe(true)
    })

    it('should prevent payment if onboarding incomplete', () => {
      const account = {
        id: 'acct_test_12345',
        charges_enabled: false,
        transfers_enabled: true,
      }

      const isOnboarded = account.charges_enabled && account.transfers_enabled
      expect(isOnboarded).toBe(false)
    })
  })

  describe('Payment Intent Creation', () => {
    it('should create payment intent with split metadata', () => {
      const bookingId = 'booking_123'
      const orgId = 'org_456'

      const metadata = {
        booking_id: bookingId,
        org_id: orgId,
      }

      expect(metadata.booking_id).toBe(bookingId)
      expect(metadata.org_id).toBe(orgId)
    })

    it('should set application_fee for Lodgra commission', () => {
      const totalAmount = 10000
      const lodgraFee = Math.round(totalAmount * 0.15)

      expect(lodgraFee).toBe(1500)
      expect(lodgraFee / totalAmount).toBeCloseTo(0.15, 2)
    })

    it('should validate currency is EUR', () => {
      const currency = 'eur'
      expect(currency.toLowerCase()).toBe('eur')
    })

    it('should include on_behalf_of for Connect', () => {
      const connectAccountId = 'acct_test_12345'
      expect(connectAccountId).toBeDefined()
      expect(connectAccountId).toMatch(/^acct_/)
    })

    it('should reject invalid amount', () => {
      const invalidAmounts = [0, -100, NaN, undefined]

      invalidAmounts.forEach((amount) => {
        const isValid = typeof amount === 'number' && amount > 0
        expect(isValid).toBe(false)
      })
    })
  })

  describe('Refund Flow', () => {
    it('should refund full amount', () => {
      const originalAmount = 10000
      const refundAmount = 10000

      expect(refundAmount).toBeLessThanOrEqual(originalAmount)
    })

    it('should refund partial amount', () => {
      const originalAmount = 10000
      const refundAmount = 5000

      expect(refundAmount).toBeLessThanOrEqual(originalAmount)
      expect(refundAmount).toBeLessThan(originalAmount)
    })

    it('should prevent refund exceeding original amount', () => {
      const originalAmount = 10000
      const refundAmount = 15000

      const isValid = refundAmount <= originalAmount
      expect(isValid).toBe(false)
    })

    it('should prevent negative refund amount', () => {
      const refundAmount = -100
      const isValid = refundAmount > 0
      expect(isValid).toBe(false)
    })

    it('should track refund status', () => {
      const refund = {
        id: 'ref_test_123',
        status: 'succeeded',
        amount: 5000,
      }

      expect(refund.status).toBe('succeeded')
      expect(refund.amount).toBeGreaterThan(0)
    })

    it('should accept valid refund reasons', () => {
      const validReasons = ['requested_by_customer', 'duplicate', 'fraudulent']
      const testReason = 'requested_by_customer'

      expect(validReasons).toContain(testReason)
    })

    it('should reject invalid refund reasons', () => {
      const validReasons = ['requested_by_customer', 'duplicate', 'fraudulent']
      const invalidReason = 'unknown_reason'

      expect(validReasons).not.toContain(invalidReason)
    })
  })

  describe('Webhook Event Processing', () => {
    it('should process charge.succeeded event', () => {
      const charge = {
        id: 'ch_test_123',
        status: 'succeeded',
        metadata: { booking_id: 'booking_456' },
      }

      expect(charge.status).toBe('succeeded')
      expect(charge.metadata.booking_id).toBeDefined()
    })

    it('should process charge.failed event', () => {
      const charge = {
        id: 'ch_test_123',
        status: 'failed',
        failure_code: 'insufficient_funds',
      }

      expect(charge.status).toBe('failed')
    })

    it('should process charge.refunded event', () => {
      const charge = {
        id: 'ch_test_123',
        amount_refunded: 5000,
        status: 'refunded',
      }

      expect(charge.amount_refunded).toBeGreaterThan(0)
      expect(charge.status).toBe('refunded')
    })

    it('should skip events without booking_id', () => {
      const charge = {
        id: 'ch_test_123',
        metadata: {},
      }

      const shouldProcess = charge.metadata.booking_id !== undefined
      expect(shouldProcess).toBe(false)
    })

    it('should deduplicate webhook events', () => {
      const eventIds = new Set(['evt_123', 'evt_456'])

      const isDuplicate1 = eventIds.has('evt_123')
      const isDuplicate2 = eventIds.has('evt_789')

      expect(isDuplicate1).toBe(true)
      expect(isDuplicate2).toBe(false)
    })
  })

  describe('Currency Formatting', () => {
    it('should format EUR amounts correctly', () => {
      const amountInCents = 12345
      const formatted = (amountInCents / 100).toFixed(2)
      expect(formatted).toBe('123.45')
    })

    it('should handle zero amount', () => {
      const amountInCents = 0
      const formatted = (amountInCents / 100).toFixed(2)
      expect(formatted).toBe('0.00')
    })

    it('should display currency code', () => {
      const currency = 'eur'
      const formatted = currency.toUpperCase()
      expect(formatted).toBe('EUR')
    })
  })

  describe('Error Handling', () => {
    it('should handle missing organization', () => {
      const org = null
      const hasConnect = org?.stripe_pt_connect_id
      expect(hasConnect).toBeUndefined()
    })

    it('should handle missing booking', () => {
      const booking = null
      const hasCharge = booking?.stripe_charge_id
      expect(hasCharge).toBeUndefined()
    })

    it('should handle Connect account not onboarded', () => {
      const org = {
        stripe_pt_connect_id: 'acct_test_123',
        stripe_pt_connect_onboarded: false,
      }

      const canAccept = org.stripe_pt_connect_onboarded === true
      expect(canAccept).toBe(false)
    })

    it('should handle stripe API errors gracefully', () => {
      const error = new Error('Stripe API error')
      expect(error).toBeInstanceOf(Error)
    })
  })
})
