import { render, screen } from '@testing-library/react'
import { Button } from '../Button'

describe('Button', () => {
  it('renders button with text', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument()
  })

  it('applies primary variant by default', () => {
    const { container } = render(<Button>Primary</Button>)
    const button = container.querySelector('button')
    expect(button).toHaveClass('bg-lodgra-primary')
  })

  it('applies secondary variant', () => {
    const { container } = render(<Button variant="secondary">Secondary</Button>)
    const button = container.querySelector('button')
    expect(button).toHaveClass('bg-lodgra-accent')
  })

  it('applies size variants', () => {
    const { container: smallContainer } = render(<Button size="sm">Small</Button>)
    const { container: largeContainer } = render(<Button size="lg">Large</Button>)

    expect(smallContainer.querySelector('button')).toHaveClass('text-design-xs')
    expect(largeContainer.querySelector('button')).toHaveClass('text-design-base')
  })

  it('disables button when disabled prop is true', () => {
    render(<Button disabled>Disabled</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('shows loading state', () => {
    render(<Button isLoading>Loading</Button>)
    expect(screen.getByText(/a processar/i)).toBeInTheDocument()
    expect(screen.getByRole('button')).toBeDisabled()
  })
})
