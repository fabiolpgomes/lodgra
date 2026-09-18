import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { PropertyPayoutContract } from '@/components/features/properties/PropertyPayoutContract'

const propertyId = '6ea55539-02d4-4f8b-a0ef-984789d7504b'
const organizationId = '2f58be8a-9f03-4b8a-aa30-d8428ed25c80'
const currentRule = {
  contractVersion: 1 as const,
  id: '9ce5220c-192d-4c9e-915c-99a641d82bac',
  organizationId,
  propriedadeId: propertyId,
  vigenciaInicio: '2026-01-01',
  vigenciaFim: null,
  tipoComissao: 'percentual',
  comissaoValor: '20.0000',
  baseComissao: 'faturamento_propriedade',
  taxaLimpezaPara: 'gestor',
  comissaoOtaPorConta: 'proprietario',
  despesasRepassaveis: true,
  diaFechamento: 5,
  observacoes: 'Contrato vigente',
  createdAt: '2026-01-01T00:00:00.000Z',
} as const

const rulesResponse = {
  requestId: 'req_rules',
  property: { id: propertyId, name: 'Casa Azul', currency: 'EUR' },
  defaults: {
    preset: 'net_received' as const,
    competenciaReceita: 'check_out' as const,
    fluxoFinanceiro: 'manager_trust' as const,
    destinatarioLimpeza: 'manager' as const,
    destinatarioImpostoMunicipal: 'municipality' as const,
  },
  currentRule,
  history: [
    currentRule,
    { ...currentRule, id: 'a4df0447-d966-43d5-8c14-223b83b00fa7', vigenciaInicio: '2025-01-01', vigenciaFim: '2025-12-31' },
  ],
}

const line = (codigo: string, valorMinor: number) => ({ codigo, valorMinor, reservaIds: [], despesaIds: [], regraId: currentRule.id })
const previewResponse = {
  requestId: 'req_preview',
  periodo: { month: '2026-08', inicio: '2026-08-01', fim: '2026-08-31' },
  ruleRef: { kind: 'persisted', id: currentRule.id },
  dataQuality: { status: 'complete', issues: [] },
  result: {
    organizationId,
    propriedadeId: propertyId,
    currency: 'EUR',
    periodo: { inicio: '2026-08-01', fim: '2026-08-31' },
    regraId: currentRule.id,
    comissaoOtaTotalMinor: 0,
    linhas: {
      receita_bruta: line('receita_bruta', 0),
      taxas_servico: line('taxas_servico', 0),
      comissao_ota: line('comissao_ota', 0),
      descontos: line('descontos', 0),
      faturamento_propriedade: line('faturamento_propriedade', 0),
      comissao_gestao: line('comissao_gestao', 0),
      taxa_limpeza_retida: line('taxa_limpeza_retida', 0),
      despesas_propriedade: line('despesas_propriedade', 0),
      repasse_proprietario: line('repasse_proprietario', 0),
    },
  },
}

function response(body: unknown, status = 200): Promise<Response> {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(body),
  } as Response)
}

