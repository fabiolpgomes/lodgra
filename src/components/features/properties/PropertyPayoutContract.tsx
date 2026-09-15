'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { AlertCircle, Calculator, CheckCircle2, FileText, History, Settings2 } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/common/ui/alert'
import { Button } from '@/components/common/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/common/ui/dialog'
import { Input } from '@/components/common/ui/input'
import { Label } from '@/components/common/ui/label'
import { Textarea } from '@/components/common/ui/textarea'
import {
  payoutRuleV2InputSchema,
  type OrganizationFinancialDefaultsDto,
  type PayoutPreviewResponse,
  type PayoutRuleDto,
  type PayoutRuleV2Dto,
  type PayoutRuleV2Input,
  type PayoutRulesResponse,
} from '@/lib/financial/payout-contract'
import { getPreviousCivilMonth } from '@/lib/financial/payout-period'
import type { ResultadoRepasseV2 } from '@/lib/financial/payout-rules'

type Props = {
  propertyId: string
  canEdit: boolean
}

type ApiError = {
  error?: { code?: string; message?: string; issues?: { code?: string; field?: string }[] }
  requestId?: string
}

const TYPE_LABELS: Record<PayoutRuleDto['tipoComissao'], string> = {
  percentual: 'Percentual',
  fixo_mensal: 'Fixo mensal',
  fixo_por_reserva: 'Fixo por reserva',
}

const LINE_LABELS: Record<string, string> = {
  receita_bruta: 'Dados legados — receita bruta agregada',
  taxas_servico: 'Dados legados — taxas de serviço agregadas',
  comissao_ota: 'Dados legados — comissão OTA',
  descontos: 'Dados legados — descontos',
  faturamento_propriedade: 'Dados legados — faturamento calculado',
  comissao_gestao: 'Comissão de gestão (cálculo legado)',
  taxa_limpeza_retida: 'Dados legados — taxa de limpeza retida',
  despesas_propriedade: 'Despesas da propriedade (cálculo legado)',
  repasse_proprietario: 'Repasse ao proprietário (cálculo legado)',
  accommodation: 'Valor bruto da hospedagem',
  cleaning_fee: 'Taxa de limpeza',
  municipal_tax: 'Imposto municipal / taxa turística',
  other_guest_fees: 'Outras taxas cobradas ao hóspede',
  discount: 'Descontos',
  ota_commission: 'Comissão OTA',
  payment_processing_fee: 'Taxa de processamento de pagamento',
  base_comissao_gestao: 'Base da comissão de gestão',
  imposto_comissao_gestao: 'Imposto sobre a comissão de gestão',
  saldo_economico_proprietario: 'Saldo econômico do proprietário',
  valor_repassar_proprietario: 'Valor a repassar ao proprietário',
  valor_faturar_proprietario: 'Valor a faturar ao proprietário',
}

const PRESET_LABELS: Record<PayoutRuleV2Input['preset'], string> = {
  net_received: 'Comissão sobre líquido recebido',
  gross_reservation: 'Comissão sobre valor bruto da reserva',
  custom: 'Política personalizada',
}

function nextUtcDay(date: string): string {
  const value = new Date(`${date}T00:00:00.000Z`)
  value.setUTCDate(value.getUTCDate() + 1)
  return value.toISOString().slice(0, 10)
}

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10)
}

function isV2Rule(rule: PayoutRuleDto): rule is PayoutRuleV2Dto {
  return rule.contractVersion === 2
}

const COMPONENT_LABELS: Record<PayoutRuleV2Input['componentes'][number]['componente'], string> = {
  accommodation: 'Valor bruto da hospedagem',
  cleaning_fee: 'Taxa de limpeza',
  municipal_tax: 'Imposto municipal / taxa turística',
  other_guest_fees: 'Outras taxas cobradas ao hóspede',
  discount: 'Descontos',
  ota_commission: 'Comissão OTA',
  payment_processing_fee: 'Taxa de processamento de pagamento',
}

const RECIPIENT_LABELS: Record<PayoutRuleV2Input['componentes'][number]['destinatario'], string> = {
  manager: 'Gestor', owner: 'Proprietário', municipality: 'Município',
  channel: 'Canal / OTA', payment_processor: 'Processador de pagamento', third_party: 'Terceiro',
}

const EFFECT_LABELS: Record<PayoutRuleV2Input['componentes'][number]['efeitoNaBaseComissao'], string> = {
  credit: 'Somar', debit: 'Deduzir', ignore: 'Não considerar',
}

