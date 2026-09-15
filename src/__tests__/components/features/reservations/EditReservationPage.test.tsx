import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import EditReservationPage from '@/app/[locale]/reservations/[id]/edit/page'

const mockPush = jest.fn()
const mockUpdate = jest.fn()
const mockFrom = jest.fn()
jest.mock('@/lib/i18n/routing', () => ({ useRouter: () => ({ push: mockPush, refresh: jest.fn() }), useLocale: () => 'pt' }))
jest.mock('@/lib/supabase/client', () => ({ createClient: () => ({ from: mockFrom }) }))
jest.mock('@/components/common/layout/AuthLayout', () => ({ AuthLayout: ({ children }: { children: React.ReactNode }) => <>{children}</> }))
jest.mock('@/components/features/reservations/ReservationFinancialFacts', () => ({ ReservationFinancialFacts: () => <section>Informação financeira</section> }))
jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }))

describe('EditReservationPage canonical guest fields', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUpdate.mockReturnValue({ eq: jest.fn().mockResolvedValue({ error: null }) })
    mockFrom.mockImplementation((table: string) => {
      if (table === 'reservations') return {
        select: (selection: string) => ({ eq: () => ({ single: async () => /\bguests\s*\(/.test(selection)
          ? { data: null, error: { code: 'PGRST200' } }
          : { data: { id: 'reservation-1', property_id: 'property-1', property_listing_id: null, guest_name: 'Ana Maria Silva', guest_email: 'guest@example.test', guest_phone: '+351900000000', check_in: '2026-09-15', check_out: '2026-09-18', currency: 'EUR' }, error: null } }) }),
        update: mockUpdate,
      }
      if (table === 'properties') return { select: () => ({ eq: () => ({ order: async () => ({ data: [{ id: 'property-1', name: 'Propriedade teste', currency: 'EUR' }] }) }) }) }
      if (table === 'property_listings') return { select: () => ({ eq: () => ({ eq: async () => ({ data: [] }) }) }) }
      throw new Error(`Unexpected table: ${table}`)
    })
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ available: true }) })
  })

  it('abre sem relação guests e salva os dados canônicos sem sobrescrever valores financeiros', async () => {
    render(<EditReservationPage params={Promise.resolve({ id: 'reservation-1' })} />)
    expect(await screen.findByText('Informação financeira')).toBeInTheDocument()
    expect(screen.getByLabelText('Nome *')).toHaveValue('Ana')
    expect(screen.getByLabelText('Sobrenome')).toHaveValue('Maria Silva')
    expect(screen.getByLabelText('Email *')).toHaveValue('guest@example.test')
    expect(screen.getByLabelText('Telefone')).toHaveValue('+351900000000')
    fireEvent.change(screen.getByLabelText('Nome *'), { target: { value: 'Joana' } })
    fireEvent.submit(screen.getByRole('button', { name: 'Salvar Alterações' }).closest('form')!)
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/reservations/reservation-1'))
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ guest_name: 'Joana Maria Silva', guest_email: 'guest@example.test', guest_phone: '+351900000000' }))
    expect(mockUpdate.mock.calls[0][0]).not.toHaveProperty('total_amount')
    expect(mockUpdate.mock.calls[0][0]).not.toHaveProperty('total_price')
    expect(mockFrom).not.toHaveBeenCalledWith('guests')
  })

  it('permite salvar um nome único sem exigir ou inventar sobrenome', async () => {
    render(<EditReservationPage params={Promise.resolve({ id: 'reservation-1' })} />)
    await screen.findByText('Informação financeira')
    const surname = screen.getByLabelText('Sobrenome') as HTMLInputElement
    fireEvent.change(surname, { target: { value: '' } })
    expect(surname).not.toBeRequired()
    expect(surname.checkValidity()).toBe(true)
    fireEvent.submit(screen.getByRole('button', { name: 'Salvar Alterações' }).closest('form')!)
    await waitFor(() => expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ guest_name: 'Ana' })))
  })
})
