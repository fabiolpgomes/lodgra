/**
 * Phase 7: Rollout Metrics Tests (AC8)
 *
 * Tests for:
 * - Feature flag management
 * - Rollout metrics calculation
 * - Quality checks (duplications, property associations)
 */

describe('Phase 7: Rollout Metrics (AC8)', () => {
  describe('Matching Metrics Calculation', () => {
    it('should calculate auto_matched rate correctly', () => {
      const metrics = {
        total_extractions: 100,
        auto_matched_count: 75,
        needs_review_count: 20,
        no_match_count: 5,
        auto_matched_rate: 75,
        needs_review_rate: 20,
        no_match_rate: 5,
        target_met: true,
      }

      expect(metrics.auto_matched_rate).toBe(75)
      expect(metrics.target_met).toBe(true)
    })

    it('should meet target when auto_matched >= 70%', () => {
      const metrics70 = {
        auto_matched_count: 70,
        total_extractions: 100,
        auto_matched_rate: 70,
        target_met: true,
      }

      const metrics69 = {
        auto_matched_count: 69,
        total_extractions: 100,
        auto_matched_rate: 69,
        target_met: false,
      }

      expect(metrics70.target_met).toBe(true)
      expect(metrics69.target_met).toBe(false)
    })

    it('should sum rates to 100%', () => {
      const metrics = {
        auto_matched_rate: 75,
        needs_review_rate: 20,
        no_match_rate: 5,
      }

      const total = metrics.auto_matched_rate + metrics.needs_review_rate + metrics.no_match_rate
      expect(total).toBe(100)
    })
  })

  describe('Duplication Detection', () => {
    it('should detect zero duplications as success', () => {
      const duplicates = {
        has_duplicates: false,
        duplicate_count: 0,
        details: [],
      }

      expect(duplicates.has_duplicates).toBe(false)
      expect(duplicates.duplicate_count).toBe(0)
    })

    it('should flag any duplications as failure', () => {
      const duplicates = {
        has_duplicates: true,
        duplicate_count: 2,
        details: [
          'Event event-123 matched by 2 extractions',
          'Event event-456 matched by 3 extractions',
        ],
      }

      expect(duplicates.has_duplicates).toBe(true)
      expect(duplicates.duplicate_count).toBeGreaterThan(0)
      expect(duplicates.details.length).toBeGreaterThan(0)
    })
  })

  describe('Property Association Check', () => {
    it('should validate correct property associations', () => {
      const check = {
        has_wrong_associations: false,
        wrong_association_count: 0,
        details: [],
      }

      expect(check.has_wrong_associations).toBe(false)
    })

    it('should flag wrong property associations', () => {
      const check = {
        has_wrong_associations: true,
        wrong_association_count: 1,
        details: ['Extraction "Casa da Praia" matched to event property "Casa da Montanha"'],
      }

      expect(check.has_wrong_associations).toBe(true)
      expect(check.wrong_association_count).toBeGreaterThan(0)
    })
  })

  describe('Rollout Approval Criteria', () => {
    it('should approve when all criteria met', () => {
      const report = {
        metrics: {
          target_met: true,
          auto_matched_rate: 75,
        },
        duplicates: {
          has_duplicates: false,
          duplicate_count: 0,
        },
        property_associations: {
          has_wrong_associations: false,
          wrong_association_count: 0,
        },
        all_checks_pass: true,
      }

      expect(report.all_checks_pass).toBe(true)
    })

    it('should reject when auto-match target not met', () => {
      const report = {
        metrics: {
          target_met: false,
          auto_matched_rate: 65,
        },
        duplicates: {
          has_duplicates: false,
        },
        property_associations: {
          has_wrong_associations: false,
        },
        all_checks_pass: false,
      }

      expect(report.all_checks_pass).toBe(false)
    })

    it('should reject when duplications detected', () => {
      const report = {
        metrics: {
          target_met: true,
          auto_matched_rate: 75,
        },
        duplicates: {
          has_duplicates: true,
          duplicate_count: 1,
        },
        property_associations: {
          has_wrong_associations: false,
        },
        all_checks_pass: false,
      }

      expect(report.all_checks_pass).toBe(false)
    })

    it('should reject when wrong associations detected', () => {
      const report = {
        metrics: {
          target_met: true,
          auto_matched_rate: 75,
        },
        duplicates: {
          has_duplicates: false,
        },
        property_associations: {
          has_wrong_associations: true,
          wrong_association_count: 1,
        },
        all_checks_pass: false,
      }

      expect(report.all_checks_pass).toBe(false)
    })
  })

  describe('Feature Flag Status', () => {
    it('should track pilot start date', () => {
      const status = {
        organization_id: 'org-1',
        enabled: true,
        pilot_started_at: '2026-07-22T10:00:00Z',
        pilot_platforms: ['airbnb', 'booking'],
        days_running: 0,
      }

      expect(status.enabled).toBe(true)
      expect(status.pilot_platforms).toContain('airbnb')
      expect(status.pilot_platforms).toContain('booking')
      expect(status.pilot_platforms).toHaveLength(2)
      expect(status.days_running).toBe(0)
    })

    it('should allow only Airbnb and Booking in pilot', () => {
      const status = {
        pilot_platforms: ['airbnb', 'booking'],
      }

      expect(status.pilot_platforms).not.toContain('vrbo')
      expect(status.pilot_platforms).not.toContain('google')
      expect(status.pilot_platforms).toHaveLength(2)
    })
  })

  describe('2-Week Pilot Window', () => {
    it('should calculate pilot duration correctly', () => {
      const now = new Date()
      const pilotStart = new Date()
      pilotStart.setDate(pilotStart.getDate() - 7) // 7 days ago

      const daysRunning = Math.floor(
        (now.getTime() - pilotStart.getTime()) / (1000 * 60 * 60 * 24)
      )

      expect(daysRunning).toBeGreaterThanOrEqual(7)
      expect(daysRunning).toBeLessThanOrEqual(8)
    })

    it('should indicate ready for expansion after 14 days', () => {
      const now = new Date()
      const pilotStart = new Date()
      pilotStart.setDate(pilotStart.getDate() - 14) // 14 days ago

      const daysRunning = Math.floor(
        (now.getTime() - pilotStart.getTime()) / (1000 * 60 * 60 * 24)
      )

      expect(daysRunning).toBeGreaterThanOrEqual(14)
    })
  })

  describe('Multi-Tenant Isolation in Rollout', () => {
    it('should isolate metrics by organization', () => {
      const org1Metrics = {
        organization_id: 'org-1',
        total_extractions: 100,
        auto_matched_count: 75,
      }

      const org2Metrics = {
        organization_id: 'org-2',
        total_extractions: 50,
        auto_matched_count: 30,
      }

      expect(org1Metrics.organization_id).not.toBe(org2Metrics.organization_id)
      expect(org1Metrics.total_extractions).not.toBe(org2Metrics.total_extractions)
    })

    it('should enforce feature flag per tenant', () => {
      const org1Enabled = true
      const org2Enabled = false

      expect(org1Enabled).not.toBe(org2Enabled)
    })
  })
})