function buildPresetComponents(
  preset: Exclude<PayoutRuleV2Input['preset'], 'custom'>,
  defaults: OrganizationFinancialDefaultsDto,
): PayoutRuleV2Input['componentes'] {
  const ownerEffect = (recipient: PayoutRuleV2Input['componentes'][number]['destinatario']) =>
    recipient === 'owner' ? 'credit' as const : 'ignore' as const
  const gross = preset === 'gross_reservation'
  return [
    { componente: 'accommodation', destinatario: 'owner', efeitoNaBaseComissao: 'credit', efeitoNoExtratoProprietario: 'credit' },
    { componente: 'cleaning_fee', destinatario: defaults.destinatarioLimpeza, efeitoNaBaseComissao: 'credit', efeitoNoExtratoProprietario: ownerEffect(defaults.destinatarioLimpeza) },
    { componente: 'municipal_tax', destinatario: defaults.destinatarioImpostoMunicipal, efeitoNaBaseComissao: 'credit', efeitoNoExtratoProprietario: ownerEffect(defaults.destinatarioImpostoMunicipal) },
    { componente: 'other_guest_fees', destinatario: 'owner', efeitoNaBaseComissao: 'credit', efeitoNoExtratoProprietario: 'credit' },
    { componente: 'discount', destinatario: 'owner', efeitoNaBaseComissao: 'debit', efeitoNoExtratoProprietario: 'debit' },
    { componente: 'ota_commission', destinatario: 'channel', efeitoNaBaseComissao: gross ? 'ignore' : 'debit', efeitoNoExtratoProprietario: 'debit' },
    { componente: 'payment_processing_fee', destinatario: 'payment_processor', efeitoNaBaseComissao: gross ? 'ignore' : 'debit', efeitoNoExtratoProprietario: 'debit' },
  ]
}

function formFromRule(
  rule: PayoutRuleDto | null,
  defaults: OrganizationFinancialDefaultsDto | null,
): PayoutRuleV2Input | null {
  if (!rule) {
    if (!defaults || defaults.preset === 'custom') return null
    return {
      vigenciaInicio: todayUtc(), tipoComissao: 'percentual',
      comissaoValor: '', impostoComissaoPercentual: '',
      competenciaReceita: defaults.competenciaReceita, fluxoFinanceiro: defaults.fluxoFinanceiro,
      preset: defaults.preset, allowDeclaredOwnerBase: false, despesasRepassaveis: false,
      diaFechamento: 0, observacoes: null,
      componentes: buildPresetComponents(defaults.preset, defaults),
    }
  }
  if (isV2Rule(rule)) {
    return {
      vigenciaInicio: todayUtc(), tipoComissao: rule.tipoComissao,
      comissaoValor: rule.comissaoValor, impostoComissaoPercentual: rule.impostoComissaoPercentual,
      competenciaReceita: rule.competenciaReceita, fluxoFinanceiro: rule.fluxoFinanceiro,
      preset: rule.preset, allowDeclaredOwnerBase: rule.allowDeclaredOwnerBase,
      despesasRepassaveis: rule.despesasRepassaveis,
      diaFechamento: rule.diaFechamento, observacoes: rule.observacoes,
      componentes: rule.componentes.map(component => ({ ...component })),
    }
  }
  if (!defaults || defaults.preset === 'custom') return null
  return {
    vigenciaInicio: todayUtc(), tipoComissao: rule.tipoComissao,
    comissaoValor: rule.comissaoValor, impostoComissaoPercentual: '0',
    competenciaReceita: defaults.competenciaReceita, fluxoFinanceiro: defaults.fluxoFinanceiro,
    preset: defaults.preset, allowDeclaredOwnerBase: false, despesasRepassaveis: rule.despesasRepassaveis,
    diaFechamento: rule.diaFechamento, observacoes: rule.observacoes,
    componentes: buildPresetComponents(defaults.preset, defaults),
  }
}

function formatDate(value: string | null): string {
  if (!value) return 'Em vigor'
  return new Intl.DateTimeFormat('pt-PT', { timeZone: 'UTC' }).format(new Date(`${value}T00:00:00.000Z`))
}

function formatMoney(minor: number, currency: string): string {
  return new Intl.NumberFormat('pt-PT', { style: 'currency', currency }).format(minor / 100)
}

function describeRule(rule: PayoutRuleDto, currency: string): string {
  if (rule.contractVersion === 2) {
    const basis = {
      check_in: 'check-in',
      check_out: 'check-out',
      stay_prorata: 'pró-rata por noites',
      payout_date: 'data do payout',
    }[rule.competenciaReceita]
    const commission = rule.tipoComissao === 'percentual'
      ? `${rule.comissaoValor}%`
      : `${TYPE_LABELS[rule.tipoComissao]} de ${currency} ${rule.comissaoValor}`
    return `${commission} · competência por ${basis} · ${rule.fluxoFinanceiro === 'manager_trust' ? 'gestor recebe e repassa' : 'proprietário recebe direto'}`
  }
  return rule.tipoComissao === 'percentual'
    ? `${rule.comissaoValor}% sobre ${rule.baseComissao === 'receita_bruta' ? 'receita bruta' : 'faturamento da propriedade'}`
    : `${TYPE_LABELS[rule.tipoComissao]} de ${currency} ${rule.comissaoValor}`
}