describe('PropertyPayoutContract', () => {
  beforeEach(() => {
    jest.useFakeTimers({ now: new Date('2026-09-08T12:00:00.000Z') })
    global.fetch = jest.fn()
  })

  afterEach(() => {
    jest.useRealTimers()
    jest.restoreAllMocks()
  })

  function mockInitialLoad(previewBody: unknown = previewResponse, previewStatus = 200) {
    ;(global.fetch as jest.Mock)
      .mockImplementationOnce(() => response(rulesResponse))
      .mockImplementationOnce(() => response(previewBody, previewStatus))
  }

  it('apresenta erro estável quando o servidor retorna corpo inválido', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () => '<html>erro</html>',
    } as Response)

    render(<PropertyPayoutContract propertyId={propertyId} canEdit />)

    expect(await screen.findByText('Resposta inválida do servidor.')).toBeInTheDocument()
  })

  it('renders current rule, detailed preview and responsive history in semantic order', async () => {
    mockInitialLoad()
    const { container } = render(<PropertyPayoutContract propertyId={propertyId} canEdit />)
    expect(await screen.findByRole('heading', { name: 'Regra vigente' })).toBeInTheDocument()
    expect(await screen.findByText(/Repasse ao proprietário \(cálculo legado\)/)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Nova versão da política' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Histórico' })).toBeInTheDocument()
    const headings = Array.from(container.querySelectorAll('h3')).map(element => element.textContent)
    expect(headings).toEqual(['Regra vigente', 'Preview de 2026-08', 'Nova versão da política', 'Histórico'])
    expect(container.querySelector('table')).not.toBeInTheDocument()
  })

  it('hides editing and preview execution from a read-only role', async () => {
    ;(global.fetch as jest.Mock).mockImplementationOnce(() => response(rulesResponse))
    render(<PropertyPayoutContract propertyId={propertyId} canEdit={false} />)
    expect(await screen.findByText(/preview está disponível/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Criar nova versão' })).not.toBeInTheDocument()
    expect(global.fetch).toHaveBeenCalledTimes(1)
  })

  it('creates the first policy with explicit expected absence and no preview before persistence', async () => {
    const emptyRules = { ...rulesResponse, currentRule: null, history: [] }
    const firstRule = {
      ...currentRule,
      contractVersion: 2 as const,
      id: '4bb5baa8-c58f-4279-98b7-cafdb7f74b8a',
      vigenciaInicio: '2026-09-08',
      impostoComissaoPercentual: '0',
      competenciaReceita: 'check_out' as const,
      fluxoFinanceiro: 'manager_trust' as const,
      preset: 'net_received' as const,
      componentes: [],
    }
    ;(global.fetch as jest.Mock)
      .mockImplementationOnce(() => response(emptyRules))
      .mockImplementationOnce(() => response({ requestId: 'req_save', previousRule: null, currentRule: firstRule }, 201))
      .mockImplementationOnce(() => response({ ...rulesResponse, currentRule: firstRule, history: [firstRule] }))
      .mockImplementationOnce(() => response({ ...previewResponse, ruleRef: { kind: 'persisted', id: firstRule.id } }))

    render(<PropertyPayoutContract propertyId={propertyId} canEdit />)
    expect(await screen.findByText(/Nenhuma regra foi cadastrada/i)).toBeInTheDocument()
    expect(screen.getByText(/preview ficará disponível/i)).toBeInTheDocument()
    expect(global.fetch).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: 'Configurar primeira política' }))
    fireEvent.change(screen.getByLabelText('Percentual da comissão'), { target: { value: '20' } })
    fireEvent.change(screen.getByLabelText(/Imposto sobre a comissão/i), { target: { value: '0' } })
    fireEvent.change(screen.getByLabelText('Dia de fechamento'), { target: { value: '1' } })
    fireEvent.click(screen.getByLabelText(/Revisei destinatário e incidência/i))
    fireEvent.click(screen.getByRole('button', { name: 'Revisar criação' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Confirmar nova regra' }))

    expect(await screen.findByText(/Primeira política v2 criada/i)).toBeInTheDocument()
    const createCall = (global.fetch as jest.Mock).mock.calls.find(([, init]) => init?.method === 'POST')
    expect(JSON.parse(createCall?.[1].body as string)).toEqual(expect.objectContaining({
      contractVersion: 2,
      expectedCurrentRuleId: null,
      comissaoValor: '20',
      impostoComissaoPercentual: '0',
    }))
  })

  it('associates validation errors and preserves form values', async () => {
    mockInitialLoad()
    render(<PropertyPayoutContract propertyId={propertyId} canEdit />)
    fireEvent.click(await screen.findByRole('button', { name: 'Criar nova versão' }))
    const date = screen.getByLabelText('Início da nova vigência')
    fireEvent.change(date, { target: { value: '2025-12-31' } })
    fireEvent.click(screen.getByRole('button', { name: 'Revisar substituição' }))
    expect(await screen.findByText(/posterior ao início/i)).toBeInTheDocument()
    expect(date).toHaveValue('2025-12-31')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('blocks a retroactive start even when it is after the current rule start', async () => {
    mockInitialLoad()
    render(<PropertyPayoutContract propertyId={propertyId} canEdit />)
    fireEvent.click(await screen.findByRole('button', { name: 'Criar nova versão' }))
    fireEvent.change(screen.getByLabelText('Início da nova vigência'), { target: { value: '2026-02-01' } })
    fireEvent.click(screen.getByLabelText(/Revisei destinatário e incidência/i))
    fireEvent.click(screen.getByRole('button', { name: 'Revisar substituição' }))
    expect(await screen.findByText(/deve iniciar hoje/i)).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('requires a fresh review after any contract field changes', async () => {
    mockInitialLoad()
    render(<PropertyPayoutContract propertyId={propertyId} canEdit />)
    fireEvent.click(await screen.findByRole('button', { name: 'Criar nova versão' }))
    const review = screen.getByLabelText(/Revisei destinatário e incidência/i)
    fireEvent.click(review)
    expect(review).toBeChecked()
    fireEvent.change(screen.getByLabelText('Percentual da comissão'), { target: { value: '19' } })
    expect(review).not.toBeChecked()
  })

  it.each([375, 390])('keeps the complete component policy operable at %ipx', async width => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: width })
    mockInitialLoad()
    const { container } = render(<PropertyPayoutContract propertyId={propertyId} canEdit />)
    fireEvent.click(await screen.findByRole('button', { name: 'Criar nova versão' }))
    expect(screen.getAllByLabelText('Destinatário')).toHaveLength(7)
    expect(screen.getAllByLabelText('Incidência na comissão')).toHaveLength(7)
    expect(screen.getAllByLabelText('Efeito no extrato')).toHaveLength(7)
    expect(container).toHaveTextContent(/explica para onde o dinheiro vai/i)
    expect(container.querySelector('table')).not.toBeInTheDocument()
  })

  it('explains why a rule that starts today cannot be replaced yet', async () => {
    const todayRule = { ...currentRule, vigenciaInicio: '2026-09-08' }
    ;(global.fetch as jest.Mock)
      .mockImplementationOnce(() => response({
        ...rulesResponse,
        currentRule: todayRule,
        history: [todayRule],
      }))
      .mockImplementationOnce(() => response(previewResponse))
    render(<PropertyPayoutContract propertyId={propertyId} canEdit />)
    expect(await screen.findByText('Substituição indisponível hoje')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Informar nova regra' })).not.toBeInTheDocument()
  })

  it('reviews, confirms and persists a v2 replacement without duplicate submit', async () => {
    const nextRule = { ...currentRule, id: '6be8e30a-e09a-4dbf-8d82-cd9405ce4219', vigenciaInicio: '2026-09-08' }
    mockInitialLoad()
    ;(global.fetch as jest.Mock)
      .mockImplementationOnce(() => response({ requestId: 'req_save', previousRule: currentRule, currentRule: nextRule }, 201))
      .mockImplementationOnce(() => response({
        ...rulesResponse,
        currentRule: nextRule,
        history: [{ ...currentRule, vigenciaFim: '2026-09-07' }, nextRule],
      }))
      .mockImplementationOnce(() => response({ ...previewResponse, ruleRef: { kind: 'persisted', id: nextRule.id } }))

    render(<PropertyPayoutContract propertyId={propertyId} canEdit />)
    fireEvent.click(await screen.findByRole('button', { name: 'Criar nova versão' }))
    fireEvent.click(screen.getByLabelText(/Revisei destinatário e incidência/i))

    fireEvent.click(screen.getByRole('button', { name: 'Revisar substituição' }))
    const confirm = await screen.findByRole('button', { name: 'Confirmar nova regra' })
    fireEvent.click(confirm)
    expect(confirm).toBeDisabled()
    expect(await screen.findByText(/Política v2 criada/i)).toBeInTheDocument()
    const replacementCalls = (global.fetch as jest.Mock).mock.calls.filter(([url, init]) =>
      init?.method === 'POST' && String(url).endsWith('/payout-rules'))
    expect(replacementCalls).toHaveLength(1)
    const payload = JSON.parse(replacementCalls[0][1].body as string)
    expect(payload).toEqual(expect.objectContaining({
      contractVersion: 2,
      competenciaReceita: 'check_out',
      expectedCurrentRuleId: currentRule.id,
    }))
    expect(payload.componentes).toHaveLength(7)
  })

  it('shows persistent fail-safe data quality feedback without a misleading result', async () => {
    mockInitialLoad({
      error: {
        code: 'PAYOUT_DATA_INCOMPLETE',
        message: 'Os dados financeiros do período estão incompletos',
        issues: [{ code: 'MISSING_CLEANING_FEE_BREAKDOWN', field: 'cleaning_fee_amount' }],
      },
      requestId: 'req_incomplete',
    }, 422)
    render(<PropertyPayoutContract propertyId={propertyId} canEdit />)
    expect(await screen.findByText(/dados financeiros.*incompletos/i)).toBeInTheDocument()
    expect(screen.queryByText('Repasse ao proprietário')).not.toBeInTheDocument()
  })

  it('renders canonical v2 labels and does not expose the legacy replacement form', async () => {
    const v2Rule = {
      id: currentRule.id, organizationId, propriedadeId: propertyId, contractVersion: 2 as const,
      vigenciaInicio: '2026-01-01', vigenciaFim: null, tipoComissao: 'percentual' as const,
      comissaoValor: '20', impostoComissaoPercentual: '0', competenciaReceita: 'stay_prorata' as const,
      fluxoFinanceiro: 'manager_trust' as const, preset: 'net_received' as const,
      despesasRepassaveis: true, diaFechamento: 5, observacoes: null,
      createdAt: '2026-01-01T00:00:00.000Z', componentes: [
        { componente: 'accommodation' as const, destinatario: 'owner' as const, efeitoNaBaseComissao: 'credit' as const, efeitoNoExtratoProprietario: 'credit' as const },
        { componente: 'cleaning_fee' as const, destinatario: 'manager' as const, efeitoNaBaseComissao: 'credit' as const, efeitoNoExtratoProprietario: 'ignore' as const },
        { componente: 'municipal_tax' as const, destinatario: 'municipality' as const, efeitoNaBaseComissao: 'credit' as const, efeitoNoExtratoProprietario: 'ignore' as const },
        { componente: 'other_guest_fees' as const, destinatario: 'owner' as const, efeitoNaBaseComissao: 'credit' as const, efeitoNoExtratoProprietario: 'credit' as const },
        { componente: 'discount' as const, destinatario: 'owner' as const, efeitoNaBaseComissao: 'debit' as const, efeitoNoExtratoProprietario: 'debit' as const },
        { componente: 'ota_commission' as const, destinatario: 'channel' as const, efeitoNaBaseComissao: 'debit' as const, efeitoNoExtratoProprietario: 'debit' as const },
        { componente: 'payment_processing_fee' as const, destinatario: 'payment_processor' as const, efeitoNaBaseComissao: 'debit' as const, efeitoNoExtratoProprietario: 'debit' as const },
      ],
    }
    const v2Preview = {
      ...previewResponse,
      result: {
        contractVersion: 2 as const, organizationId, propriedadeId: propertyId, currency: 'EUR',
        periodo: { inicio: '2026-08-01', fim: '2026-08-31' }, regraId: v2Rule.id,
        competenciaReceita: 'stay_prorata' as const, fluxoFinanceiro: 'manager_trust' as const,
        totaisComponentesMinor: {
          accommodation: 86450, cleaning_fee: 9000, municipal_tax: 2000,
          other_guest_fees: 1234, discount: 567, ota_commission: 14318,
          payment_processing_fee: 1364,
        },
        baseComissaoGestaoMinor: 81768, comissaoGestaoMinor: 16354,
        impostoComissaoGestaoMinor: 0, despesasRepassaveisMinor: 0,
        saldoEconomicoProprietarioMinor: 54414, valorRepassarProprietarioMinor: 54414,
        valorFaturarProprietarioMinor: 0, reservaIds: [], despesaIds: [],
      },
    }
    ;(global.fetch as jest.Mock)
      .mockImplementationOnce(() => response({ ...rulesResponse, currentRule: v2Rule, history: [v2Rule] }))
      .mockImplementationOnce(() => response(v2Preview))
    render(<PropertyPayoutContract propertyId={propertyId} canEdit />)
    expect(await screen.findByText('Valor bruto da hospedagem')).toBeInTheDocument()
    expect(screen.getAllByText(/competência por pró-rata por noites/i)).not.toHaveLength(0)
    expect(screen.getByText('Imposto municipal / taxa turística')).toBeInTheDocument()
    expect(screen.getByText('Outras taxas cobradas ao hóspede')).toBeInTheDocument()
    expect(screen.getByText('Descontos')).toBeInTheDocument()
    expect(screen.getByText('Valor a repassar ao proprietário')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Nova versão da política' })).toBeInTheDocument()
  })
})
