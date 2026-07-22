import {
  matchEmailToCalendarEvents,
  matchCalendarEventToEmails,
  decideMatch,
  CalendarEvent,
  EmailExtractionData,
  MatchCandidate,
} from '../matching-engine'

describe('Phase 4: Reconciliation Matching Engine (AC5)', () => {
  // Mock data
  const mockEmail: EmailExtractionData & { id: string; organization_id: string; source_platform: string } = {
    id: 'email-1',
    organization_id: 'org-1',
    source_platform: 'airbnb',
    guest_name: 'João Silva',
    check_in: '2026-08-15',
    check_out: '2026-08-20',
    reservation_code: 'ABK123456',
    property_name: 'Casa do Mar',
  }

  const mockCalendarEvent: CalendarEvent & { id: string } = {
    id: 'event-1',
    organization_id: 'org-1',
    source_platform: 'airbnb',
    check_in: new Date('2026-08-15'),
    check_out: new Date('2026-08-20'),
    raw_summary: 'Reservation ABK123456 - Casa do Mar',
    property_identifier_raw: 'Casa do Mar',
    status: 'unmatched',
    created_at: new Date(),
  }

  describe('Exact Match — Code + Dates + Platform', () => {
    it('should score 100 for perfect match (reservation code + exact dates + platform)', () => {
      const candidates = matchEmailToCalendarEvents(mockEmail, [mockCalendarEvent])

      expect(candidates).toHaveLength(1)
      expect(candidates[0].score).toBe(100) // 50+30+10+10
      expect(candidates[0].details.reservation_code_match).toBe(true)
      expect(candidates[0].details.dates_exact).toBe(true)
      expect(candidates[0].details.source_platform_match).toBe(true)
    })
  })

  describe('Date Tolerance ±1 Day', () => {
    it('should score 35 for dates within ±1 day (without reservation code)', () => {
      const emailNoCode = { ...mockEmail, reservation_code: undefined }
      const eventOffByOne = {
        ...mockCalendarEvent,
        check_in: new Date('2026-08-16'), // +1 day
      }

      const candidates = matchEmailToCalendarEvents(emailNoCode, [eventOffByOne])

      expect(candidates[0].score).toBe(35) // 15 (tolerance) + 10 (platform) + 10 (property)
      expect(candidates[0].details.dates_within_tolerance).toBeLessThanOrEqual(1)
    })
  })

  describe('Ambiguity Detection', () => {
    it('should return needs_review when two candidates have same score', () => {
      const event1 = mockCalendarEvent
      const event2 = {
        ...mockCalendarEvent,
        id: 'event-2',
        raw_summary: 'Reservation ABK123456 - Casa do Mar (alternative)',
      }

      const candidates = matchEmailToCalendarEvents(mockEmail, [event1, event2])

      // Both have score 100, so they're tied — should be ambiguous
      expect(candidates[0].score).toBe(candidates[1].score)

      const decision = decideMatch(candidates)

      expect(decision.status).toBe('needs_review')
      expect(decision.reason).toContain('Ambiguity')
    })
  })

  describe('No Match', () => {
    it('should return no_match when score < 40', () => {
      const differentEmail = {
        ...mockEmail,
        reservation_code: 'XYZ999', // Not in summary
        source_platform: 'booking', // Different platform
        check_in: '2026-09-01', // Different dates
        check_out: '2026-09-05',
      }

      const candidates = matchEmailToCalendarEvents(differentEmail, [mockCalendarEvent])

      expect(candidates[0].score).toBeLessThan(40)

      const decision = decideMatch(candidates)
      expect(decision.status).toBe('no_match')
    })
  })

  describe('Auto-Match Decision', () => {
    it('should auto-match when score ≥ 80', () => {
      const candidates = matchEmailToCalendarEvents(mockEmail, [mockCalendarEvent])
      const decision = decideMatch(candidates)

      expect(decision.status).toBe('auto_matched')
      expect(decision.candidates).toHaveLength(1)
    })
  })

  describe('Needs Review Decision', () => {
    it('should need_review when score 40-79', () => {
      const partialMatch = {
        ...mockCalendarEvent,
        source_platform: 'booking' as const, // Different platform, loses 10 points
        raw_summary: 'Some reservation - Casa do Mar', // No reservation code match
      }

      const candidates = matchEmailToCalendarEvents(mockEmail, [partialMatch])

      // Score: 30 (exact dates) + 10 (property) = 40
      expect(candidates[0].score).toBe(40)

      const decision = decideMatch(candidates)
      expect(decision.status).toBe('needs_review')
    })
  })

  describe('Bidirectional Matching', () => {
    it('should work in both directions: email→calendar and calendar→email', () => {
      const emailForCalendar = {
        ...mockEmail,
        match_status: 'pending' as const,
      }

      const candidatesFromEmail = matchEmailToCalendarEvents(mockEmail, [mockCalendarEvent])
      const candidatesFromCalendar = matchCalendarEventToEmails(mockCalendarEvent, [
        emailForCalendar,
      ])

      expect(candidatesFromEmail[0].score).toBe(candidatesFromCalendar[0].score)
      expect(candidatesFromEmail[0].details).toEqual(candidatesFromCalendar[0].details)
    })
  })

  describe('Idempotence', () => {
    it('should return same result on repeated calls', () => {
      const call1 = matchEmailToCalendarEvents(mockEmail, [mockCalendarEvent])
      const call2 = matchEmailToCalendarEvents(mockEmail, [mockCalendarEvent])

      expect(call1).toEqual(call2)

      const decision1 = decideMatch(call1)
      const decision2 = decideMatch(call2)

      expect(decision1).toEqual(decision2)
    })
  })

  describe('Candidate Ordering', () => {
    it('should order candidates by score descending', () => {
      const event1 = mockCalendarEvent // Score: 100 (all rules match)
      const event2 = {
        ...mockCalendarEvent,
        id: 'event-2',
        raw_summary: 'Reservation ABK123456 - Different Property', // Code match + dates + platform
        property_identifier_raw: 'Different Property', // No property match
      }
      const event3 = {
        ...mockCalendarEvent,
        id: 'event-3',
        check_in: new Date('2026-07-01'), // Completely different dates
        check_out: new Date('2026-07-05'),
        raw_summary: 'Some other event',
        property_identifier_raw: 'Other Place',
      }

      const candidates = matchEmailToCalendarEvents(mockEmail, [event3, event2, event1])

      // Verify they're ordered by score descending
      for (let i = 0; i < candidates.length - 1; i++) {
        expect(candidates[i].score).toBeGreaterThanOrEqual(candidates[i + 1].score)
      }
    })
  })

  describe('Empty Candidates', () => {
    it('should return no_match for empty candidate list', () => {
      const decision = decideMatch([])

      expect(decision.status).toBe('no_match')
      expect(decision.candidates).toHaveLength(0)
    })
  })

  describe('Multi-Tenant Isolation', () => {
    it('should filter candidates by organization_id', () => {
      const differentOrgEvent = {
        ...mockCalendarEvent,
        organization_id: 'org-2', // Different org
      }

      const candidates = matchEmailToCalendarEvents(mockEmail, [
        mockCalendarEvent,
        differentOrgEvent,
      ])

      // Should only match the one from same org
      expect(candidates.filter((c) => c.target_id === 'event-1')).toHaveLength(1)
    })
  })
})
