import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { ReservationFinancialFacts } from '@/components/features/reservations/ReservationFinancialFacts'

const response = {
  reservation: { source: 'ical_import', currency: 'EUR', declaredOwnerBaseAllowed: true, compatibility: 'legacy_not_synced' },
  currentSnapshot: null,
  defaults: { managerCleaningCostDefaultAmount: '90.00', managerCleaningCostMode: 'per_stay' },
}

describe('ReservationFinancialFacts', () => {
  beforeEach(() => {
    global.fetch = jest.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => response })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ...response, currentSnapshot: { version: 1, factMode: 'declared_owner_base', status: 'complete', capturedAt: '2026-09-11T10:00:00.000Z', declaredOwnerBaseAmount: '410.00' } }) }) as jest.Mock
  })

  it('prioriza o modo simplificado, aplica sugestão revisável e exige confirmação', async () => {
    render(<ReservationFinancialFacts reservationId="6ea55539-02d4-4f8b-a0ef-984789d7504b" currency="EUR" />)
    expect(await screen.findByText('Informação financeira')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Valor líquido da plataforma'), { target: { value: '500' } })
    expect(screen.getByLabelText('Custo de limpeza da gestora')).toHaveValue(90)
    await waitFor(() => expect(screen.getByLabelText('Valor base para repasse (EUR)')).toHaveValue(410))
    fireEvent.click(screen.getByRole('button', { name: 'Guardar informação financeira' }))
    expect(await screen.findByText(/Confirme explicitamente/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('checkbox'))
    fireEvent.click(screen.getByRole('button', { name: 'Guardar informação financeira' }))
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2))
    const body = JSON.parse((global.fetch as jest.Mock).mock.calls[1][1].body)
    expect(body).toMatchObject({ factMode: 'declared_owner_base', declaredOwnerBaseAmount: '410.00', expectedCurrentVersion: null })
  })

  it('mantém o modo detalhado disponível quando o contrato não permite valor declarado', async () => {
    ;(global.fetch as jest.Mock).mockReset().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        ...response,
        reservation: { ...response.reservation, declaredOwnerBaseAllowed: false },
        defaults: { managerCleaningCostDefaultAmount: '10.00', managerCleaningCostMode: 'per_night' },
      }),
    })

    render(<ReservationFinancialFacts reservationId="6ea55539-02d4-4f8b-a0ef-984789d7504b" currency="EUR" />)
    expect(await screen.findByText('Evidência: Componentes reconciliados')).toBeInTheDocument()
    expect(screen.getByText(/contrato de repasse vigente ainda não autoriza/)).toBeInTheDocument()
    expect(screen.getByText(/custo padrão de limpeza é por noite/)).toBeInTheDocument()
    expect(screen.getByLabelText('Valor bruto da hospedagem')).toBeInTheDocument()
    expect(screen.getByLabelText('Ajuste de preço da plataforma')).toBeInTheDocument()
  })

  it('não envia uma base vazia confirmada e aceita zero explícito', async () => {
    render(<ReservationFinancialFacts reservationId="empty-base" currency="EUR" />)
    await screen.findByText('Informação financeira')
    fireEvent.click(screen.getByRole('checkbox'))
    fireEvent.click(screen.getByRole('button', { name: 'Guardar informação financeira' }))
    expect(await screen.findByText('Informe o valor base para repasse antes de salvar.')).toBeInTheDocument()
    expect(global.fetch).toHaveBeenCalledTimes(1)
    fireEvent.change(screen.getByLabelText('Valor base para repasse (EUR)'), { target: { value: '0' } })
    fireEvent.click(screen.getByRole('checkbox'))
    fireEvent.click(screen.getByRole('button', { name: 'Guardar informação financeira' }))
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2))
    expect(JSON.parse((global.fetch as jest.Mock).mock.calls[1][1].body).declaredOwnerBaseAmount).toBe('0')
  })

  it('preserva a base persistida ao carregar sugestões de limpeza e reenviar com confirmação', async () => {
    const persisted = { ...response, currentSnapshot: { version: 3, factMode: 'declared_owner_base', status: 'complete', capturedAt: '2026-09-11T10:00:00.000Z', declaredOwnerBaseAmount: '410.00' } }
    ;(global.fetch as jest.Mock).mockReset().mockResolvedValue({ ok: true, json: async () => persisted })
    render(<ReservationFinancialFacts reservationId="existing" currency="EUR" />)
    await screen.findByText('Informação financeira')
    expect(screen.getByLabelText('Custo de limpeza da gestora')).toHaveValue(90)
    expect(screen.getByLabelText('Valor líquido da plataforma')).toHaveValue(null)
    expect(screen.getByLabelText('Valor base para repasse (EUR)')).toHaveValue(410)
    fireEvent.click(screen.getByRole('checkbox'))
    fireEvent.click(screen.getByRole('button', { name: 'Guardar informação financeira' }))
    await screen.findByText('Informação financeira guardada com versão e autoria.')
    expect(JSON.parse((global.fetch as jest.Mock).mock.calls[1][1].body)).toMatchObject({ declaredOwnerBaseAmount: '410.00', expectedCurrentVersion: 3 })
  })

  it('exige os dois insumos do cálculo assistido e aceita limpeza zero explícita', async () => {
    ;(global.fetch as jest.Mock).mockReset().mockResolvedValue({ ok: true, json: async () => ({ ...response, defaults: null }) })
    render(<ReservationFinancialFacts reservationId="missing-default" currency="EUR" />)
    await screen.findByText('Informação financeira')
    fireEvent.change(screen.getByLabelText('Valor líquido da plataforma'), { target: { value: '500' } })
    expect(screen.getByLabelText('Valor base para repasse (EUR)')).toHaveValue(null)
    fireEvent.change(screen.getByLabelText('Custo de limpeza da gestora'), { target: { value: '0' } })
    expect(screen.getByLabelText('Valor base para repasse (EUR)')).toHaveValue(500)
    fireEvent.click(screen.getByRole('checkbox'))
    fireEvent.change(screen.getByLabelText('Custo de limpeza da gestora'), { target: { value: '' } })
    expect(screen.getByLabelText('Valor base para repasse (EUR)')).toHaveValue(null)
    expect(screen.getByRole('checkbox')).not.toBeChecked()
  })
})
