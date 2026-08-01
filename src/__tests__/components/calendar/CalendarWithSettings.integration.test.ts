/**
 * E2E Integration Tests: Full Calendar + Settings + Pricing Flow
 * Tests Epic 43 complete reservation cycle
 */

describe('Calendar + Settings Integration E2E', () => {
  beforeEach(() => {
    // Setup: Navigate to calendar page
    cy.visit('/pt/calendar/test-property-id')
    cy.wait('@loadProperty')
    cy.wait('@loadReservations')
  })

  describe('Day Click → Price Modal → Save Flow', () => {
    it('should open price modal on single day click', () => {
      // Arrange: Get first empty day
      cy.get('[data-testid="calendar-day"]:not(.has-reservation)')
        .first()
        .click()

      // Act & Assert: Modal should appear
      cy.get('[data-testid="day-click-modal"]').should('be.visible')
      cy.get('[data-testid="modal-title"]').should(
        'contain',
        'Alterar Preço ou Bloquear Datas'
      )
    })

    it('should save price for single day', () => {
      // Arrange: Open modal and select price action
      cy.get('[data-testid="calendar-day"]:not(.has-reservation)').first().click()
      cy.get('[data-testid="modal-action-price"]').click()

      // Act: Enter price
      cy.get('[data-testid="price-input"]').type('120.50')
      cy.get('[data-testid="modal-save-button"]').click()

      // Assert: API call made
      cy.intercept('POST', '**/pricing/bulk-update').as('savePrice')
      cy.wait('@savePrice').then((interception) => {
        expect(interception.request.body.price).to.equal(120.5)
        expect(interception.response?.statusCode).to.equal(200)
      })

      // Assert: Modal closes
      cy.get('[data-testid="day-click-modal"]').should('not.exist')
    })

    it('should validate price input', () => {
      cy.get('[data-testid="calendar-day"]:not(.has-reservation)').first().click()
      cy.get('[data-testid="modal-action-price"]').click()

      // Try invalid price
      cy.get('[data-testid="price-input"]').type('0')
      cy.get('[data-testid="modal-save-button"]').should('be.disabled')

      // Enter valid price
      cy.get('[data-testid="price-input"]').clear().type('100')
      cy.get('[data-testid="modal-save-button"]').should('not.be.disabled')
    })
  })

  describe('Period Selection → Bulk Price Update', () => {
    it('should select multiple consecutive days', () => {
      // Arrange: Click first day
      cy.get('[data-testid="calendar-day"]:not(.has-reservation)').first().click()

      // Act: Hold shift and click last day (period selection)
      cy.get('[data-testid="calendar-day"]:not(.has-reservation)')
        .eq(6)
        .click({ shiftKey: true })

      // Assert: Days highlighted
      cy.get('[data-testid="calendar-day"].selected').should('have.length.greaterThan', 1)
    })

    it('should update price for period', () => {
      const price = 150

      // Select period
      cy.get('[data-testid="calendar-day"]:not(.has-reservation)').first().click()
      cy.get('[data-testid="calendar-day"]:not(.has-reservation)')
        .eq(6)
        .click({ shiftKey: true })

      // Open modal and save
      cy.get('[data-testid="calendar-day"].selected').first().rightClick()
      cy.get('[data-testid="day-click-modal"]').should('be.visible')
      cy.get('[data-testid="modal-action-price"]').click()
      cy.get('[data-testid="price-input"]').type(price.toString())
      cy.get('[data-testid="modal-save-button"]').click()

      // Assert: API called with date range
      cy.intercept('POST', '**/pricing/bulk-update').as('savePeriodPrice')
      cy.wait('@savePeriodPrice').then((interception) => {
        expect(interception.request.body.startDate).to.exist
        expect(interception.request.body.endDate).to.exist
        expect(interception.request.body.price).to.equal(price)
      })
    })
  })

  describe('Block Dates Flow', () => {
    it('should block single day', () => {
      // Arrange: Open modal
      cy.get('[data-testid="calendar-day"]:not(.has-reservation)').first().click()

      // Act: Select block action
      cy.get('[data-testid="modal-action-block"]').click()
      cy.get('[data-testid="modal-save-button"]').click()

      // Assert: API called
      cy.intercept('POST', '**/calendar/block-dates').as('blockDates')
      cy.wait('@blockDates').then((interception) => {
        expect(interception.response?.statusCode).to.equal(200)
      })

      // Assert: Day marked as blocked
      cy.get('[data-testid="calendar-day"].blocked').should('exist')
    })

    it('should unblock date on second click', () => {
      // First click: block date
      cy.get('[data-testid="calendar-day"]:not(.has-reservation)').first().click()
      cy.get('[data-testid="modal-action-block"]').click()
      cy.get('[data-testid="modal-save-button"]').click()

      // Wait for API
      cy.intercept('POST', '**/calendar/block-dates').as('blockDates')
      cy.wait('@blockDates')

      // Second click: unblock date
      cy.get('[data-testid="calendar-day"].blocked').first().click()
      cy.get('[data-testid="modal-action-unblock"]').should('exist')
      cy.get('[data-testid="modal-action-unblock"]').click()
      cy.get('[data-testid="modal-save-button"]').click()

      // Assert: Date unblocked
      cy.intercept('POST', '**/calendar/unblock-dates').as('unblockDates')
      cy.wait('@unblockDates')
      cy.get('[data-testid="calendar-day"].blocked').should('not.exist')
    })
  })

  describe('Settings Sidebar Integration', () => {
    it('should display all 5 cards', () => {
      cy.get('[data-testid="settings-sidebar"]').should('be.visible')
      cy.get('[data-testid="card-prices"]').should('be.visible')
      cy.get('[data-testid="card-discounts"]').should('be.visible')
      cy.get('[data-testid="card-availability"]').should('be.visible')
      cy.get('[data-testid="card-cancellations"]').should('be.visible')
      cy.get('[data-testid="card-taxes"]').should('be.visible')
    })

    it('should navigate between card tabs', () => {
      cy.get('[data-testid="tab-discounts"]').click()
      cy.get('[data-testid="card-discounts"]').should('be.visible')

      cy.get('[data-testid="tab-availability"]').click()
      cy.get('[data-testid="card-availability"]').should('be.visible')
    })
  })

  describe('Complete Reservation Pricing Flow', () => {
    it('should calculate price with all components', () => {
      // Setup: Configure base price
      cy.get('[data-testid="card-prices"]').within(() => {
        cy.get('[data-testid="price-base-input"]').type('100')
        cy.get('[data-testid="price-save-button"]').click()
      })

      // Setup: Configure discounts
      cy.get('[data-testid="tab-discounts"]').click()
      cy.get('[data-testid="card-discounts"]').within(() => {
        cy.get('[data-testid="discount-weekly"]').type('10')
        cy.get('[data-testid="discount-save"]').click()
      })

      // Setup: Configure fees
      cy.get('[data-testid="tab-taxes"]').click()
      cy.get('[data-testid="card-taxes"]').within(() => {
        cy.get('[data-testid="add-fee-button"]').click()
        cy.get('[data-testid="fee-name"]').type('Limpeza')
        cy.get('[data-testid="fee-amount"]').type('50')
        cy.get('[data-testid="fee-save"]').click()
      })

      // Test: Calculate price for 7-night stay
      cy.get('[data-testid="calendar-day"]:not(.has-reservation)')
        .first()
        .click()
      cy.get('[data-testid="modal-action-price"]').click()

      // Assert: Should show calculation
      cy.get('[data-testid="price-calculation"]').should('contain', '€')

      // Expected: 100 * 7 = 700, - 10% discount = 630, + 50 fee = 680
      cy.get('[data-testid="price-calculation"]').should('contain', '680')
    })

    it('should apply monthly discount (exclusive from weekly)', () => {
      // Setup: Configure discounts
      cy.get('[data-testid="tab-discounts"]').click()
      cy.get('[data-testid="card-discounts"]').within(() => {
        cy.get('[data-testid="discount-weekly"]').type('10')
        cy.get('[data-testid="discount-monthly"]').type('20')
        cy.get('[data-testid="discount-save"]').click()
      })

      // Select 28-night period
      cy.get('[data-testid="calendar-day"]:not(.has-reservation)').first().click()
      cy.get('[data-testid="calendar-day"]:not(.has-reservation)')
        .eq(27)
        .click({ shiftKey: true })

      cy.get('[data-testid="calendar-day"].selected').first().rightClick()

      // Assert: Should use MONTHLY discount only (20%), not weekly (10%)
      cy.get('[data-testid="price-calculation"]').should('contain', 'Desconto Mensal')
      cy.get('[data-testid="price-calculation"]').should('not.contain', 'Desconto Semanal')
    })

    it('should validate availability rules', () => {
      // Setup: Configure min 2 nights
      cy.get('[data-testid="tab-availability"]').click()
      cy.get('[data-testid="card-availability"]').within(() => {
        cy.get('[data-testid="min-nights"]').clear().type('2')
        cy.get('[data-testid="save-button"]').click()
      })

      // Try booking 1 night (should fail)
      cy.get('[data-testid="calendar-day"]:not(.has-reservation)').first().click()
      cy.get('[data-testid="day-click-modal"]').should('contain', 'Mínimo de 2')
    })
  })

  describe('Mobile Responsiveness', () => {
    beforeEach(() => {
      cy.viewport('iphone-x')
    })

    it('should display calendar full-width on mobile', () => {
      cy.get('[data-testid="calendar-container"]').should(
        'have.css',
        'width',
        '100%'
      )
    })

    it('should show settings as bottom sheet on mobile', () => {
      cy.get('[data-testid="settings-sidebar"]').should('be.visible')
      cy.get('[data-testid="settings-sidebar"]').should(
        'have.css',
        'position',
        'fixed'
      )
    })

    it('should display modal full-screen on mobile', () => {
      cy.get('[data-testid="calendar-day"]:not(.has-reservation)').first().click()
      cy.get('[data-testid="day-click-modal"]').should('be.visible')
      cy.get('[data-testid="day-click-modal"]').should(
        'have.css',
        'width',
        '100vw'
      )
    })
  })

  describe('Error Handling & Validation', () => {
    it('should show error on API failure', () => {
      cy.intercept('POST', '**/pricing/bulk-update', { statusCode: 500 })

      cy.get('[data-testid="calendar-day"]:not(.has-reservation)').first().click()
      cy.get('[data-testid="modal-action-price"]').click()
      cy.get('[data-testid="price-input"]').type('100')
      cy.get('[data-testid="modal-save-button"]').click()

      cy.get('[data-testid="error-message"]').should('contain', 'Erro ao salvar')
    })

    it('should require valid price', () => {
      cy.get('[data-testid="calendar-day"]:not(.has-reservation)').first().click()
      cy.get('[data-testid="modal-action-price"]').click()

      cy.get('[data-testid="price-input"]').type('-10')
      cy.get('[data-testid="modal-save-button"]').should('be.disabled')
    })

    it('should clear selection on cancel', () => {
      cy.get('[data-testid="calendar-day"]:not(.has-reservation)').first().click()
      cy.get('[data-testid="modal-cancel-button"]').click()

      cy.get('[data-testid="calendar-day"].selected').should('not.exist')
    })
  })
})
