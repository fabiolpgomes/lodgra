import {
  seriousIssueReviewTemplate,
  type SeriousIssueReviewEmailData,
} from '@/lib/email/serious-issue-review'
import {
  seriousIssueDecisionTemplate,
  type SeriousIssueDecisionEmailData,
} from '@/lib/email/serious-issue-decision'
import {
  seriousIssueConfirmationTemplate,
  type SeriousIssueConfirmationEmailData,
} from '@/lib/email/serious-issue-confirmation'

// Story 40.1: Manual Review Infrastructure Tests
describe('Story 40.1: Email Templates', () => {
  describe('seriousIssueReviewTemplate', () => {
    it('should generate review email for manager', () => {
      const data: SeriousIssueReviewEmailData = {
        guest_name: 'João Silva',
        property_name: 'AHS Premium Apt',
        reservation_id: 'res-123',
        check_in: '2026-08-15',
        check_out: '2026-08-20',
        total_amount: 450.0,
        description: 'Limpeza inadequada, não foi feita',
        evidence_url: 'https://example.com/photo.jpg',
        review_link: 'https://lodgra.io/admin/review/res-123?token=xxx',
      }

      const template = seriousIssueReviewTemplate(data)

      expect(template).toHaveProperty('subject')
      expect(template).toHaveProperty('html')
      expect(template).toHaveProperty('text')
      expect(template.subject).toContain('REVISÃO')
      expect(template.html).toContain('João Silva')
      expect(template.html).toContain('AHS Premium Apt')
      expect(template.html).toContain('€450.00')
      expect(template.html).toContain('res-123?token=xxx')
    })

    it('should include evidence link when provided', () => {
      const data: SeriousIssueReviewEmailData = {
        guest_name: 'João',
        property_name: 'Apt',
        reservation_id: 'res-123',
        check_in: '2026-08-15',
        check_out: '2026-08-20',
        total_amount: 450.0,
        description: 'Issue',
        evidence_url: 'https://example.com/evidence.jpg',
        review_link: 'https://lodgra.io/admin/review/res-123?token=xxx',
      }

      const template = seriousIssueReviewTemplate(data)
      expect(template.html).toContain('evidence.jpg')
    })
  })

  describe('seriousIssueDecisionTemplate', () => {
    it('should generate APPROVED decision email', () => {
      const data: SeriousIssueDecisionEmailData = {
        guest_name: 'João Silva',
        decision: 'APPROVED',
        refund_amount: 450.0,
        refund_percentage: 100,
        notes: 'Confirmado problema de limpeza',
      }

      const template = seriousIssueDecisionTemplate(data)

      expect(template.subject).toContain('Reembolso Completo')
      expect(template.html).toContain('João Silva')
      expect(template.html).toContain('€450.00')
      expect(template.html).toContain('Confirmado problema')
    })

    it('should generate PARTIAL decision email', () => {
      const data: SeriousIssueDecisionEmailData = {
        guest_name: 'Maria',
        decision: 'PARTIAL',
        refund_amount: 225.0,
        refund_percentage: 50,
      }

      const template = seriousIssueDecisionTemplate(data)
      expect(template.subject).toContain('Reembolso Parcial')
      expect(template.html).toContain('€225.00')
      expect(template.html).toContain('50%')
    })

    it('should generate DENIED decision email', () => {
      const data: SeriousIssueDecisionEmailData = {
        guest_name: 'Pedro',
        decision: 'DENIED',
        refund_amount: 0,
        refund_percentage: 0,
      }

      const template = seriousIssueDecisionTemplate(data)
      expect(template.subject).toContain('Sem Reembolso')
      expect(template.html).toContain('Pedro')
    })
  })

  describe('seriousIssueConfirmationTemplate', () => {
    it('should generate confirmation email for manager', () => {
      const data: SeriousIssueConfirmationEmailData = {
        reservation_id: 'res-123',
        guest_name: 'João Silva',
        property_name: 'AHS Premium Apt',
        decision: 'APPROVED',
        refund_amount: 450.0,
        stripe_refund_id: 're_123456',
      }

      const template = seriousIssueConfirmationTemplate(data)

      expect(template).toHaveProperty('subject')
      expect(template).toHaveProperty('html')
      expect(template).toHaveProperty('text')
      expect(template.subject).toContain('CONFIRMADO')
      expect(template.html).toContain('res-123')
      expect(template.html).toContain('João Silva')
      expect(template.html).toContain('€450.00')
      expect(template.html).toContain('re_123456')
    })

    it('should handle decisions without refund ID', () => {
      const data: SeriousIssueConfirmationEmailData = {
        reservation_id: 'res-123',
        guest_name: 'João',
        property_name: 'Apt',
        decision: 'DENIED',
        refund_amount: 0,
      }

      const template = seriousIssueConfirmationTemplate(data)
      expect(template.html).toContain('res-123')
      expect(template.html).toContain('João')
    })
  })
})
