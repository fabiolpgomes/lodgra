import { render, screen } from '@testing-library/react'
import BillingPage from '@/app/[locale]/settings/billing/page'

// Mock requireRole
jest.mock('@/lib/auth/requireRole', () => ({
  requireRole: async () => ({
    authorized: true,
    role: 'admin',
    organizationId: 'test-org-123',
  }),
}))

// Mock createAdminClient
jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: jest.fn((table) => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: {
          id: 'test-org-123',
          name: 'Test Organization',
          subscription_plan: 'premium',
          subscription_status: 'active',
        },
      }),
    })),
  }),
}))

// Mock redirect
jest.mock('next/navigation', () => ({
  redirect: jest.fn(),
}))

// Mock AuthLayout
jest.mock('@/components/common/layout/AuthLayout', () => ({
  AuthLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

// Mock PremiumPageShell and PremiumPageHeader
jest.mock('@/components/common/layout/PremiumPage', () => ({
  PremiumPageShell: ({ children, maxWidth }: { children: React.ReactNode; maxWidth?: string }) => (
    <div data-testid="premium-page-shell" data-max-width={maxWidth}>
      {children}
    </div>
  ),
  PremiumPageHeader: ({ title, description, icon, badge }: { title: string; description: string; icon: unknown; badge?: string }) => (
    <div data-testid="premium-page-header">
      <h1>{title}</h1>
      <p>{description}</p>
      {badge && <span>{badge}</span>}
    </div>
  ),
  PremiumCard: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="premium-card">{children}</div>
  ),
}))

// Mock PlanManagement
jest.mock('@/components/billing/PlanManagement', () => ({
  PlanManagement: ({ currentPlan, subscriptionStatus }: { currentPlan: string; subscriptionStatus: string }) => (
    <div data-testid="plan-management" data-plan={currentPlan} data-status={subscriptionStatus}>
      <p>Plan: {currentPlan}</p>
      <p>Status: {subscriptionStatus}</p>
    </div>
  ),
}))

describe('Settings Billing Page', () => {
  test('should render billing page header', async () => {
    const result = await BillingPage()
    render(result)

    expect(screen.getByText('Planos e Ferramentas')).toBeInTheDocument()
    expect(screen.getByText('Gerencie sua subscrição e escolha o plano ideal para o seu negócio')).toBeInTheDocument()
  })

  test('should render PlanManagement component', async () => {
    const result = await BillingPage()
    render(result)

    const planManagement = screen.getByTestId('plan-management')
    expect(planManagement).toBeInTheDocument()
    expect(planManagement).toHaveAttribute('data-plan', 'premium')
    expect(planManagement).toHaveAttribute('data-status', 'active')
  })

  test('should render PremiumPageShell with correct max-width', async () => {
    const result = await BillingPage()
    render(result)

    const shell = screen.getByTestId('premium-page-shell')
    expect(shell).toHaveAttribute('data-max-width', 'max-w-4xl')
  })

  test('should render status badge', async () => {
    const result = await BillingPage()
    render(result)

    const header = screen.getByTestId('premium-page-header')
    expect(header).toHaveTextContent('Ativo')
  })

  test('should pass correct props to PlanManagement', async () => {
    const result = await BillingPage()
    render(result)

    const planManagement = screen.getByTestId('plan-management')
    expect(planManagement).toHaveTextContent('Plan: premium')
    expect(planManagement).toHaveTextContent('Status: active')
  })
})
