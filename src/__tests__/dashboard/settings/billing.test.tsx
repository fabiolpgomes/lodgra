import React from 'react'
import { render, screen } from '@testing-library/react'
import BillingPage from '@/app/dashboard/settings/billing/page'

// Mock useParams
jest.mock('next/navigation', () => ({
  useParams: () => ({ orgId: 'test-org-123' }),
}))

// Mock BillingPreview
jest.mock('@/components/billing/BillingPreview', () => ({
  BillingPreview: ({ orgId, onManagePlan, onAddExtraProperty }: { orgId: string; onManagePlan: () => void; onAddExtraProperty: () => void }) => (
    <div data-testid="billing-preview" data-org-id={orgId}>
      <button onClick={onManagePlan}>Manage Plan</button>
      <button onClick={onAddExtraProperty}>Add Extra</button>
    </div>
  ),
}))

// Mock next/link
jest.mock('next/link', () => {
  const Link = ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  )
  Link.displayName = 'Link'
  return Link
})

describe('Dashboard Billing Page', () => {
  test('should render billing page title', () => {
    render(<BillingPage />)

    expect(screen.getByText('Faturação')).toBeInTheDocument()
    expect(screen.getByText('Gerencie seu plano de assinatura e propriedades extras')).toBeInTheDocument()
  })

  test('should render BillingPreview component', () => {
    render(<BillingPage />)

    const billingPreview = screen.getByTestId('billing-preview')
    expect(billingPreview).toBeInTheDocument()
    expect(billingPreview).toHaveAttribute('data-org-id', 'test-org-123')
  })

  test('should render quick action buttons', () => {
    render(<BillingPage />)

    expect(screen.getByText('Ver Todos os Planos')).toBeInTheDocument()
    expect(screen.getByText('Alterar Plano')).toBeInTheDocument()
    expect(screen.getByText('Minhas Propriedades')).toBeInTheDocument()
    expect(screen.getByText('Gerenciar no Stripe')).toBeInTheDocument()
  })

  test('should render FAQ section', () => {
    render(<BillingPage />)

    expect(screen.getByText('Perguntas Frequentes')).toBeInTheDocument()
    expect(screen.getByText('Como faço upgrade do meu plano?')).toBeInTheDocument()
    expect(screen.getByText('Posso adicionar propriedades extras?')).toBeInTheDocument()
    expect(screen.getByText('Como cancelo minha assinatura?')).toBeInTheDocument()
    expect(screen.getByText('Quando serei cobrado?')).toBeInTheDocument()
  })

  test('should have correct links', () => {
    const { container } = render(<BillingPage />)

    const links = container.querySelectorAll('a[href]')
    const hrefs = Array.from(links).map(link => (link as HTMLAnchorElement).href)

    expect(hrefs.some(h => h.includes('/pricing'))).toBe(true)
    expect(hrefs.some(h => h.includes('/onboarding/select-plan'))).toBe(true)
    expect(hrefs.some(h => h.includes('/dashboard/properties'))).toBe(true)
  })

  test('should render support section', () => {
    render(<BillingPage />)

    expect(screen.getByText('Precisa de ajuda?')).toBeInTheDocument()
    expect(screen.getByText(/support@lodgra.io/)).toBeInTheDocument()
  })

  test('should show error when orgId is missing', () => {
    // Mock useParams to return no orgId
    jest.resetModules()
    jest.mock('next/navigation', () => ({
      useParams: () => ({}),
    }))

    // Re-import after mock reset
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const BillingPageNoId = require('@/app/dashboard/settings/billing/page').default

    render(<BillingPageNoId />)

    expect(screen.getByText('Organization ID not found')).toBeInTheDocument()
  })
})
