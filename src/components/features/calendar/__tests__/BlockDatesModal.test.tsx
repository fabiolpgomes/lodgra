import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BlockDatesModal } from '../BlockDatesModal'
import { toast } from 'sonner'

jest.mock('sonner', () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
  },
}))

describe('BlockDatesModal', () => {
  const mockOnClose = jest.fn()
  const mockOnSuccess = jest.fn()
  const mockProperties = [
    { id: '1', name: 'Property 1' },
    { id: '2', name: 'Property 2' },
  ]

  beforeEach(() => {
    jest.clearAllMocks()
    global.fetch = jest.fn()
  })

  it('should render with date format dd.mm.yyyy', () => {
    render(
      <BlockDatesModal
        checkIn="2026-12-19"
        checkOut="2026-12-20"
        properties={mockProperties}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    )

    const checkInInput = screen.getByDisplayValue('19.12.2026')
    const checkOutInput = screen.getByDisplayValue('20.12.2026')

    expect(checkInInput).toBeInTheDocument()
    expect(checkOutInput).toBeInTheDocument()
  })

  it('should allow editing dates', () => {
    render(
      <BlockDatesModal
        checkIn="2026-12-19"
        checkOut="2026-12-20"
        properties={mockProperties}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    )

    const checkInInput = screen.getByDisplayValue('19.12.2026') as HTMLInputElement
    const checkOutInput = screen.getByDisplayValue('20.12.2026') as HTMLInputElement

    expect(checkInInput.disabled).toBe(false)
    expect(checkOutInput.disabled).toBe(false)

    fireEvent.change(checkInInput, { target: { value: '20.12.2026' } })
    expect(checkInInput.value).toBe('20.12.2026')

    fireEvent.change(checkOutInput, { target: { value: '21.12.2026' } })
    expect(checkOutInput.value).toBe('21.12.2026')
  })

  it('should have placeholder dd.mm.yyyy', () => {
    render(
      <BlockDatesModal
        checkIn="2026-12-19"
        checkOut="2026-12-20"
        properties={mockProperties}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    )

    const inputs = screen.getAllByPlaceholderText('dd.mm.yyyy')
    expect(inputs).toHaveLength(2)
  })

  it('should have maxLength of 10 for date inputs', () => {
    render(
      <BlockDatesModal
        checkIn="2026-12-19"
        checkOut="2026-12-20"
        properties={mockProperties}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    )

    const inputs = screen.getAllByPlaceholderText('dd.mm.yyyy')
    inputs.forEach((input) => {
      expect(input).toHaveAttribute('maxLength', '10')
    })
  })

  it('should convert dates to yyyy-mm-dd format when submitting', async () => {
    const mockFetch = global.fetch as jest.Mock
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    })

    render(
      <BlockDatesModal
        checkIn="2026-12-19"
        checkOut="2026-12-20"
        properties={mockProperties}
        selectedPropertyId="1"
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    )

    const submitButton = screen.getByRole('button', { name: /Bloquear Datas/i })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/calendar/blocks',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"start_date":"2026-12-19"'),
        })
      )
    })
  })

  it('should show error if dates are empty', async () => {
    render(
      <BlockDatesModal
        checkIn="2026-12-19"
        checkOut="2026-12-20"
        properties={mockProperties}
        selectedPropertyId="1"
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    )

    const checkInInput = screen.getByDisplayValue('19.12.2026')
    const checkOutInput = screen.getByDisplayValue('20.12.2026')

    fireEvent.change(checkInInput, { target: { value: '' } })
    fireEvent.change(checkOutInput, { target: { value: '' } })

    const submitButton = screen.getByRole('button', { name: /Bloquear Datas/i })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        expect.stringContaining('Preencha as datas')
      )
    })
  })
})
