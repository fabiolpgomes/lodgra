import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { UpgradeModal } from '@/components/billing/UpgradeModal'

describe('UpgradeModal Component', () => {
  const defaultProps = {
    isOpen: true,
    currentPlan: 'essencial' as const,
    onClose: jest.fn(),
    onAddExtra: jest.fn(),
    onUpgrade: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Visibility', () => {
    test('should not render when isOpen is false', () => {
      const { container } = render(
        <UpgradeModal {...defaultProps} isOpen={false} />
      )
      expect(container.firstChild).toBeEmptyDOMElement()
    })

    test('should render when isOpen is true', () => {
      render(<UpgradeModal {...defaultProps} />)
      expect(screen.getByText(/desbloquear/i)).toBeInTheDocument()
    })
  })

  describe('Modal Content - Feature Blocked', () => {
    test('should display feature name when feature is provided', () => {
      render(
        <UpgradeModal
          {...defaultProps}
          feature="cleaner_portal"
          reason="feature_blocked"
        />
      )
      expect(screen.getByText(/cleaner portal/i)).toBeInTheDocument()
    })

    test('should display property limit message when reason is property_limit', () => {
      render(
        <UpgradeModal
          {...defaultProps}
          reason="property_limit"
          onClose={jest.fn()}
        />
      )
      expect(screen.getByText(/limite de propriedades/i)).toBeInTheDocument()
    })
  })

  describe('Buttons - Essencial Plan', () => {
    test('should show both Add Extra and Upgrade buttons for Essencial', () => {
      render(
        <UpgradeModal
          {...defaultProps}
          currentPlan="essencial"
          feature="cleaner_portal"
        />
      )
      expect(
        screen.getByText(/adicionar unidade extra/i)
      ).toBeInTheDocument()
      expect(screen.getByText(/fazer upgrade para expansão/i)).toBeInTheDocument()
    })

    test('should call onAddExtra when Add Extra button is clicked', () => {
      const onAddExtra = jest.fn()
      render(
        <UpgradeModal
          {...defaultProps}
          currentPlan="essencial"
          onAddExtra={onAddExtra}
        />
      )

      const addExtraBtn = screen.getByText(/adicionar unidade extra/i)
      fireEvent.click(addExtraBtn)

      expect(onAddExtra).toHaveBeenCalled()
    })

    test('should call onUpgrade with expansao when Upgrade button is clicked', () => {
      const onUpgrade = jest.fn()
      render(
        <UpgradeModal
          {...defaultProps}
          currentPlan="essencial"
          onUpgrade={onUpgrade}
        />
      )

      const upgradeBtn = screen.getByText(/fazer upgrade para expansão/i)
      fireEvent.click(upgradeBtn)

      expect(onUpgrade).toHaveBeenCalledWith('expansao')
    })
  })

  describe('Buttons - Expansão Plan', () => {
    test('should show both buttons for Expansão (upgrade to Premium)', () => {
      render(
        <UpgradeModal
          {...defaultProps}
          currentPlan="expansao"
          feature="api_access"
        />
      )
      expect(
        screen.getByText(/adicionar unidade extra/i)
      ).toBeInTheDocument()
      expect(screen.getByText(/fazer upgrade para premium/i)).toBeInTheDocument()
    })

    test('should call onUpgrade with premium when Upgrade button is clicked', () => {
      const onUpgrade = jest.fn()
      render(
        <UpgradeModal
          {...defaultProps}
          currentPlan="expansao"
          onUpgrade={onUpgrade}
        />
      )

      const upgradeBtn = screen.getByText(/fazer upgrade para premium/i)
      fireEvent.click(upgradeBtn)

      expect(onUpgrade).toHaveBeenCalledWith('premium')
    })
  })

  describe('Buttons - Premium Plan', () => {
    test('should NOT show Add Extra button for Premium (no upgrades available)', () => {
      render(
        <UpgradeModal
          {...defaultProps}
          currentPlan="premium"
          feature="forecast_bi"
        />
      )
      expect(
        screen.queryByText(/adicionar unidade extra/i)
      ).not.toBeInTheDocument()
    })

    test('should show Upgrade button for Premium (stays Premium)', () => {
      render(
        <UpgradeModal
          {...defaultProps}
          currentPlan="premium"
          feature="forecast_bi"
        />
      )
      expect(screen.getByText(/fazer upgrade para premium/i)).toBeInTheDocument()
    })
  })

  describe('Close Button', () => {
    test('should call onClose when X button is clicked', () => {
      const onClose = jest.fn()
      render(<UpgradeModal {...defaultProps} onClose={onClose} />)

      const closeBtn = screen.getByLabelText(/fechar modal/i)
      fireEvent.click(closeBtn)

      expect(onClose).toHaveBeenCalled()
    })

    test('should call onClose when "Talvez depois" button is clicked', () => {
      const onClose = jest.fn()
      render(<UpgradeModal {...defaultProps} onClose={onClose} />)

      const dismissBtn = screen.getByText(/talvez depois/i)
      fireEvent.click(dismissBtn)

      expect(onClose).toHaveBeenCalled()
    })
  })

  describe('Price Display', () => {
    test('should show correct prices for each plan', () => {
      const { rerender } = render(
        <UpgradeModal {...defaultProps} currentPlan="essencial" />
      )

      expect(screen.getByText('R$149')).toBeInTheDocument() // Expansão price

      rerender(
        <UpgradeModal {...defaultProps} currentPlan="expansao" />
      )

      expect(screen.getByText('R$397')).toBeInTheDocument() // Premium price
    })
  })

  describe('Feature Name Formatting', () => {
    test('should format feature names correctly', () => {
      render(
        <UpgradeModal
          {...defaultProps}
          feature="advanced_reports"
          reason="feature_blocked"
        />
      )
      expect(screen.getByText(/advanced reports/i)).toBeInTheDocument()
    })

    test('should handle missing feature name gracefully', () => {
      render(
        <UpgradeModal
          {...defaultProps}
          reason="property_limit"
        />
      )
      expect(screen.getByText(/limite de propriedades/i)).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    test('should have proper ARIA labels', () => {
      render(<UpgradeModal {...defaultProps} />)

      expect(screen.getByLabelText(/fechar modal/i)).toBeInTheDocument()
    })

    test('should have proper button roles', () => {
      render(
        <UpgradeModal
          {...defaultProps}
          currentPlan="essencial"
          feature="cleaner_portal"
        />
      )

      const addExtraBtn = screen.getByText(/adicionar unidade extra/i)
      const upgradeBtn = screen.getByText(/fazer upgrade para expansão/i)

      expect(addExtraBtn).toHaveRole('button')
      expect(upgradeBtn).toHaveRole('button')
    })
  })
})
