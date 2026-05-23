import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { BillingPreview } from '@/components/billing/BillingPreview'

jest.mock('@/hooks/useBillingPreview')

import { useBillingPreview } from '@/hooks/useBillingPreview'

describe('BillingPreview Component', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Loading state', () => {
    test('should show loading animation while fetching data', () => {
      ;(useBillingPreview as jest.Mock).mockReturnValue({
        subscription: null,
        propertyCount: 0,
        loading: true,
        error: null,
      })

      render(<BillingPreview orgId="org-123" />)

      expect(screen.getByText(/seu plano/i)).toBeInTheDocument()
    })
  })

  describe('Essencial plan (1 included)', () => {
    beforeEach(() => {
      ;(useBillingPreview as jest.Mock).mockReturnValue({
        subscription: { plan: 'essencial', status: 'active' },
        propertyCount: 1,
        loading: false,
        error: null,
      })
    })

    test('should display Essencial plan details', () => {
      render(<BillingPreview orgId="org-123" />)

      expect(screen.getByText(/essencial/i)).toBeInTheDocument()
      expect(screen.getByText(/R\$59/)).toBeInTheDocument()
      expect(screen.getByText(/propriedades incluídas/i)).toBeInTheDocument()
    })

    test('should show 1 included property', () => {
      render(<BillingPreview orgId="org-123" />)

      const rows = screen.getAllByText(/propriedades/)
      expect(rows.some((el) => el.textContent.includes('1'))).toBe(true)
    })

    test('should NOT show extra properties section when none exist', () => {
      render(<BillingPreview orgId="org-123" />)

      expect(screen.queryByText(/propriedades extras/i)).not.toBeInTheDocument()
    })

    test('should show correct total (no extras)', () => {
      render(<BillingPreview orgId="org-123" />)

      expect(screen.getByText(/R\$59/)).toBeInTheDocument()
    })
  })

  describe('Essencial plan with extra properties', () => {
    beforeEach(() => {
      ;(useBillingPreview as jest.Mock).mockReturnValue({
        subscription: { plan: 'essencial', status: 'active' },
        propertyCount: 3,
        loading: false,
        error: null,
      })
    })

    test('should show extra properties section', () => {
      render(<BillingPreview orgId="org-123" />)

      expect(screen.getByText(/propriedades extras/i)).toBeInTheDocument()
    })

    test('should calculate extra properties correctly', () => {
      render(<BillingPreview orgId="org-123" />)

      // 3 properties total, 1 included = 2 extras
      const extraText = screen.getByText(/2 × R\$49/)
      expect(extraText).toBeInTheDocument()
    })

    test('should show correct total monthly cost', () => {
      render(<BillingPreview orgId="org-123" />)

      // Base: R$59 + extras: 2 × R$49 = R$157
      const totalText = screen.getByText(/R\$157/)
      expect(totalText).toBeInTheDocument()
    })

    test('should show upgrade suggestion to Expansão', () => {
      render(<BillingPreview orgId="org-123" />)

      expect(screen.getByText(/plano expansão inclui 3/i)).toBeInTheDocument()
    })
  })

  describe('Expansão plan (3 included)', () => {
    beforeEach(() => {
      ;(useBillingPreview as jest.Mock).mockReturnValue({
        subscription: { plan: 'expansao', status: 'active' },
        propertyCount: 3,
        loading: false,
        error: null,
      })
    })

    test('should display Expansão plan', () => {
      render(<BillingPreview orgId="org-123" />)

      expect(screen.getByText(/expansão/i)).toBeInTheDocument()
      expect(screen.getByText(/R\$149/)).toBeInTheDocument()
    })

    test('should NOT show extras for Expansão with 3 properties', () => {
      render(<BillingPreview orgId="org-123" />)

      expect(screen.queryByText(/propriedades extras/i)).not.toBeInTheDocument()
    })

    test('should show R$149/month for base', () => {
      render(<BillingPreview orgId="org-123" />)

      expect(screen.getByText(/R\$149/)).toBeInTheDocument()
    })
  })

  describe('Expansão plan with extras', () => {
    beforeEach(() => {
      ;(useBillingPreview as jest.Mock).mockReturnValue({
        subscription: { plan: 'expansao', status: 'active' },
        propertyCount: 5,
        loading: false,
        error: null,
      })
    })

    test('should calculate extras for Expansão', () => {
      render(<BillingPreview orgId="org-123" />)

      // 5 total, 3 included = 2 extras
      expect(screen.getByText(/2 × R\$49/)).toBeInTheDocument()
    })

    test('should show correct total', () => {
      render(<BillingPreview orgId="org-123" />)

      // Base: R$149 + extras: 2 × R$49 = R$247
      expect(screen.getByText(/R\$247/)).toBeInTheDocument()
    })

    test('should show upgrade suggestion to Premium', () => {
      render(<BillingPreview orgId="org-123" />)

      expect(screen.getByText(/plano premium inclui 10/i)).toBeInTheDocument()
    })
  })

  describe('Premium plan (10 included, unlimited extras)', () => {
    beforeEach(() => {
      ;(useBillingPreview as jest.Mock).mockReturnValue({
        subscription: { plan: 'premium', status: 'active' },
        propertyCount: 10,
        loading: false,
        error: null,
      })
    })

    test('should display Premium plan', () => {
      render(<BillingPreview orgId="org-123" />)

      expect(screen.getByText(/premium/i)).toBeInTheDocument()
      expect(screen.getByText(/R\$397/)).toBeInTheDocument()
    })

    test('should NOT show extras for Premium with 10 properties', () => {
      render(<BillingPreview orgId="org-123" />)

      expect(screen.queryByText(/propriedades extras/i)).not.toBeInTheDocument()
    })
  })

  describe('Premium plan with extras', () => {
    beforeEach(() => {
      ;(useBillingPreview as jest.Mock).mockReturnValue({
        subscription: { plan: 'premium', status: 'active' },
        propertyCount: 15,
        loading: false,
        error: null,
      })
    })

    test('should calculate extras for Premium', () => {
      render(<BillingPreview orgId="org-123" />)

      // 15 total, 10 included = 5 extras
      expect(screen.getByText(/5 × R\$49/)).toBeInTheDocument()
    })

    test('should show correct total with many extras', () => {
      render(<BillingPreview orgId="org-123" />)

      // Base: R$397 + extras: 5 × R$49 = R$642
      expect(screen.getByText(/R\$642/)).toBeInTheDocument()
    })
  })

  describe('Error handling', () => {
    test('should show error message on failure', () => {
      ;(useBillingPreview as jest.Mock).mockReturnValue({
        subscription: null,
        propertyCount: 0,
        loading: false,
        error: 'Failed to fetch subscription',
      })

      render(<BillingPreview orgId="org-123" />)

      expect(screen.getByText(/failed to fetch/i)).toBeInTheDocument()
    })

    test('should show unknown plan error', () => {
      ;(useBillingPreview as jest.Mock).mockReturnValue({
        subscription: { plan: 'unknown-plan', status: 'active' },
        propertyCount: 1,
        loading: false,
        error: null,
      })

      render(<BillingPreview orgId="org-123" />)

      expect(screen.getByText(/unknown plan/i)).toBeInTheDocument()
    })
  })

  describe('Action buttons', () => {
    test('should call onAddExtraProperty when button clicked', () => {
      const onAddExtra = jest.fn()
      ;(useBillingPreview as jest.Mock).mockReturnValue({
        subscription: { plan: 'premium', status: 'active' },
        propertyCount: 5,
        loading: false,
        error: null,
      })

      render(<BillingPreview orgId="org-123" onAddExtraProperty={onAddExtra} />)

      const button = screen.getByText(/adicionar propriedade extra/i)
      expect(button).toBeInTheDocument()
    })

    test('should call onManagePlan when button clicked', () => {
      const onManagePlan = jest.fn()
      ;(useBillingPreview as jest.Mock).mockReturnValue({
        subscription: { plan: 'essencial', status: 'active' },
        propertyCount: 1,
        loading: false,
        error: null,
      })

      render(<BillingPreview orgId="org-123" onManagePlan={onManagePlan} />)

      const button = screen.getByText(/gerenciar plano/i)
      expect(button).toBeInTheDocument()
    })
  })
})
