import {
  buildDefaultEmailTemplate,
  normalizeEmailTemplateRow,
  validateEmailTemplateInput,
} from '../email-template-config'

describe('email template config', () => {
  it('builds sensible defaults per organization', () => {
    const defaults = buildDefaultEmailTemplate('Pousada Sol')

    expect(defaults.confirmation_subject).toContain('Pousada Sol')
    expect(defaults.from_email).toBe('noreply@lodgra.io')
    expect(defaults.include_company_logo).toBe(true)
  })

  it('normalizes template data with branding fallbacks', () => {
    const normalized = normalizeEmailTemplateRow(
      {
        id: 'tpl-1',
        organization_id: 'org-1',
        confirmation_subject: null,
        confirmation_message: 'Olá **mundo**',
        from_email: null,
        from_name: null,
        reply_to_email: null,
        include_company_logo: null,
        footer_text: null,
        created_at: null,
        updated_at: null,
      },
      'Pousada Sol',
      'org-1',
      'pousada-sol',
      { logo_url: 'https://cdn.example/logo.png', primary_color: '#123456' }
    )

    expect(normalized.confirmation_subject).toContain('Pousada Sol')
    expect(normalized.from_name).toBe('Pousada Sol')
    expect(normalized.branding.logo_url).toBe('https://cdn.example/logo.png')
    expect(normalized.branding.primary_color).toBe('#123456')
  })

  it('validates subject and email fields', () => {
    expect(validateEmailTemplateInput({ confirmation_subject: 'x'.repeat(101) }).ok).toBe(false)
    expect(validateEmailTemplateInput({ from_email: 'not-an-email' }).ok).toBe(false)
    expect(validateEmailTemplateInput({ reply_to_email: 'support@example.com' }).ok).toBe(true)
  })
})
