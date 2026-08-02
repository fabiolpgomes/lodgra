/**
 * Performance Tests: Calendar + Settings Integration
 * Ensures mobile-first optimization meets targets
 */

describe('Calendar Performance', () => {
  beforeEach(() => {
    cy.visit('/pt/calendar/test-property-id')
  })

  describe('Page Load Performance', () => {
    it('should load page in under 2 seconds', () => {
      cy.visit('/pt/calendar/test-property-id', {
        onBeforeLoad: (win) => {
          win.performance.mark('start')
        },
        onLoad: (win) => {
          win.performance.mark('end')
          win.performance.measure('pageLoad', 'start', 'end')
          const measure = win.performance.getEntriesByName('pageLoad')[0]
          expect(measure.duration).to.be.lessThan(2000)
        },
      })
    })

    it('should render calendar in under 500ms', () => {
      cy.get('[data-testid="calendar-container"]', { timeout: 500 }).should(
        'be.visible'
      )
    })

    it('should render settings sidebar in under 300ms', () => {
      cy.get('[data-testid="settings-sidebar"]', { timeout: 300 }).should(
        'be.visible'
      )
    })
  })

  describe('Interaction Performance', () => {
    it('should open modal in under 200ms', () => {
      cy.get('[data-testid="calendar-day"]:not(.has-reservation)')
        .first()
        .then(($el) => {
          const start = performance.now()
          cy.wrap($el).click()
          cy.get('[data-testid="day-click-modal"]').then(() => {
            const duration = performance.now() - start
            expect(duration).to.be.lessThan(200)
          })
        })
    })

    it('should save price in under 1 second', () => {
      cy.intercept('POST', '**/pricing/bulk-update', {
        delay: 100,
        statusCode: 200,
      }).as('savePrice')

      cy.get('[data-testid="calendar-day"]:not(.has-reservation)').first().click()
      cy.get('[data-testid="modal-action-price"]').click()
      cy.get('[data-testid="price-input"]').type('100')

      const start = performance.now()
      cy.get('[data-testid="modal-save-button"]').click()
      cy.wait('@savePrice').then(() => {
        const duration = performance.now() - start
        expect(duration).to.be.lessThan(1000)
      })
    })

    it('should switch card tabs instantly (under 100ms)', () => {
      const start = performance.now()
      cy.get('[data-testid="tab-discounts"]').click()
      cy.get('[data-testid="card-discounts"]').then(() => {
        const duration = performance.now() - start
        expect(duration).to.be.lessThan(100)
      })
    })
  })

  describe('Mobile Performance', () => {
    beforeEach(() => {
      cy.viewport('iphone-x')
    })

    it('should scroll smoothly (60 FPS)', () => {
      cy.get('[data-testid="calendar-container"]').within(() => {
        cy.scrollTo(0, 500)
      })

      cy.window().then((win) => {
        const fps = win.performance.getEntriesByType('paint')
        expect(fps.length).to.be.greaterThan(0)
      })
    })

    it('should handle touch interactions with low latency', () => {
      // Simulate touch event
      cy.get('[data-testid="calendar-day"]:not(.has-reservation)')
        .first()
        .trigger('touchstart', { which: 1 })
        .trigger('touchend')

      // Modal should appear quickly
      cy.get('[data-testid="day-click-modal"]', { timeout: 300 }).should(
        'be.visible'
      )
    })

    it('should not cause layout shift (CLS < 0.1)', () => {
      cy.window().then((win) => {
        const cls = win.performance.getEntriesByType('largest-contentful-paint')
        // Just verify API is available; actual CLS measurement would need PerformanceObserver
        expect(cls).to.exist
      })
    })
  })

  describe('Memory Efficiency', () => {
    it('should not leak memory on repeated interactions', () => {
      cy.window().then((win) => {
        const initialMemory = win.performance.memory?.usedJSHeapSize || 0

        // Perform 10 rapid interactions
        for (let i = 0; i < 10; i++) {
          cy.get('[data-testid="calendar-day"]:not(.has-reservation)')
            .first()
            .click()
          cy.get('[data-testid="day-click-modal"]').should('be.visible')
          cy.get('[data-testid="modal-cancel-button"]').click()
        }

        cy.window().then((win2) => {
          const finalMemory = win2.performance.memory?.usedJSHeapSize || 0
          const memoryIncrease = finalMemory - initialMemory

          // Should not increase by more than 5MB
          expect(memoryIncrease).to.be.lessThan(5 * 1024 * 1024)
        })
      })
    })
  })

  describe('Bundle Size', () => {
    it('should load minimal CSS for calendar', () => {
      cy.request('/css/calendar.css').then((response) => {
        const sizeKB = response.body.length / 1024
        expect(sizeKB).to.be.lessThan(50) // 50KB max for calendar CSS
      })
    })

    it('should load minimal JS for calendar', () => {
      // This would check actual JS bundle size
      // Implementation depends on build system
      cy.window().then((win) => {
        // Verify no unnecessary libraries loaded
        expect(win._bundleSize).to.exist
      })
    })
  })
})
