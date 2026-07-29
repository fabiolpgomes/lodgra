import { render, screen } from '@testing-library/react'
import { GuestTierCard } from '@/components/loyalty/GuestTierCard'

describe('GuestTierCard - Story 41.4', () => {
  const mockBronzeTier = {
    tier_name: 'Bronze' as const,
    base_discount_percent: 0,
    perks: [
      'Boas-vindas a nosso programa de lealdade',
      'Acesso a ofertas semanais',
      'Suporte ao cliente padrão',
    ],
  }

  const mockSilverTier = {
    tier_name: 'Silver' as const,
    base_discount_percent: 5,
    perks: [
      'Desconto de 5% em todas as reservas',
      'Acesso prioritário a novas propriedades',
      'Suporte ao cliente prioritário',
    ],
  }

  const mockGoldTier = {
    tier_name: 'Gold' as const,
    base_discount_percent: 10,
    perks: [
      'Desconto de 10% em todas as reservas',
      'Check-in antecipado gratuito',
      'Upgrade de acomodação (sujeito à disponibilidade)',
    ],
  }

  const mockPlatinumTier = {
    tier_name: 'Platinum' as const,
    base_discount_percent: 15,
    perks: [
      'Desconto de 15% em todas as reservas',
      'Check-in antecipado e check-out tardio gratuito',
      'Upgrade de acomodação garantido',
    ],
  }

  it('should render Bronze tier card', () => {
    render(
      <GuestTierCard
        loyalty_score={15}
        current_tier={mockBronzeTier}
        next_tier={mockSilverTier}
        points_to_next={11}
      />
    )

    expect(screen.getByText('Bronze')).toBeInTheDocument()
    expect(screen.getByText('0% discount')).toBeInTheDocument()
    expect(screen.getByText('15/100')).toBeInTheDocument()
  })

  it('should render Silver tier card', () => {
    render(
      <GuestTierCard
        loyalty_score={35}
        current_tier={mockSilverTier}
        next_tier={mockGoldTier}
        points_to_next={16}
      />
    )

    expect(screen.getByText('Silver')).toBeInTheDocument()
    expect(screen.getByText('5% discount')).toBeInTheDocument()
    expect(screen.getByText('35/100')).toBeInTheDocument()
  })

  it('should render Gold tier card', () => {
    render(
      <GuestTierCard
        loyalty_score={65}
        current_tier={mockGoldTier}
        next_tier={mockPlatinumTier}
        points_to_next={11}
      />
    )

    expect(screen.getByText('Gold')).toBeInTheDocument()
    expect(screen.getByText(/10% discount/)).toBeInTheDocument()
    expect(screen.getByText('65/100')).toBeInTheDocument()
  })

  it('should render Platinum tier card', () => {
    render(
      <GuestTierCard
        loyalty_score={100}
        current_tier={mockPlatinumTier}
        next_tier={null}
        points_to_next={0}
      />
    )

    expect(screen.getByText('Platinum')).toBeInTheDocument()
    expect(screen.getByText('15% discount')).toBeInTheDocument()
    expect(screen.getByText('100/100')).toBeInTheDocument()
  })

  it('should display correct progress bar with aria attributes', () => {
    const { container } = render(
      <GuestTierCard
        loyalty_score={50}
        current_tier={mockGoldTier}
        next_tier={mockPlatinumTier}
        points_to_next={26}
      />
    )

    const progressBar = container.querySelector('[role="progressbar"]')
    expect(progressBar).toBeInTheDocument()
    expect(progressBar).toHaveAttribute('aria-valuenow', '50')
  })

  it('should display singular "stay" message for 1 point to next tier', () => {
    const { container } = render(
      <GuestTierCard
        loyalty_score={25}
        current_tier={mockBronzeTier}
        next_tier={mockSilverTier}
        points_to_next={1}
      />
    )

    const unlockBox = container.querySelector('div[class*="bg-blue-50"]')
    expect(unlockBox).toHaveTextContent('1 more stay to unlock')
  })

  it('should display plural "stays" message for multiple points', () => {
    const { container } = render(
      <GuestTierCard
        loyalty_score={15}
        current_tier={mockBronzeTier}
        next_tier={mockSilverTier}
        points_to_next={11}
      />
    )

    const unlockBox = container.querySelector('div[class*="bg-blue-50"]')
    expect(unlockBox).toHaveTextContent('11 more stays to unlock')
  })

  it('should show highest tier message when at Platinum', () => {
    const { container } = render(
      <GuestTierCard
        loyalty_score={100}
        current_tier={mockPlatinumTier}
        next_tier={null}
        points_to_next={0}
      />
    )

    const unlockBox = container.querySelector('div[class*="bg-blue-50"]')
    expect(unlockBox).toHaveTextContent('You have reached the highest tier')
  })

  it('should display all tier perks', () => {
    render(
      <GuestTierCard
        loyalty_score={35}
        current_tier={mockSilverTier}
        next_tier={mockGoldTier}
        points_to_next={16}
      />
    )

    mockSilverTier.perks.forEach((perk) => {
      expect(screen.getByText(perk)).toBeInTheDocument()
    })
  })

  it('should show loading message when loading is true', () => {
    render(
      <GuestTierCard
        loyalty_score={0}
        current_tier={mockBronzeTier}
        loading={true}
      />
    )

    expect(screen.getByText('Loading tier information...')).toBeInTheDocument()
  })

  it('should have proper accessibility attributes', () => {
    const { container } = render(
      <GuestTierCard
        loyalty_score={50}
        current_tier={mockGoldTier}
        next_tier={mockPlatinumTier}
        points_to_next={26}
      />
    )

    const srOnly = container.querySelector('.sr-only')
    expect(srOnly).toBeInTheDocument()
    expect(srOnly).toHaveTextContent(/Gold member/)
  })

  it('should handle zero loyalty score', () => {
    render(
      <GuestTierCard
        loyalty_score={0}
        current_tier={mockBronzeTier}
        next_tier={mockSilverTier}
        points_to_next={26}
      />
    )

    expect(screen.getByText('0/100')).toBeInTheDocument()
  })

  it('should handle maximum loyalty score', () => {
    render(
      <GuestTierCard
        loyalty_score={100}
        current_tier={mockPlatinumTier}
        next_tier={null}
        points_to_next={0}
      />
    )

    expect(screen.getByText('100/100')).toBeInTheDocument()
  })
})
