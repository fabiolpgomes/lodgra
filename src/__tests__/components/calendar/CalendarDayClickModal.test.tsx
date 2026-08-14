import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { CalendarDayClickModal } from '@/components/calendar/CalendarDayClickModal'

jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}))

describe('CalendarDayClickModal', () => {
  it('accepts comma decimals and saves the nightly price from the improved price form', async () => {
    const onSavePrice = jest.fn().mockResolvedValue(undefined)

    render(
      <CalendarDayClickModal
        isOpen
        dates={{
          start: new Date(2026, 9, 1),
          end: new Date(2026, 9, 3),
        }}
        propertyId="property-1"
        onClose={jest.fn()}
        onSavePrice={onSavePrice}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /Definir Preço/ }))

    const input = screen.getByLabelText('Preço por noite')
    expect(input).toHaveAttribute('inputmode', 'decimal')

    fireEvent.change(input, { target: { value: '125,50' } })
    expect(screen.getByText(/251,00/)).toBeInTheDocument()

    fireEvent.submit(input.closest('form')!)

    await waitFor(() => expect(onSavePrice).toHaveBeenCalledWith(125.5))
  })

  it('keeps save disabled until a positive price is entered', () => {
    render(
      <CalendarDayClickModal
        isOpen
        dates={new Date(2026, 9, 1)}
        propertyId="property-1"
        onClose={jest.fn()}
        onSavePrice={jest.fn()}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /Definir Preço/ }))
    expect(screen.getByRole('button', { name: 'Salvar Preço' })).toBeDisabled()
  })
})
