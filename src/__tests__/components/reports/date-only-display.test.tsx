import { render, screen } from '@testing-library/react'

import { ExpensesTable } from '@/components/features/reports/ExpensesTable'
import { RevenueTable } from '@/components/features/reports/RevenueTable'

const exported: Array<{ data: Array<Record<string, unknown>> }> = []

jest.mock('@/components/features/reports/ExportToExcelButton', () => ({
  ExportToExcelButton: (props: { data: Array<Record<string, unknown>> }) => {
    exported.push(props)
    return null
  },
}))
jest.mock('@/lib/i18n/routing', () => ({
  getLocalizedPath: (path: string) => path,
  useLocale: () => 'pt-BR',
}))

// Estas datas são dias de calendário. Em UTC−3 (Brasil), `new Date('2026-10-09')` mostraria dia 08.
// Corra também com TZ=America/Sao_Paulo para exercitar o caso real.
describe('reports show date-only columns on the right calendar day', () => {
  beforeEach(() => {
    exported.length = 0
  })

  it('ExpensesTable shows expense_date as DD/MM/YYYY, on screen and in the export', () => {
    render(
      <ExpensesTable
        startDate="2026-10-01"
        endDate="2026-10-31"
        expenses={[
          {
            id: 'e1',
            expense_date: '2026-10-09',
            description: 'Limpeza',
            category: 'cleaning',
            amount: 50,
            currency: 'EUR',
            properties: { name: 'Casa A', currency: 'EUR' },
          },
        ]}
      />
    )

    expect(screen.getByText('09/10/2026')).toBeTruthy()
    expect(screen.queryByText('08/10/2026')).toBeNull()
    expect(exported[0].data[0]['Data']).toBe('09/10/2026')
  })

  it('RevenueTable shows check-in and check-out on the stored day, on screen and in the export', () => {
    render(
      <RevenueTable
        startDate="2026-10-01"
        endDate="2026-10-31"
        reservations={[
          {
            id: 'r1',
            check_in: '2026-10-09',
            check_out: '2026-10-12',
            total_amount: 300,
            currency: 'EUR',
            status: 'confirmed',
            guests: { first_name: 'Ana', last_name: 'Silva' },
            property_listings: { properties: { name: 'Casa A', city: 'Faro', currency: 'EUR' } },
          },
        ]}
      />
    )

    expect(screen.getByText('09/10/2026')).toBeTruthy()
    expect(screen.getByText('12/10/2026')).toBeTruthy()
    expect(screen.queryByText('08/10/2026')).toBeNull()
    expect(screen.queryByText('11/10/2026')).toBeNull()
    expect(exported[0].data[0]['Check-in']).toBe('09/10/2026')
    expect(exported[0].data[0]['Check-out']).toBe('12/10/2026')
    expect(exported[0].data[0]['Noites']).toBe(3)
  })
})
