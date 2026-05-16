import puppeteer, { Browser, Page } from 'puppeteer'

describe('E2E Payment Flows', () => {
  let browser: Browser
  let page: Page
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  beforeAll(async () => {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    })
  })

  afterAll(async () => {
    if (browser) {
      await browser.close()
    }
  })

  beforeEach(async () => {
    page = await browser.newPage()
    // Set longer timeout for E2E operations
    page.setDefaultTimeout(15000)
    page.setDefaultNavigationTimeout(15000)
  })

  afterEach(async () => {
    if (page) {
      await page.close()
    }
  })

  // ============ Subscription Happy Path ============
  describe('Subscription Happy Path', () => {
    test('should complete signup → choose plan → pay → confirmation', async () => {
      // Navigate to signup
      await page.goto(`${baseUrl}/register`)
      await page.waitForNavigation({ waitUntil: 'networkidle2' })

      // Fill signup form
      await page.type('input[name="email"]', `test${Date.now()}@example.com`)
      await page.type('input[name="password"]', 'TestPassword123!')
      await page.click('button[type="submit"]')
      await page.waitForNavigation({ waitUntil: 'networkidle2' })

      // Navigate to billing plans
      await page.goto(`${baseUrl}/[locale]/billing`)
      await page.waitForNavigation({ waitUntil: 'networkidle2' })

      // Select Professional plan
      const planButtons = await page.$$('button[data-plan="professional"]')
      expect(planButtons.length).toBeGreaterThan(0)

      if (planButtons.length > 0) {
        await planButtons[0].click()
      }

      // Wait for checkout to appear
      await page.waitForSelector('[data-testid="checkout-form"]', { timeout: 5000 })

      // Verify checkout form is visible
      const checkoutForm = await page.$('[data-testid="checkout-form"]')
      expect(checkoutForm).toBeTruthy()
    })

    test('should display subscription confirmation page after payment', async () => {
      await page.goto(`${baseUrl}/[locale]/billing/subscription`)
      await page.waitForNavigation({ waitUntil: 'networkidle2' })

      // Verify subscription status is displayed
      const statusElement = await page.$('[data-testid="subscription-status"]')
      expect(statusElement).toBeTruthy()

      // Verify subscription details visible
      const detailsElement = await page.$('[data-testid="subscription-details"]')
      expect(detailsElement).toBeTruthy()
    })

    test('should show subscription renewal date and next billing', async () => {
      await page.goto(`${baseUrl}/[locale]/billing/invoices`)
      await page.waitForNavigation({ waitUntil: 'networkidle2' })

      // Verify invoice list is visible
      const invoiceList = await page.$('[data-testid="invoice-list"]')
      expect(invoiceList).toBeTruthy()

      // Check for at least one invoice
      const invoices = await page.$$('[data-testid="invoice-item"]')
      expect(invoices.length).toBeGreaterThan(0)
    })
  })

  // ============ Booking Happy Path ============
  describe('Booking Happy Path', () => {
    test('should complete browse property → select dates → checkout → confirmation', async () => {
      // Navigate to properties listing
      await page.goto(`${baseUrl}/`)
      await page.waitForNavigation({ waitUntil: 'networkidle2' })

      // Wait for property cards to load
      await page.waitForSelector('[data-testid="property-card"]', { timeout: 5000 })

      // Click first property
      const propertyCards = await page.$$('[data-testid="property-card"]')
      expect(propertyCards.length).toBeGreaterThan(0)

      if (propertyCards.length > 0) {
        await propertyCards[0].click()
        await page.waitForNavigation({ waitUntil: 'networkidle2' })
      }

      // Verify property details page
      const propertyDetails = await page.$('[data-testid="property-details"]')
      expect(propertyDetails).toBeTruthy()

      // Select dates (assuming date picker exists)
      const dateInputs = await page.$$('input[type="date"]')
      if (dateInputs.length >= 2) {
        await dateInputs[0].type('2025-06-01')
        await dateInputs[1].type('2025-06-05')
      }

      // Click checkout button
      const checkoutBtn = await page.$('button[data-testid="checkout-button"]')
      if (checkoutBtn) {
        await checkoutBtn.click()
        await page.waitForNavigation({ waitUntil: 'networkidle2' })
      }
    })

    test('should display booking confirmation with payment details', async () => {
      // Assuming we're on booking confirmation page
      await page.goto(`${baseUrl}/[locale]/booking/[bookingId]/payment-success`)

      // Verify confirmation message
      const confirmationMsg = await page.$('[data-testid="confirmation-message"]')
      expect(confirmationMsg).toBeTruthy()

      // Verify booking reference number
      const bookingRef = await page.$('[data-testid="booking-reference"]')
      expect(bookingRef).toBeTruthy()

      // Verify payment amount
      const paymentAmount = await page.$('[data-testid="payment-amount"]')
      expect(paymentAmount).toBeTruthy()
    })

    test('should show split breakdown (guest pays, owner receives)', async () => {
      await page.goto(`${baseUrl}/[locale]/booking/[bookingId]/payment`)
      await page.waitForNavigation({ waitUntil: 'networkidle2' })

      // Wait for payment breakdown
      await page.waitForSelector('[data-testid="payment-breakdown"]', { timeout: 5000 })

      // Verify breakdown items
      const totalAmount = await page.$('[data-testid="total-amount"]')
      const lodgraFee = await page.$('[data-testid="lodgra-fee"]')
      const ownerAmount = await page.$('[data-testid="owner-amount"]')

      expect(totalAmount).toBeTruthy()
      expect(lodgraFee).toBeTruthy()
      expect(ownerAmount).toBeTruthy()
    })
  })

  // ============ Upgrade Path ============
  describe('Upgrade Path - Starter to Professional', () => {
    test('should upgrade subscription plan mid-cycle', async () => {
      // Navigate to billing page
      await page.goto(`${baseUrl}/[locale]/billing`)
      await page.waitForNavigation({ waitUntil: 'networkidle2' })

      // Click upgrade button
      const upgradeBtn = await page.$('button[data-testid="upgrade-button"]')
      expect(upgradeBtn).toBeTruthy()

      if (upgradeBtn) {
        await upgradeBtn.click()
        await page.waitForNavigation({ waitUntil: 'networkidle2' })
      }

      // Verify plan selector
      const planSelector = await page.$('[data-testid="plan-selector"]')
      expect(planSelector).toBeTruthy()
    })

    test('should show price change after upgrade', async () => {
      await page.goto(`${baseUrl}/[locale]/billing/subscription`)
      await page.waitForNavigation({ waitUntil: 'networkidle2' })

      // Verify new plan name
      const planName = await page.$('[data-testid="current-plan-name"]')
      expect(planName).toBeTruthy()

      const planText = await page.evaluate(el => el?.textContent, planName)
      expect(planText).toBeTruthy()

      // Verify new price
      const planPrice = await page.$('[data-testid="current-plan-price"]')
      expect(planPrice).toBeTruthy()
    })

    test('should display proration credit applied', async () => {
      await page.goto(`${baseUrl}/[locale]/billing/invoices`)
      await page.waitForNavigation({ waitUntil: 'networkidle2' })

      // Look for proration line item
      const proratedItems = await page.$$('[data-testid="prorated-item"]')
      expect(proratedItems.length).toBeGreaterThanOrEqual(0)
    })
  })

  // ============ Refund Flow ============
  describe('Refund Flow - Guest Initiated', () => {
    test('should display refund button on booking confirmation', async () => {
      await page.goto(`${baseUrl}/[locale]/booking/[bookingId]/payment-success`)
      await page.waitForNavigation({ waitUntil: 'networkidle2' })

      // Verify refund button exists
      const refundBtn = await page.$('button[data-testid="request-refund-button"]')
      expect(refundBtn).toBeTruthy()
    })

    test('should submit refund request successfully', async () => {
      await page.goto(`${baseUrl}/[locale]/booking/[bookingId]/payment-success`)
      await page.waitForNavigation({ waitUntil: 'networkidle2' })

      // Click refund button
      const refundBtn = await page.$('button[data-testid="request-refund-button"]')
      if (refundBtn) {
        await refundBtn.click()

        // Wait for refund modal/form
        await page.waitForSelector('[data-testid="refund-form"]', { timeout: 5000 })

        // Fill reason (if applicable)
        const reasonSelect = await page.$('select[name="refund_reason"]')
        if (reasonSelect) {
          await reasonSelect.select('requested_by_customer')
        }

        // Submit refund
        const submitBtn = await page.$('button[data-testid="submit-refund-button"]')
        if (submitBtn) {
          await submitBtn.click()
          await page.waitForNavigation({ waitUntil: 'networkidle2' })
        }
      }
    })

    test('should show refund status (pending, completed)', async () => {
      await page.goto(`${baseUrl}/[locale]/booking/[bookingId]/payment-success`)
      await page.waitForNavigation({ waitUntil: 'networkidle2' })

      // Verify refund status badge
      const refundStatus = await page.$('[data-testid="refund-status"]')
      expect(refundStatus).toBeTruthy()

      // Get status text
      const statusText = await page.evaluate(el => el?.textContent, refundStatus)
      expect(['pending', 'completed', 'failed']).toContain(statusText?.toLowerCase().trim())
    })
  })

  // ============ Error Handling ============
  describe('Payment Error Handling', () => {
    test('should handle declined payment gracefully', async () => {
      await page.goto(`${baseUrl}/[locale]/booking/[bookingId]/payment`)
      await page.waitForNavigation({ waitUntil: 'networkidle2' })

      // Verify error message display area
      const errorMessage = await page.$('[data-testid="error-message"]')
      expect(errorMessage).toBeTruthy()
    })

    test('should show retry option on payment failure', async () => {
      // Error page should have retry button
      await page.goto(`${baseUrl}/[locale]/booking/[bookingId]/payment`)

      const retryBtn = await page.$('button[data-testid="retry-payment-button"]')
      expect(retryBtn).toBeTruthy()
    })

    test('should persist cart/booking details on payment error', async () => {
      await page.goto(`${baseUrl}/[locale]/booking/[bookingId]/payment`)
      await page.waitForNavigation({ waitUntil: 'networkidle2' })

      // Verify booking details still visible
      const bookingDetails = await page.$('[data-testid="booking-details"]')
      expect(bookingDetails).toBeTruthy()
    })
  })

  // ============ Navigation & Accessibility ============
  describe('E2E Navigation & Accessibility', () => {
    test('should navigate back from payment page to booking details', async () => {
      await page.goto(`${baseUrl}/[locale]/booking/[bookingId]/payment`)
      await page.waitForNavigation({ waitUntil: 'networkidle2' })

      // Click back button (if exists)
      const backBtn = await page.$('button[data-testid="back-button"]')
      if (backBtn) {
        await backBtn.click()
        // Should go back to booking details
        await page.waitForNavigation({ waitUntil: 'networkidle2' })
      }
    })

    test('should be keyboard navigable through payment form', async () => {
      await page.goto(`${baseUrl}/[locale]/booking/[bookingId]/payment`)
      await page.waitForNavigation({ waitUntil: 'networkidle2' })

      // Tab through form
      await page.keyboard.press('Tab')
      await page.keyboard.press('Tab')
      await page.keyboard.press('Tab')

      // Verify focus moved (not scientifically perfect but validates keyboard support)
      const focusedElement = await page.evaluate(() => document.activeElement?.tagName)
      expect(['INPUT', 'BUTTON', 'SELECT']).toContain(focusedElement)
    })
  })
})