function v2PreviewLines(result: ResultadoRepasseV2): { code: string; value: number }[] {
  return [
    { code: 'accommodation', value: result.totaisComponentesMinor.accommodation },
    { code: 'cleaning_fee', value: result.totaisComponentesMinor.cleaning_fee },
    { code: 'municipal_tax', value: result.totaisComponentesMinor.municipal_tax },
    { code: 'other_guest_fees', value: result.totaisComponentesMinor.other_guest_fees },
    { code: 'discount', value: result.totaisComponentesMinor.discount },
    { code: 'ota_commission', value: result.totaisComponentesMinor.ota_commission },
    { code: 'payment_processing_fee', value: result.totaisComponentesMinor.payment_processing_fee },
    { code: 'base_comissao_gestao', value: result.baseComissaoGestaoMinor },
    { code: 'comissao_gestao', value: result.comissaoGestaoMinor },
    { code: 'imposto_comissao_gestao', value: result.impostoComissaoGestaoMinor },
    { code: 'saldo_economico_proprietario', value: result.saldoEconomicoProprietarioMinor },
    { code: result.fluxoFinanceiro === 'manager_trust' ? 'valor_repassar_proprietario' : 'valor_faturar_proprietario', value: result.fluxoFinanceiro === 'manager_trust' ? result.valorRepassarProprietarioMinor : result.valorFaturarProprietarioMinor },
  ]
}

async function parseResponse<T>(response: Response): Promise<T> {
  const raw = await response.text()
  let body: T | ApiError
  try {
    body = (raw ? JSON.parse(raw) : {}) as T | ApiError
  } catch {
    throw new Error(response.ok ? 'Resposta inválida do servidor.' : 'Não foi possível concluir a operação.')
  }
  if (!response.ok) {
    const failure = body as ApiError
    const support = failure.requestId ? ` Código de suporte: ${failure.requestId}.` : ''
    const error = new Error(`${failure.error?.message ?? 'Não foi possível concluir a operação.'}${support}`)
    Object.assign(error, { code: failure.error?.code, issues: failure.error?.issues })
    throw error
  }
  return body as T
}

