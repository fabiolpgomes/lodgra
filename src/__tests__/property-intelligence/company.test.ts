import { beforeEach, describe, expect, it, jest } from '@jest/globals'

jest.mock('server-only', () => ({}))

type Row = Record<string, unknown> | null

const tables: Record<string, Record<string, Row>> = {}
const createAdminClient = jest.fn()

jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: (...args: unknown[]) => createAdminClient(...args),
}))

function fakeAdmin() {
  return {
    from(table: string) {
      let key = ''
      const builder = {
        select: () => builder,
        eq: (_column: string, value: string) => {
          key = value
          return builder
        },
        maybeSingle: async () => ({ data: tables[table]?.[key] ?? null, error: null }),
      }
      return builder
    },
  }
}

import {
  cleanCompanyField,
  normalizeReportCompany,
} from '@/lib/property-intelligence/company'
import { getTenantReportCompany } from '@/lib/property-intelligence/company.server'

const ORG_A = '00000000-0000-0000-0000-00000000000a'
const ORG_B = '00000000-0000-0000-0000-00000000000b'
const ORG_EMPTY = '00000000-0000-0000-0000-00000000000c'

describe('tenant report company', () => {
  beforeEach(() => {
    createAdminClient.mockReset()
    createAdminClient.mockReturnValue(fakeAdmin())

    tables.organizations = {
      [ORG_A]: { name: '  Casas do Sul  ' },
      [ORG_B]: { name: 'Vista Mar Rentals' },
      [ORG_EMPTY]: { name: 'Sem Contactos' },
    }
    tables.organization_public_profile = {
      [ORG_A]: {
        contact_email: 'ola@casasdosul.example',
        contact_phone: '+351 900 000 001',
        whatsapp_number: '+351 900 000 002',
        website_url: 'www.casasdosul.example',
      },
      [ORG_B]: {
        contact_email: 'info@vistamar.example',
        contact_phone: null,
        whatsapp_number: '+55 11 90000-0003',
        website_url: '',
      },
    }
  })

  it('returns each tenant its own data and nothing from another tenant', async () => {
    const a = await getTenantReportCompany(ORG_A)
    const b = await getTenantReportCompany(ORG_B)

    expect(a).toEqual({
      name: 'Casas do Sul',
      websiteUrl: 'www.casasdosul.example',
      email: 'ola@casasdosul.example',
      phone: '+351 900 000 001',
      whatsappNumber: '+351 900 000 002',
    })
    expect(b).toEqual({
      name: 'Vista Mar Rentals',
      websiteUrl: null,
      email: 'info@vistamar.example',
      phone: null,
      whatsappNumber: '+55 11 90000-0003',
    })
    expect(JSON.stringify(b)).not.toContain('casasdosul')
  })

  it('returns only the name when the tenant has no public profile', async () => {
    expect(await getTenantReportCompany(ORG_EMPTY)).toEqual({
      name: 'Sem Contactos',
      websiteUrl: null,
      email: null,
      phone: null,
      whatsappNumber: null,
    })
  })

  it('returns all-null fields for an unknown organization', async () => {
    expect(await getTenantReportCompany('00000000-0000-0000-0000-0000000000ff')).toEqual({
      name: null,
      websiteUrl: null,
      email: null,
      phone: null,
      whatsappNumber: null,
    })
  })

  it('normalizes whitespace and blanks', () => {
    expect(cleanCompanyField('  a \n  b  ')).toBe('a b')
    expect(cleanCompanyField('   ')).toBeNull()
    expect(cleanCompanyField(undefined)).toBeNull()
    expect(normalizeReportCompany(null)).toEqual({
      name: null,
      websiteUrl: null,
      email: null,
      phone: null,
      whatsappNumber: null,
    })
  })
})