export function PropertyPayoutContract({ propertyId, canEdit }: Props) {
  const [data, setData] = useState<PayoutRulesResponse | null>(null)
  const [form, setForm] = useState<PayoutRuleV2Input | null>(null)
  const [preview, setPreview] = useState<PayoutPreviewResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [previewing, setPreviewing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [policyReviewed, setPolicyReviewed] = useState(false)
  const statusRef = useRef<HTMLDivElement>(null)
  const previewController = useRef<AbortController | null>(null)
  const rulesController = useRef<AbortController | null>(null)
  const period = getPreviousCivilMonth().month

  const loadPreview = useCallback(async (ruleId: string) => {
    if (!canEdit) return
    previewController.current?.abort()
    const controller = new AbortController()
    previewController.current = controller
    setPreviewing(true)
    setError(null)
    try {
      const response = await fetch(`/api/properties/${propertyId}/payout-rules/preview`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ mode: 'persisted', periodo: period, ruleId }),
        signal: controller.signal,
      })
      const next = await parseResponse<PayoutPreviewResponse>(response)
      if (previewController.current !== controller || controller.signal.aborted) return
      setPreview(next)
    } catch (caught) {
      if ((caught as Error).name !== 'AbortError') {
        setPreview(null)
        setError(caught instanceof Error ? caught.message : 'Não foi possível calcular o preview.')
      }
    } finally {
      if (previewController.current === controller) setPreviewing(false)
    }
  }, [canEdit, period, propertyId])

  const loadRules = useCallback(async () => {
    rulesController.current?.abort()
    previewController.current?.abort()
    const controller = new AbortController()
    rulesController.current = controller
    setLoading(true)
    setData(null)
    setForm(null)
    setPreview(null)
    setShowForm(false)
    setError(null)
    try {
      const response = await fetch(`/api/properties/${propertyId}/payout-rules`, {
        cache: 'no-store',
        signal: controller.signal,
      })
      const next = await parseResponse<PayoutRulesResponse>(response)
      if (rulesController.current !== controller || controller.signal.aborted) return
      setData(next)
      setForm(formFromRule(next.currentRule, next.defaults))
      setPolicyReviewed(false)
      if (next.currentRule) await loadPreview(next.currentRule.id)
    } catch (caught) {
      if ((caught as Error).name !== 'AbortError') {
        setError(caught instanceof Error ? caught.message : 'Não foi possível carregar o contrato de repasse.')
      }
    } finally {
      if (rulesController.current === controller) setLoading(false)
    }
  }, [loadPreview, propertyId])

  useEffect(() => {
    void loadRules()
    return () => {
      rulesController.current?.abort()
      previewController.current?.abort()
    }
  }, [loadRules])

  useEffect(() => {
    if (error || success) statusRef.current?.focus()
  }, [error, success])

  function validateForm(): PayoutRuleV2Input | null {
    if (!form) return null
    const parsed = payoutRuleV2InputSchema.safeParse(form)
    if (!parsed.success) {
      setFieldErrors(Object.fromEntries(parsed.error.issues.map(issue => [issue.path.join('.'), issue.message])))
      return null
    }
    if (data?.currentRule && parsed.data.vigenciaInicio <= data.currentRule.vigenciaInicio) {
      setFieldErrors({ vigenciaInicio: 'A nova vigência deve ser posterior ao início da regra atual' })
      return null
    }
    if (parsed.data.vigenciaInicio !== todayUtc()) {
      setFieldErrors({ vigenciaInicio: 'A nova vigência deve iniciar hoje' })
      return null
    }
    if (!policyReviewed) {
      setFieldErrors({ policyReviewed: 'Confirme que revisou destinatário e incidência de todos os componentes' })
      return null
    }
    setFieldErrors({})
    return parsed.data
  }

  async function save() {
    const valid = validateForm()
    if (!valid || !data) {
      setConfirmOpen(false)
      return
    }
    setSaving(true)
    setError(null)
    setSuccess(null)
    try {
      const response = await fetch(`/api/properties/${propertyId}/payout-rules`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...valid, contractVersion: 2, expectedCurrentRuleId: data.currentRule?.id ?? null }),
      })
      await parseResponse(response)
      setConfirmOpen(false)
      setShowForm(false)
      setSuccess(data.currentRule
        ? 'Política v2 criada. A regra anterior foi encerrada e o histórico foi preservado.'
        : 'Primeira política v2 criada para esta propriedade.')
      await loadRules()
    } catch (caught) {
      setConfirmOpen(false)
      setError(caught instanceof Error ? caught.message : 'Não foi possível salvar a política financeira.')
    } finally {
      setSaving(false)
    }
  }

  function update<K extends keyof PayoutRuleV2Input>(field: K, value: PayoutRuleV2Input[K]) {
    previewController.current?.abort()
    setPreview(null)
    setForm(current => current ? { ...current, [field]: value } : current)
    setFieldErrors(current => ({ ...current, [field]: '' }))
    setPolicyReviewed(false)
    setSuccess(null)
  }

  function updateComponent(
    index: number,
    field: 'destinatario' | 'efeitoNaBaseComissao' | 'efeitoNoExtratoProprietario',
    value: string,
  ) {
    if (!form) return
    const componentes = form.componentes.map((component, componentIndex) =>
      componentIndex === index ? { ...component, [field]: value } : component)
    update('componentes', componentes as PayoutRuleV2Input['componentes'])
  }

  function updatePreset(preset: PayoutRuleV2Input['preset']) {
    if (!form) return
    if (preset !== 'custom' && !data?.defaults) return
    setForm({
      ...form,
      preset,
      componentes: preset === 'custom' ? form.componentes : buildPresetComponents(preset, data!.defaults!),
    })
    setPolicyReviewed(false)
    setFieldErrors({})
    setSuccess(null)
  }

  if ((loading && !data) || (data && data.property.id !== propertyId)) {
    return <section id="contrato-repasse" aria-busy="true" className="mt-8 rounded-lg border bg-white p-4 sm:p-6"><p>Carregando Contrato / Repasse…</p></section>
  }

  if (!data) {
    return (
      <section id="contrato-repasse" className="mt-8 rounded-lg border bg-white p-4 sm:p-6">
        <h2 className="text-xl font-semibold">Contrato / Repasse</h2>
        <Alert variant="destructive" className="mt-4"><AlertCircle /><AlertTitle>Falha ao carregar</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>
        <Button className="mt-4 min-h-12 w-full sm:w-auto" onClick={() => void loadRules()}>Tentar novamente</Button>
      </section>
    )
  }

  const current = data.currentRule
  const minStart = current ? nextUtcDay(current.vigenciaInicio) : todayUtc()
  const canReplaceCurrentRule = !current || minStart <= todayUtc()
  const isInitialContract = current === null

  return (
    <section id="contrato-repasse" aria-labelledby="payout-heading" className="mt-8 min-w-0 space-y-6 rounded-lg border bg-white p-4 shadow-sm sm:p-6">
      <div>
        <p className="text-sm font-medium text-gray-600">Gestão contratual</p>
        <h2 id="payout-heading" className="text-xl font-semibold text-gray-900">Contrato / Repasse</h2>
      </div>

      <div ref={statusRef} tabIndex={-1} className="outline-none" aria-live="polite">
        {success && <Alert className="border-emerald-700 bg-emerald-50 text-emerald-950"><CheckCircle2 /><AlertTitle>Alteração concluída</AlertTitle><AlertDescription>{success}</AlertDescription></Alert>}
        {error && <Alert variant="destructive"><AlertCircle /><AlertTitle>Atenção</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}
      </div>

      <article aria-labelledby="current-rule-heading" className="rounded-lg bg-[#F7F5EF] p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <FileText className="mt-0.5 size-5 shrink-0 text-[#10203E]" aria-hidden="true" />
          <div className="min-w-0">
            <h3 id="current-rule-heading" className="font-semibold text-gray-900">Regra vigente</h3>
            {!current ? (
              <p className="mt-1 text-sm text-gray-700">Nenhuma regra foi cadastrada. Configure o primeiro contrato antes de calcular repasses.</p>
            ) : (
              <><p className="mt-1 break-words text-base text-gray-900">{describeRule(current, data.property.currency)}</p>
              <p className="mt-2 text-sm text-gray-700">Desde {formatDate(current.vigenciaInicio)} · fechamento no dia {current.diaFechamento}</p></>
            )}
            {current && (isV2Rule(current) ? (
              <p className="mt-1 text-sm text-gray-700">Política v2 com destinatário e incidência definidos por componente · despesas {current.despesasRepassaveis ? 'repassáveis' : 'não repassáveis'}</p>
            ) : (
              <p className="mt-1 text-sm text-gray-700">Dados legados — limpeza: {current.taxaLimpezaPara} · OTA: {current.comissaoOtaPorConta} · despesas {current.despesasRepassaveis ? 'repassáveis' : 'não repassáveis'}</p>
            ))}
          </div>
        </div>
      </article>

      <article aria-labelledby="preview-heading" className="min-w-0 rounded-lg border p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <Calculator className="mt-0.5 size-5 shrink-0 text-[#10203E]" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <h3 id="preview-heading" className="font-semibold text-gray-900">Preview de {period}</h3>
            <p className="mt-1 text-sm text-gray-600">Mês civil completo anterior, em UTC.</p>
          </div>
        </div>
        {previewing && <p className="mt-4" aria-live="polite">Calculando preview…</p>}
        {!current && <p className="mt-4 text-sm text-gray-600">O preview ficará disponível após a criação da primeira política.</p>}
        {!previewing && preview && (
          <div className="mt-4 min-w-0 space-y-2">
            <p className="text-sm text-gray-700">Regra: {preview.ruleRef.kind === 'simulation' ? 'simulação não salva' : 'vigente'}</p>
            {'contractVersion' in preview.result ? (
              <dl className="space-y-2">
                {v2PreviewLines(preview.result).map(line => (
                  <div key={line.code} className="flex min-w-0 flex-col gap-1 border-b py-2 last:border-0 sm:flex-row sm:items-start sm:justify-between">
                    <dt className={line.code.startsWith('valor_') ? 'font-semibold' : ''}>{LINE_LABELS[line.code] ?? line.code}</dt>
                    <dd className={line.code.startsWith('valor_') ? 'font-semibold' : ''}>{formatMoney(line.value, preview.result.currency)}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <>
                <p className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">Este preview usa campos agregados legados. Ele não confirma fatos financeiros canônicos do contrato v2.</p>
                <dl className="space-y-2">
                {Object.entries(preview.result.linhas).map(([code, line]) => (
                  <div key={code} className="flex min-w-0 flex-col gap-1 border-b py-2 last:border-0 sm:flex-row sm:items-start sm:justify-between">
                    <dt className={code === 'repasse_proprietario' ? 'font-semibold' : ''}>{LINE_LABELS[code] ?? code}</dt>
                    <dd className="min-w-0 text-left sm:text-right">
                      <span className={code === 'repasse_proprietario' ? 'font-semibold' : ''}>{formatMoney(line.valorMinor, preview.result.currency)}</span>
                      {(line.reservaIds.length > 0 || line.despesaIds.length > 0) && (
                        <span className="mt-1 block break-all text-xs text-gray-500">IDs: {[...line.reservaIds, ...line.despesaIds].join(', ')}</span>
                      )}
                    </dd>
                  </div>
                ))}
                </dl>
              </>
            )}
          </div>
        )}
        {!canEdit && <p className="mt-4 text-sm text-gray-600">O preview está disponível para administradores e gestores.</p>}
      </article>

      {canEdit && (
        <article aria-labelledby="replace-heading" className="rounded-lg border p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <Settings2 className="mt-0.5 size-5 shrink-0 text-[#10203E]" aria-hidden="true" />
            <div>
              <h3 id="replace-heading" className="font-semibold text-gray-900">{isInitialContract ? 'Primeira política da propriedade' : 'Nova versão da política'}</h3>
              <p className="mt-1 text-sm text-gray-600">{isInitialContract ? 'Cria o contrato financeiro inicial usando os defaults da empresa como ponto de partida.' : 'Cria um contrato v2 completo e preserva integralmente o histórico anterior.'}</p>
            </div>
          </div>
          {!canReplaceCurrentRule ? (
            <Alert className="mt-4">
              <AlertCircle />
              <AlertTitle>Substituição indisponível hoje</AlertTitle>
              <AlertDescription>A regra vigente começou hoje. Uma nova versão poderá ser criada a partir de amanhã.</AlertDescription>
            </Alert>
          ) : !form ? (
            <Alert className="mt-4">
              <AlertCircle />
              <AlertTitle>Defaults financeiros necessários</AlertTitle>
              <AlertDescription>Configure o preset e os destinatários padrão da empresa antes de criar o primeiro contrato v2 desta propriedade.</AlertDescription>
            </Alert>
          ) : !showForm ? (
            <Button className="mt-4 min-h-12 w-full sm:w-auto" onClick={() => setShowForm(true)}>{isInitialContract ? 'Configurar primeira política' : 'Criar nova versão'}</Button>
          ) : (
            <form className="mt-5 grid min-w-0 grid-cols-1 gap-5 lg:grid-cols-2" onSubmit={event => { event.preventDefault(); if (validateForm()) setConfirmOpen(true) }} noValidate>
              <Field label={isInitialContract ? 'Início da vigência' : 'Início da nova vigência'} htmlFor="vigenciaInicio" hint={isInitialContract ? 'O primeiro contrato começa hoje.' : 'A nova versão começa hoje; períodos anteriores permanecem imutáveis.'} error={fieldErrors.vigenciaInicio}>
                <Input id="vigenciaInicio" type="date" min={todayUtc()} max={todayUtc()} value={form.vigenciaInicio} onChange={event => update('vigenciaInicio', event.target.value)} aria-invalid={Boolean(fieldErrors.vigenciaInicio)} aria-describedby="vigenciaInicio-help vigenciaInicio-error" />
              </Field>
              <Field label="Tipo de comissão" htmlFor="tipoComissao" hint="Define como a gestão será remunerada." error={fieldErrors.tipoComissao}>
                <select id="tipoComissao" aria-describedby="tipoComissao-help tipoComissao-error" aria-invalid={Boolean(fieldErrors.tipoComissao)} className="h-14 w-full rounded-sm border bg-white px-4 text-base focus:border-[#10203E] focus:outline-none focus:ring-2 focus:ring-[#10203E]/20" value={form.tipoComissao} onChange={event => update('tipoComissao', event.target.value as PayoutRuleV2Input['tipoComissao'])}>
                  <option value="percentual">Percentual</option><option value="fixo_mensal">Fixo mensal</option><option value="fixo_por_reserva">Fixo por reserva</option>
                </select>
              </Field>
              <Field label={form.tipoComissao === 'percentual' ? 'Percentual da comissão' : 'Valor da comissão'} htmlFor="comissaoValor" hint="Até quatro casas decimais; sem símbolo de moeda." error={fieldErrors.comissaoValor}>
                <Input id="comissaoValor" inputMode="decimal" value={form.comissaoValor} onChange={event => update('comissaoValor', event.target.value)} aria-invalid={Boolean(fieldErrors.comissaoValor)} aria-describedby="comissaoValor-help comissaoValor-error" />
              </Field>
              <Field label="Imposto sobre a comissão de gestão (%)" htmlFor="impostoComissaoPercentual" hint="Imposto do serviço de gestão; não é imposto da reserva." error={fieldErrors.impostoComissaoPercentual}>
                <Input id="impostoComissaoPercentual" inputMode="decimal" value={form.impostoComissaoPercentual} onChange={event => update('impostoComissaoPercentual', event.target.value)} aria-invalid={Boolean(fieldErrors.impostoComissaoPercentual)} aria-describedby="impostoComissaoPercentual-help impostoComissaoPercentual-error" />
              </Field>
              <Field label="Preset da política" htmlFor="preset" hint="Preenche os efeitos; cada componente continua editável." error={fieldErrors.preset}>
                <select id="preset" aria-describedby="preset-help preset-error" aria-invalid={Boolean(fieldErrors.preset)} className="h-14 w-full rounded-sm border bg-white px-4 text-base focus:border-[#10203E] focus:outline-none focus:ring-2 focus:ring-[#10203E]/20" value={form.preset} onChange={event => updatePreset(event.target.value as PayoutRuleV2Input['preset'])}>
                  <option value="net_received">Comissão sobre líquido recebido</option><option value="gross_reservation">Comissão sobre valor bruto da reserva</option><option value="custom">Política personalizada</option>
                </select>
              </Field>
              <Field label="Competência da receita" htmlFor="competenciaReceita" hint="Define em qual mês a reserva entra no extrato." error={fieldErrors.competenciaReceita}>
                <select id="competenciaReceita" aria-describedby="competenciaReceita-help competenciaReceita-error" aria-invalid={Boolean(fieldErrors.competenciaReceita)} className="h-14 w-full rounded-sm border bg-white px-4 text-base focus:border-[#10203E] focus:outline-none focus:ring-2 focus:ring-[#10203E]/20" value={form.competenciaReceita} onChange={event => update('competenciaReceita', event.target.value as PayoutRuleV2Input['competenciaReceita'])}>
                  <option value="check_out">Check-out</option><option value="stay_prorata">Pró-rata por noites</option><option value="check_in">Check-in</option><option value="payout_date">Data do payout reconciliado</option>
                </select>
              </Field>
              <Field label="Fluxo financeiro" htmlFor="fluxoFinanceiro" hint="Define quem recebe dos canais e qual valor é transferido ou faturado." error={fieldErrors.fluxoFinanceiro}>
                <select id="fluxoFinanceiro" aria-describedby="fluxoFinanceiro-help fluxoFinanceiro-error" aria-invalid={Boolean(fieldErrors.fluxoFinanceiro)} className="h-14 w-full rounded-sm border bg-white px-4 text-base focus:border-[#10203E] focus:outline-none focus:ring-2 focus:ring-[#10203E]/20" value={form.fluxoFinanceiro} onChange={event => update('fluxoFinanceiro', event.target.value as PayoutRuleV2Input['fluxoFinanceiro'])}>
                  <option value="manager_trust">Gestor recebe e repassa</option><option value="owner_direct">Proprietário recebe direto</option>
                </select>
              </Field>
              <Field label="Dia de fechamento" htmlFor="diaFechamento" hint="Dia contratual entre 1 e 31." error={fieldErrors.diaFechamento}>
                <Input id="diaFechamento" type="number" min={1} max={31} value={form.diaFechamento} onChange={event => update('diaFechamento', Number(event.target.value))} aria-invalid={Boolean(fieldErrors.diaFechamento)} aria-describedby="diaFechamento-help diaFechamento-error" />
              </Field>
              <div className="flex min-h-14 items-center gap-3 rounded-sm border px-4">
                <input id="despesasRepassaveis" type="checkbox" className="size-5" checked={form.despesasRepassaveis} onChange={event => update('despesasRepassaveis', event.target.checked)} />
                <Label htmlFor="despesasRepassaveis">Despesas são repassáveis ao proprietário</Label>
              </div>
              <div className="flex min-h-14 items-start gap-3 rounded-sm border px-4 py-3 lg:col-span-2">
                <input id="allowDeclaredOwnerBase" type="checkbox" className="mt-1 size-5 shrink-0" checked={form.allowDeclaredOwnerBase ?? false} onChange={event => update('allowDeclaredOwnerBase', event.target.checked)} />
                <span><Label htmlFor="allowDeclaredOwnerBase">Permitir valor base declarado por reserva</Label><span className="mt-1 block text-sm text-gray-600">Para operações que conhecem o valor confirmado para repasse, mas não recebem a decomposição da plataforma.</span></span>
              </div>
              <fieldset className="min-w-0 space-y-4 rounded-lg border bg-[#F7F5EF] p-3 sm:p-4 lg:col-span-2">
                <legend className="px-1 font-semibold text-gray-900">Tratamento por componente</legend>
                <p className="text-sm text-gray-700"><strong>Destinatário</strong> explica para onde o dinheiro vai. <strong>Incidência</strong> define separadamente se o valor soma, deduz ou não participa da comissão e do extrato do proprietário.</p>
                {form.componentes.map((component, index) => (
                  <div key={component.componente} className="grid min-w-0 grid-cols-1 gap-3 rounded-lg border bg-white p-3 md:grid-cols-3">
                    <h4 className="break-words font-medium text-gray-900 md:col-span-3">{COMPONENT_LABELS[component.componente]}</h4>
                    <Field label="Destinatário" htmlFor={`component-${index}-recipient`} hint="Para onde esta parcela é destinada." error={fieldErrors[`componentes.${index}.destinatario`]}>
                      <select id={`component-${index}-recipient`} className="h-14 w-full rounded-sm border bg-white px-3 text-base" value={component.destinatario} onChange={event => updateComponent(index, 'destinatario', event.target.value)}>
                        {Object.entries(RECIPIENT_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                      </select>
                    </Field>
                    <Field label="Incidência na comissão" htmlFor={`component-${index}-commission`} hint="Efeito na base da comissão de gestão." error={fieldErrors[`componentes.${index}.efeitoNaBaseComissao`]}>
                      <select id={`component-${index}-commission`} className="h-14 w-full rounded-sm border bg-white px-3 text-base" value={component.efeitoNaBaseComissao} onChange={event => updateComponent(index, 'efeitoNaBaseComissao', event.target.value)}>
                        {Object.entries(EFFECT_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                      </select>
                    </Field>
                    <Field label="Efeito no extrato" htmlFor={`component-${index}-statement`} hint="Efeito no saldo econômico do proprietário." error={fieldErrors[`componentes.${index}.efeitoNoExtratoProprietario`]}>
                      <select id={`component-${index}-statement`} className="h-14 w-full rounded-sm border bg-white px-3 text-base" value={component.efeitoNoExtratoProprietario} onChange={event => updateComponent(index, 'efeitoNoExtratoProprietario', event.target.value)}>
                        {Object.entries(EFFECT_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                      </select>
                    </Field>
                  </div>
                ))}
                <div className="flex min-h-14 items-start gap-3 rounded-sm border border-[#10203E]/30 bg-white p-3">
                  <input id="policyReviewed" type="checkbox" className="mt-1 size-5 shrink-0" checked={policyReviewed} onChange={event => { setPolicyReviewed(event.target.checked); setFieldErrors(currentErrors => ({ ...currentErrors, policyReviewed: '' })) }} aria-describedby="policyReviewed-help policyReviewed-error" />
                  <div><Label htmlFor="policyReviewed">Revisei destinatário e incidência de todos os componentes</Label><p id="policyReviewed-help" className="mt-1 text-sm text-gray-600">O preset apenas preenche a política; o contrato salvo usa estas escolhas explícitas.</p>{fieldErrors.policyReviewed && <p id="policyReviewed-error" className="mt-1 text-sm text-red-800">{fieldErrors.policyReviewed}</p>}</div>
                </div>
              </fieldset>
              <Field label="Observações" htmlFor="observacoes" hint="Opcional, até 2.000 caracteres." error={fieldErrors.observacoes} className="lg:col-span-2">
                <Textarea id="observacoes" className="min-h-28" maxLength={2000} value={form.observacoes ?? ''} onChange={event => update('observacoes', event.target.value || null)} aria-describedby="observacoes-help observacoes-error" aria-invalid={Boolean(fieldErrors.observacoes)} />
              </Field>
              <div className="flex flex-col gap-3 lg:col-span-2 sm:flex-row">
                <Button type="submit" className="min-h-12 w-full sm:w-auto" disabled={saving}>{isInitialContract ? 'Revisar criação' : 'Revisar substituição'}</Button>
                <Button type="button" variant="ghost" className="min-h-12 w-full sm:w-auto" disabled={saving} onClick={() => { setShowForm(false); setForm(formFromRule(current, data.defaults)); setFieldErrors({}); setPolicyReviewed(false) }}>Cancelar</Button>
              </div>
            </form>
          )}
        </article>
      )}

      <article aria-labelledby="history-heading" className="min-w-0">
        <div className="flex items-center gap-3"><History className="size-5 text-[#10203E]" aria-hidden="true" /><h3 id="history-heading" className="font-semibold text-gray-900">Histórico</h3></div>
        <div className="mt-4 grid min-w-0 gap-3 lg:grid-cols-2">
          {data.history.length === 0 && <p className="text-sm text-gray-600">O histórico será iniciado com a primeira política.</p>}
          {data.history.map(item => (
            <div key={item.id} className="min-w-0 rounded-lg border p-4">
              <p className="font-medium text-gray-900">{formatDate(item.vigenciaInicio)} — {formatDate(item.vigenciaFim)}</p>
              <p className="mt-1 break-words text-sm">{describeRule(item, data.property.currency)}</p>
              <dl className="mt-3 grid grid-cols-1 gap-1 text-sm text-gray-700 sm:grid-cols-2">
                {isV2Rule(item) ? (
                  <>
                    <div><dt className="inline font-medium">Contrato: </dt><dd className="inline">política v2</dd></div>
                    <div><dt className="inline font-medium">Preset: </dt><dd className="inline">{PRESET_LABELS[item.preset]}</dd></div>
                  </>
                ) : (
                  <>
                    <div><dt className="inline font-medium">Dados legados — limpeza: </dt><dd className="inline">{item.taxaLimpezaPara}</dd></div>
                    <div><dt className="inline font-medium">OTA: </dt><dd className="inline">{item.comissaoOtaPorConta}</dd></div>
                  </>
                )}
                <div><dt className="inline font-medium">Despesas: </dt><dd className="inline">{item.despesasRepassaveis ? 'repassáveis' : 'não repassáveis'}</dd></div>
                <div><dt className="inline font-medium">Fechamento: </dt><dd className="inline">dia {item.diaFechamento}</dd></div>
              </dl>
              {item.observacoes && <p className="mt-2 break-words text-sm text-gray-600">{item.observacoes}</p>}
            </div>
          ))}
        </div>
      </article>

      <Dialog open={confirmOpen} onOpenChange={open => !saving && setConfirmOpen(open)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{isInitialContract ? 'Confirmar primeira política?' : 'Confirmar substituição?'}</DialogTitle><DialogDescription>{isInitialContract ? `O primeiro contrato passará a valer em ${form ? formatDate(form.vigenciaInicio) : ''}. A expectativa de ausência será validada novamente no banco.` : `A regra anterior será encerrada no dia anterior e a nova passará a valer em ${form ? formatDate(form.vigenciaInicio) : ''}. Esta ação preserva o histórico e não permite edição retroativa.`}</DialogDescription></DialogHeader>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline" disabled={saving}>Voltar</Button></DialogClose>
            <Button disabled={saving} onClick={() => void save()}>{saving ? 'Salvando…' : 'Confirmar nova regra'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}

function Field({
  label,
  htmlFor,
  hint,
  error,
  className = '',
  children,
}: {
  label: string
  htmlFor: string
  hint: string
  error?: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={`min-w-0 space-y-2 ${className}`}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      <p id={`${htmlFor}-help`} className="text-sm text-gray-600">{hint}</p>
      {error && <p id={`${htmlFor}-error`} className="flex items-center gap-1 text-sm text-red-800"><AlertCircle className="size-4" aria-hidden="true" />{error}</p>}
    </div>
  )
}
