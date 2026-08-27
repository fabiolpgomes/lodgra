'use client'

import { useMemo, useState, type CSSProperties, type Dispatch, type SetStateAction } from 'react'
import { CheckCircle2, Copy, Play, RotateCcw, ShieldAlert, Sparkles, WandSparkles } from 'lucide-react'

import { Button } from '@/components/common/ui/button'
import { Input } from '@/components/common/ui/input'
import { PremiumCard, PremiumMetricCard } from '@/components/common/layout/PremiumPage'
import { Switch } from '@/components/common/ui/switch'
import { Textarea } from '@/components/common/ui/textarea'

type AnalysisProfile = 'conservative' | 'balanced' | 'premium'
type LeadSource = 'WhatsApp' | 'Airbnb' | 'Booking' | 'Website' | 'Manual'
type MarketTier = 'coastal' | 'urban' | 'suburban' | 'rural'
type ConditionTier = 'poor' | 'fair' | 'good' | 'excellent'
type CurrencyCode = 'EUR' | 'BRL' | 'GBP' | 'USD'
type PropertyType = 'Apartamento' | 'Vivenda' | 'Cabana' | 'Prédio'
type ResultView = 'summary' | 'json' | 'markdown'
type OwnerFlexibilityLevel = 'high' | 'medium' | 'low'
type OwnerOperatingModel = 'short_mid' | 'mixed' | 'long'

type QuickPick<T extends string> = {
  value: T
  label: string
  description?: string
}

const PROFILE_OPTIONS: QuickPick<AnalysisProfile>[] = [
  {
    value: 'conservative',
    label: 'Conservador',
    description: 'Mais prudente. Útil para validar viabilidade com margem maior.',
  },
  {
    value: 'balanced',
    label: 'Equilibrado',
    description: 'Ponto de partida recomendado para a maioria dos casos.',
  },
  {
    value: 'premium',
    label: 'Otimizado',
    description: 'Mais agressivo. Útil quando o imóvel já tem forte tração.',
  },
]

const SOURCE_OPTIONS: QuickPick<LeadSource>[] = [
  { value: 'WhatsApp', label: 'WhatsApp' },
  { value: 'Airbnb', label: 'Airbnb' },
  { value: 'Booking', label: 'Booking' },
  { value: 'Website', label: 'Site' },
  { value: 'Manual', label: 'Manual' },
]

const LOCATION_OPTIONS: QuickPick<string>[] = [
  { value: 'Faro, Algarve', label: 'Faro' },
  { value: 'Lagos, Algarve', label: 'Lagos' },
  { value: 'Albufeira, Algarve', label: 'Albufeira' },
  { value: 'Armação de Pera', label: 'Armação de Pera' },
  { value: 'Tavira, Algarve', label: 'Tavira' },
  { value: 'Lisboa', label: 'Lisboa' },
  { value: 'Porto', label: 'Porto' },
]

const TYPOLOGY_OPTIONS: QuickPick<string>[] = [
  { value: 'T0', label: 'T0' },
  { value: 'T1', label: 'T1' },
  { value: 'T2', label: 'T2' },
  { value: 'T3', label: 'T3' },
  { value: 'T4+', label: 'T4 ou mais' },
]

const PROPERTY_TYPE_OPTIONS: QuickPick<PropertyType>[] = [
  { value: 'Apartamento', label: 'Apartamento' },
  { value: 'Vivenda', label: 'Vivenda' },
  { value: 'Cabana', label: 'Cabana' },
  { value: 'Prédio', label: 'Prédio' },
]

const OWNER_FLEXIBILITY_OPTIONS: QuickPick<OwnerFlexibilityLevel>[] = [
  { value: 'high', label: 'Alta' },
  { value: 'medium', label: 'Média' },
  { value: 'low', label: 'Baixa' },
]

const OWNER_OPERATING_MODEL_OPTIONS: QuickPick<OwnerOperatingModel>[] = [
  { value: 'short_mid', label: 'Curta + média' },
  { value: 'mixed', label: 'Mista' },
  { value: 'long', label: 'Longa duração' },
]

const AREA_OPTIONS = [35, 50, 65, 82, 110]
const BEDROOM_OPTIONS = [0, 1, 2, 3, 4]

const MARKET_OPTIONS: QuickPick<MarketTier>[] = [
  { value: 'coastal', label: 'Costeiro' },
  { value: 'urban', label: 'Urbano' },
  { value: 'suburban', label: 'Periurbano' },
  { value: 'rural', label: 'Rural' },
]

const CONDITION_OPTIONS: QuickPick<ConditionTier>[] = [
  { value: 'excellent', label: 'Remodelado' },
  { value: 'good', label: 'Em boas condições' },
  { value: 'fair', label: 'Precisa de reparos' },
]

const CURRENCY_OPTIONS: QuickPick<CurrencyCode>[] = [
  { value: 'EUR', label: 'Euro' },
  { value: 'BRL', label: 'Reais' },
  { value: 'GBP', label: 'Libra' },
  { value: 'USD', label: 'Dólar' },
]

const NOTE_OPTIONS: QuickPick<string>[] = [
  { value: 'Avaliar viabilidade para entrada comercial.', label: 'Viabilidade' },
  { value: 'Preparar um relatório executivo para o proprietário.', label: 'Relatório executivo' },
  { value: 'Comparar com cenários de exploração antes de avançar.', label: 'Comparar cenários' },
]

const DEFAULT_FORM = {
  propertyName: 'AHS Premium apart 2 swing pool 5 min beach',
  location: 'Faro, Algarve',
  propertyType: 'Apartamento' as PropertyType,
  typology: 'T2',
  areaM2: 82,
  bedrooms: 2,
  market: 'coastal' as MarketTier,
  condition: 'good' as ConditionTier,
  furnished: true,
  balcony: true,
  pool: false,
  garage: false,
  source: 'WhatsApp' as LeadSource,
  note: 'Pedido para avaliar potencial de exploração.',
  highlights: 'Perto da praia, boa luz natural e potencial para estadias confortáveis.',
  listingUrl: '',
  currency: 'EUR' as CurrencyCode,
  profile: 'balanced' as AnalysisProfile,
  ownerContext: {
    flexibility: 'high' as OwnerFlexibilityLevel,
    operatingModel: 'short_mid' as OwnerOperatingModel,
    historicalRevenue: 15000,
    rentedDays: 186,
    maintenanceNote:
      'O imóvel é próprio e a locação curta e média permite manutenção preventiva, além de manter a flexibilidade de uso pelo proprietário.',
  },
}

const INITIAL_GUIDED_JSON = JSON.stringify(
  {
    lead: {
      name: DEFAULT_FORM.propertyName,
      source: DEFAULT_FORM.source,
      note: DEFAULT_FORM.note,
    },
    property: {
      location: DEFAULT_FORM.location,
      propertyType: DEFAULT_FORM.propertyType,
      typology: DEFAULT_FORM.typology,
      areaM2: DEFAULT_FORM.areaM2,
      bedrooms: DEFAULT_FORM.bedrooms,
      market: DEFAULT_FORM.market,
      condition: DEFAULT_FORM.condition,
      furnished: DEFAULT_FORM.furnished,
      balcony: DEFAULT_FORM.balcony,
      pool: DEFAULT_FORM.pool,
      garage: DEFAULT_FORM.garage,
      highlights: DEFAULT_FORM.highlights,
      listingUrl: DEFAULT_FORM.listingUrl,
    },
    assumptions: {
      currency: DEFAULT_FORM.currency,
      longStay: {
        occupancyPct: 0.96,
        fixedCostsMonthly: 180,
        variableCostsPct: 0.05,
        commissionPct: 0.08,
      },
      midStay: {
        occupancyPct: 0.87,
        fixedCostsMonthly: 220,
        variableCostsPct: 0.06,
        commissionPct: 0.12,
      },
      shortStay: {
        occupancyPct: 0.74,
        fixedCostsMonthly: 320,
        variableCostsPct: 0.12,
        commissionPct: 0.18,
        cleaningPerTurnover: 50,
        turnoversPerMonth: 7,
      },
    },
  },
  null,
  2
)

function formatJson(value: unknown) {
  return JSON.stringify(value, null, 2)
}

function selectionButtonStyle(active: boolean): CSSProperties {
  return active
    ? {
        backgroundColor: '#10203E',
        borderColor: '#10203E',
        borderWidth: '2px',
        color: '#FFFFFF',
        boxShadow: '0 12px 28px rgba(16, 32, 62, 0.22)',
        transform: 'translateY(-1px)',
      }
    : {
        backgroundColor: 'rgba(255, 255, 255, 0.96)',
        borderColor: 'rgba(201, 162, 39, 0.28)',
        borderWidth: '1px',
        color: '#10203E',
        boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.8)',
      }
}

function getProfileAssumptions(profile: AnalysisProfile) {
  if (profile === 'conservative') {
    return {
      longStay: {
        occupancyPct: 0.9,
        fixedCostsMonthly: 220,
        variableCostsPct: 0.06,
        commissionPct: 0.1,
      },
      midStay: {
        occupancyPct: 0.82,
        fixedCostsMonthly: 250,
        variableCostsPct: 0.07,
        commissionPct: 0.13,
      },
      shortStay: {
        occupancyPct: 0.68,
        fixedCostsMonthly: 340,
        variableCostsPct: 0.13,
        commissionPct: 0.2,
        cleaningPerTurnover: 55,
        turnoversPerMonth: 6,
      },
    }
  }

  if (profile === 'premium') {
    return {
      longStay: {
        occupancyPct: 0.98,
        fixedCostsMonthly: 160,
        variableCostsPct: 0.04,
        commissionPct: 0.07,
      },
      midStay: {
        occupancyPct: 0.91,
        fixedCostsMonthly: 200,
        variableCostsPct: 0.05,
        commissionPct: 0.1,
      },
      shortStay: {
        occupancyPct: 0.8,
        fixedCostsMonthly: 280,
        variableCostsPct: 0.1,
        commissionPct: 0.16,
        cleaningPerTurnover: 45,
        turnoversPerMonth: 8,
      },
    }
  }

  return {
    longStay: {
      occupancyPct: 0.96,
      fixedCostsMonthly: 180,
      variableCostsPct: 0.05,
      commissionPct: 0.08,
    },
    midStay: {
      occupancyPct: 0.87,
      fixedCostsMonthly: 220,
      variableCostsPct: 0.06,
      commissionPct: 0.12,
    },
    shortStay: {
      occupancyPct: 0.74,
      fixedCostsMonthly: 320,
      variableCostsPct: 0.12,
      commissionPct: 0.18,
      cleaningPerTurnover: 50,
      turnoversPerMonth: 7,
    },
  }
}

function formatStayTypeLabel(stayType: string | undefined): string {
  if (stayType === 'long-stay') {
    return 'estadia longa'
  }

  if (stayType === 'mid-stay') {
    return 'estadia média'
  }

  if (stayType === 'short-stay') {
    return 'estadia curta'
  }

  return 'estadia'
}

function ChoiceGroup<T extends string>({
  label,
  description,
  options,
  value,
  onChange,
  columns = 'sm:grid-cols-2',
}: {
  label: string
  description?: string
  options: QuickPick<T>[]
  value: T | ''
  onChange: Dispatch<SetStateAction<T>>
  columns?: string
}) {
  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-brand-text-dark">{label}</h3>
        {description ? <p className="text-xs text-brand-text-medium">{description}</p> : null}
      </div>
      <div className={`grid gap-2 ${columns}`}>
        {options.map(option => {
          const active = value === option.value

          return (
            <Button
              key={option.value}
              type="button"
              variant={active ? 'action' : 'premium-secondary'}
              size="premium-sm"
              onClick={() => onChange(option.value)}
              aria-pressed={active}
              style={selectionButtonStyle(active)}
              className="h-auto min-h-[76px] flex-col items-start justify-start gap-1.5 px-4 py-3 text-left whitespace-normal leading-5 ring-1 ring-transparent transition-all hover:-translate-y-0.5 hover:ring-brand-blue/20"
            >
              <span className="text-sm font-semibold leading-5" style={{ color: 'inherit' }}>{option.label}</span>
              {option.description ? (
                <span
                  className="text-[11px] leading-4"
                  style={{ color: active ? 'rgba(255,255,255,0.8)' : 'rgba(16,32,62,0.72)' }}
                >
                  {option.description}
                </span>
              ) : null}
            </Button>
          )
        })}
      </div>
    </div>
  )
}

function NumberPills({
  label,
  description,
  options,
  value,
  onChange,
  suffix = '',
}: {
  label: string
  description?: string
  options: number[]
  value: number | null
  onChange: Dispatch<SetStateAction<number | null>>
  suffix?: string
}) {
  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-brand-text-dark">{label}</h3>
        {description ? <p className="text-xs text-brand-text-medium">{description}</p> : null}
      </div>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
        {options.map(option => {
          const active = value === option
          return (
            <Button
              key={option}
              type="button"
              variant={active ? 'action' : 'premium-secondary'}
              size="premium-sm"
              onClick={() => onChange(option)}
              aria-pressed={active}
              style={selectionButtonStyle(active)}
              className="h-12 px-3 ring-1 ring-transparent transition-all hover:-translate-y-0.5 hover:ring-brand-blue/20"
            >
              {option}
              {suffix}
            </Button>
          )
        })}
      </div>
    </div>
  )
}

export function PropertyIntelligenceWorkbench({
  gateEnabled,
}: {
  gateEnabled: boolean
}) {
  const [advancedMode, setAdvancedMode] = useState(false)
  const [propertyName, setPropertyName] = useState(DEFAULT_FORM.propertyName)
  const [location, setLocation] = useState(DEFAULT_FORM.location)
  const [propertyType, setPropertyType] = useState<PropertyType>(DEFAULT_FORM.propertyType)
  const [typology, setTypology] = useState(DEFAULT_FORM.typology)
  const [areaM2, setAreaM2] = useState<number | null>(DEFAULT_FORM.areaM2)
  const [bedrooms, setBedrooms] = useState<number | null>(DEFAULT_FORM.bedrooms)
  const [market, setMarket] = useState<MarketTier | ''>(DEFAULT_FORM.market)
  const [condition, setCondition] = useState<ConditionTier | ''>(DEFAULT_FORM.condition)
  const [furnished, setFurnished] = useState<boolean | null>(DEFAULT_FORM.furnished)
  const [balcony, setBalcony] = useState<boolean | null>(DEFAULT_FORM.balcony)
  const [pool, setPool] = useState<boolean | null>(DEFAULT_FORM.pool)
  const [garage, setGarage] = useState<boolean | null>(DEFAULT_FORM.garage)
  const [source, setSource] = useState<LeadSource | ''>(DEFAULT_FORM.source)
  const [note, setNote] = useState(DEFAULT_FORM.note)
  const [highlights, setHighlights] = useState(DEFAULT_FORM.highlights)
  const [listingUrl, setListingUrl] = useState(DEFAULT_FORM.listingUrl)
  const [currency, setCurrency] = useState<CurrencyCode | ''>(DEFAULT_FORM.currency)
  const [profile, setProfile] = useState<AnalysisProfile>(DEFAULT_FORM.profile)
  const [ownerFlexibility, setOwnerFlexibility] = useState<OwnerFlexibilityLevel>(DEFAULT_FORM.ownerContext.flexibility)
  const [ownerOperatingModel, setOwnerOperatingModel] = useState<OwnerOperatingModel>(DEFAULT_FORM.ownerContext.operatingModel)
  const [historicalRevenue, setHistoricalRevenue] = useState<number | null>(DEFAULT_FORM.ownerContext.historicalRevenue)
  const [rentedDays, setRentedDays] = useState<number | null>(DEFAULT_FORM.ownerContext.rentedDays)
  const [maintenanceNote, setMaintenanceNote] = useState(DEFAULT_FORM.ownerContext.maintenanceNote)
  const [result, setResult] = useState<{
    traceId: string
    result: Record<string, unknown>
    markdown: string
  } | null>(null)
  const [resultView, setResultView] = useState<ResultView>('summary')
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [inputText, setInputText] = useState(INITIAL_GUIDED_JSON)

  const guidedPayload = useMemo(
    () => ({
      lead: {
        name: propertyName.trim() || DEFAULT_FORM.propertyName,
        source: source || null,
        note: note.trim() || DEFAULT_FORM.note,
      },
      property: {
        location: location.trim() || null,
        typology: `${propertyType} ${typology.trim() || ''}`.trim() || null,
        areaM2: areaM2 ?? null,
        bedrooms: bedrooms ?? null,
        market: market || null,
        condition: condition || null,
        furnished,
        balcony,
        pool,
        garage,
        highlights: highlights.trim() || null,
        listingUrl: listingUrl.trim() || null,
      },
      assumptions: {
        currency: currency || null,
        ...getProfileAssumptions(profile),
      },
      ownerContext: {
        flexibility: ownerFlexibility,
        operatingModel: ownerOperatingModel,
        historicalRevenue,
        rentedDays,
        maintenanceNote: maintenanceNote.trim() || null,
      },
    }),
    [
      areaM2,
      balcony,
      bedrooms,
      condition,
      currency,
      furnished,
      garage,
      highlights,
      listingUrl,
      location,
      market,
      note,
      historicalRevenue,
      pool,
      profile,
      propertyName,
      propertyType,
      ownerFlexibility,
      ownerOperatingModel,
      rentedDays,
      maintenanceNote,
      source,
      typology,
    ]
  )

  const guidedHasRequiredInputs = location.trim().length > 0 && typology.trim().length > 0 && propertyType.trim().length > 0

  const guidedProgress = useMemo(() => {
    const steps = [
      { label: 'Localização', done: location.trim().length > 0 },
      { label: 'Tipo', done: propertyType.trim().length > 0 },
      { label: 'Tipologia', done: typology.trim().length > 0 },
      { label: 'Moeda', done: currency.trim().length > 0 },
    ]

    const completed = steps.filter(step => step.done).length

    return {
      steps,
      completed,
      total: steps.length,
      percent: Math.round((completed / steps.length) * 100),
    }
  }, [currency, location, propertyType, typology])

  const summary = useMemo(() => {
    const analysis = result?.result as
      | {
          status?: string
          strategy?: { recommendedStayType?: string; reason?: string }
          audit?: { status?: string; coverageScore?: number }
          publication?: { approved?: boolean }
          location?: { marketTier?: string; confidence?: number; baseRatePerM2?: number }
          telemetry?: { events?: Array<{ name: string }> }
        }
      | undefined

    return {
      status: analysis?.status ?? '-',
      recommendation: analysis?.strategy?.recommendedStayType ?? '-',
      auditStatus: analysis?.audit?.status ?? '-',
      coverageScore: analysis?.audit?.coverageScore ?? 0,
      publicationApproved: analysis?.publication?.approved ?? false,
      marketTier: analysis?.location?.marketTier ?? '-',
      baseRatePerM2: analysis?.location?.baseRatePerM2 ?? 0,
      confidence: analysis?.location?.confidence ?? 0,
      telemetryCount: analysis?.telemetry?.events?.length ?? 0,
    }
  }, [result])

  const selectedSummary = useMemo(
    () => [
      { label: 'Imóvel', value: propertyName || '-' },
      { label: 'Localização', value: location.trim() || 'Não informado' },
      { label: 'Tipo', value: propertyType || 'Não informado' },
      { label: 'Tipologia', value: typology.trim() || 'Não informado' },
      { label: 'Mercado', value: MARKET_OPTIONS.find(option => option.value === market)?.label ?? 'Não informado' },
      { label: 'Perfil', value: PROFILE_OPTIONS.find(option => option.value === profile)?.label ?? profile },
      { label: 'Moeda', value: currency || 'Não informado' },
    ],
    [currency, location, market, profile, propertyName, propertyType, typology]
  )

  const resultHeadline = result
    ? summary.status === 'ready'
      ? `O imóvel aponta melhor encaixe em ${formatStayTypeLabel(summary.recommendation)}.`
      : 'A leitura ainda está em preparação e depende dos dados críticos em falta.'
    : ''

  async function handleSubmit() {
    setError(null)

    if (!advancedMode && !guidedHasRequiredInputs) {
      setError('Localização, tipo e tipologia são obrigatórios para esta análise.')
      return
    }

    const payload = advancedMode
      ? (() => {
          try {
            return JSON.parse(inputText) as Record<string, unknown>
          } catch {
            setError('O JSON informado não é válido.')
            return null
          }
        })()
      : guidedPayload

    if (!payload) {
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/property-intelligence/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const responsePayload = await response.json()

      if (!response.ok) {
        setResult(null)
        setResultView('summary')
        setError(responsePayload?.error?.message || 'Não foi possível executar a análise.')
        return
      }

      setResult(responsePayload)
      setResultView('summary')
    } catch (requestError) {
      setResult(null)
      setResultView('summary')
      setError(requestError instanceof Error ? requestError.message : 'Falha ao executar a análise.')
    } finally {
      setIsLoading(false)
    }
  }

  function handleReset() {
    setAdvancedMode(false)
    setPropertyName(DEFAULT_FORM.propertyName)
    setLocation(DEFAULT_FORM.location)
    setPropertyType(DEFAULT_FORM.propertyType)
    setTypology(DEFAULT_FORM.typology)
    setAreaM2(DEFAULT_FORM.areaM2)
    setBedrooms(DEFAULT_FORM.bedrooms)
    setMarket(DEFAULT_FORM.market)
    setCondition(DEFAULT_FORM.condition)
    setFurnished(DEFAULT_FORM.furnished)
    setBalcony(DEFAULT_FORM.balcony)
    setPool(DEFAULT_FORM.pool)
    setGarage(DEFAULT_FORM.garage)
    setSource(DEFAULT_FORM.source)
    setNote(DEFAULT_FORM.note)
    setHighlights(DEFAULT_FORM.highlights)
    setListingUrl(DEFAULT_FORM.listingUrl)
    setCurrency(DEFAULT_FORM.currency)
    setProfile(DEFAULT_FORM.profile)
    setInputText(INITIAL_GUIDED_JSON)
    setResult(null)
    setResultView('summary')
    setError(null)
  }

  function handleToggleAdvanced(enabled: boolean) {
    setAdvancedMode(enabled)
    if (enabled) {
      setInputText(formatJson(guidedPayload))
    }
  }

  async function handleCopyMarkdown() {
    if (!result?.markdown) {
      return
    }

    await navigator.clipboard.writeText(result.markdown)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr] xl:items-start">
      <div className="space-y-6">
        <PremiumCard className="overflow-hidden border-brand-blue/10 bg-gradient-to-br from-brand-blue/10 via-brand-white to-brand-gold/10">
          <div className="relative space-y-5">
            <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-[2px] text-brand-text-medium">
              <span className="rounded-full border border-brand-border-soft bg-white/85 px-3 py-1">Entrada guiada</span>
              <span className="rounded-full border border-brand-border-soft bg-white/85 px-3 py-1">Sugestões prontas</span>
              <span className="rounded-full border border-brand-border-soft bg-white/85 px-3 py-1">Relatório premium</span>
            </div>

            <div className="grid gap-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] xl:items-start">
              <div className="min-w-0 space-y-3 max-w-lg">
                <h2 className="text-3xl font-semibold tracking-tight text-brand-text-dark sm:text-4xl">
                  Preencha só o essencial. O sistema estrutura o restante.
                </h2>
                <p className="max-w-xl text-sm leading-6 text-brand-text-medium">
                  Localização, tipo e tipologia são obrigatórios. Comodidades, URL e notas complementam a análise sem poluir a experiência.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:min-w-0">
                <div className="rounded-2xl border border-brand-border-soft bg-white/90 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[2px] text-brand-text-medium">Progresso guiado</p>
                  <p className="mt-2 text-2xl font-semibold tracking-tight text-brand-text-dark">
                    {guidedProgress.percent}%
                  </p>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-brand-surface">
                    <div
                      className="h-full rounded-full bg-brand-blue transition-all"
                      style={{ width: `${guidedProgress.percent}%` }}
                    />
                  </div>
                </div>
                <div className="rounded-2xl border border-brand-border-soft bg-white/90 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[2px] text-brand-text-medium">Campos-chave</p>
                  <p className="mt-2 text-sm font-semibold text-brand-text-dark">
                    {guidedProgress.completed}/{guidedProgress.total} prontos para gerar
                  </p>
                  <p className="mt-1 text-xs text-brand-text-medium">
                    Localização, tipo, tipologia e moeda
                  </p>
                </div>
              </div>
            </div>
          </div>
        </PremiumCard>

        <div id="executar-analise" className="scroll-mt-28 xl:sticky xl:top-6 xl:z-20">
          <PremiumCard className="border-brand-blue/10 bg-gradient-to-br from-white via-white to-brand-blue/5 shadow-sm">
            <div className="space-y-4">
              <div className="space-y-3 max-w-2xl">
                <p className="text-[10px] font-black uppercase tracking-[2px] text-brand-text-medium">Executar agora</p>
                <h3 className="text-2xl font-semibold tracking-tight text-brand-text-dark sm:text-3xl">
                  Gerar relatório sem procurar a ação no fim da página.
                </h3>
                <p className="max-w-2xl text-sm leading-6 text-brand-text-medium">
                  Preencha os campos essenciais e use o comando principal para montar a análise premium. Se faltar contexto, o sistema avisa antes de executar.
                </p>
              </div>

              <div className="rounded-3xl border border-brand-blue/10 bg-[#10203E] p-4 text-white shadow-[0_18px_48px_rgba(16,32,62,0.18)]">
                <p className="text-[10px] font-black uppercase tracking-[2px] text-white/70">Comando principal</p>
                <div className="mt-3 flex flex-col gap-3">
                  <Button
                    type="button"
                    variant="premium-primary"
                    size="premium-md"
                    onClick={handleSubmit}
                    disabled={isLoading || !gateEnabled || (!advancedMode && !guidedHasRequiredInputs)}
                    className="h-12 w-full justify-center border border-white/15 bg-white text-[#10203E] shadow-[0_12px_30px_rgba(255,255,255,0.08)] hover:bg-white/95 disabled:cursor-not-allowed disabled:opacity-100 disabled:bg-white/20 disabled:text-white disabled:border-white/25"
                  >
                    <Play className="h-4 w-4" />
                    {isLoading ? 'A gerar...' : 'Executar análise'}
                  </Button>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Button
                      type="button"
                      variant="premium-secondary"
                      size="premium-sm"
                      onClick={handleReset}
                      className="w-full justify-center border-white/15 bg-white/95 text-brand-text-dark hover:bg-white"
                    >
                      <RotateCcw className="h-4 w-4" />
                      Repor respostas
                    </Button>
                    <Button
                      type="button"
                      variant="premium-secondary"
                      size="premium-sm"
                      onClick={() => setInputText(formatJson(guidedPayload))}
                      className="w-full justify-center border-white/15 bg-white/95 text-brand-text-dark hover:bg-white"
                    >
                      <Copy className="h-4 w-4" />
                      Copiar JSON
                    </Button>
                  </div>
                </div>
              </div>

              <p className="max-w-2xl text-xs leading-5 text-brand-text-medium">
                O botão principal fica sempre visível. Quando a execução estiver bloqueada, a própria interface indica o que falta.
              </p>
            </div>
          </PremiumCard>
        </div>

        <div className="grid gap-6">
          <PremiumCard className="space-y-5">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-brand-blue" />
              <h3 className="text-sm font-semibold text-brand-text-dark">Imóvel</h3>
            </div>

            <ChoiceGroup
              label="Perfil da análise"
              description="Sugestão padrão para padronizar a leitura e o nível de prudência."
              options={PROFILE_OPTIONS}
              value={profile}
              onChange={setProfile}
              columns="grid-cols-1 sm:grid-cols-3"
            />

            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-brand-text-dark">Nome interno do imóvel</h4>
              <Input
                value={propertyName}
                onChange={event => setPropertyName(event.target.value)}
                placeholder="Ex.: AHS Premium apart 2 swing pool 5 min beach"
              />
            </div>

            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-brand-text-dark">Localização</h4>
              <div className="grid gap-2 sm:grid-cols-3">
                {LOCATION_OPTIONS.map(option => {
                  const active = location === option.value
                  return (
                    <Button
                      key={option.value}
                      type="button"
                      variant={active ? 'action' : 'premium-secondary'}
                      size="premium-sm"
                      onClick={() => setLocation(option.value)}
                      aria-pressed={active}
                      style={selectionButtonStyle(active)}
                      className="transition-all hover:-translate-y-0.5 hover:ring-1 hover:ring-brand-blue/20"
                    >
                      {option.label}
                    </Button>
                  )
                })}
              </div>
              <Input
                value={location}
                onChange={event => setLocation(event.target.value)}
                placeholder="Ou escreva outra localização"
              />
              <p className="text-xs text-brand-text-medium">
                A localização alimenta o benchmark de mercado e deve estar sempre preenchida.
              </p>
            </div>

            <ChoiceGroup
              label="Tipo do imóvel"
              description="Seleção obrigatória para clarificar o enquadramento da análise."
              options={PROPERTY_TYPE_OPTIONS}
              value={propertyType}
              onChange={setPropertyType}
              columns="grid-cols-2"
            />

            <ChoiceGroup
              label="Tipologia"
              description="Resposta rápida para manter o processo padronizado."
              options={TYPOLOGY_OPTIONS}
              value={typology}
              onChange={setTypology}
              columns="grid-cols-2 sm:grid-cols-5"
            />

            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-brand-text-dark">Área e quartos</h4>
              <div className="grid gap-4 sm:grid-cols-2">
                <NumberPills
                  label="Área"
                  description="Selecione o valor mais próximo."
                  options={AREA_OPTIONS}
                  value={areaM2}
                  onChange={setAreaM2}
                  suffix=" m²"
                />
                <NumberPills
                  label="Quartos"
                  description="Inclui estúdios e moradias."
                  options={BEDROOM_OPTIONS}
                  value={bedrooms}
                  onChange={setBedrooms}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant={areaM2 == null || bedrooms == null ? 'action' : 'premium-secondary'}
                  size="premium-sm"
                  onClick={() => {
                    setAreaM2(null)
                    setBedrooms(null)
                  }}
                  aria-pressed={areaM2 == null || bedrooms == null}
                  style={selectionButtonStyle(areaM2 == null || bedrooms == null)}
                  className="transition-all hover:-translate-y-0.5 hover:ring-1 hover:ring-brand-blue/20"
                >
                  Não sei
                </Button>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <ChoiceGroup
                label="Mercado"
                description="Classificação usada pelo motor."
                options={MARKET_OPTIONS}
                value={market}
                onChange={setMarket}
                columns="grid-cols-2"
              />
              <ChoiceGroup
                label="Estado do imóvel"
                description="Escolha o cenário que melhor descreve o ativo."
                options={CONDITION_OPTIONS}
                value={condition}
                onChange={setCondition}
                columns="grid-cols-2"
              />
            </div>
          </PremiumCard>

          <PremiumCard className="space-y-5">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-brand-blue" />
              <h3 className="text-sm font-semibold text-brand-text-dark">Comodidades</h3>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-brand-text-dark">Mobilado</h4>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant={furnished ? 'action' : 'premium-secondary'}
                    size="premium-sm"
                    onClick={() => setFurnished(true)}
                    aria-pressed={furnished === true}
                    style={selectionButtonStyle(furnished === true)}
                  >
                    Sim
                  </Button>
                  <Button
                    type="button"
                    variant={furnished === false ? 'action' : 'premium-secondary'}
                    size="premium-sm"
                    onClick={() => setFurnished(false)}
                    aria-pressed={furnished === false}
                    style={selectionButtonStyle(furnished === false)}
                  >
                    Não
                  </Button>
                  <Button
                    type="button"
                    variant={furnished == null ? 'action' : 'premium-secondary'}
                    size="premium-sm"
                    onClick={() => setFurnished(null)}
                    aria-pressed={furnished == null}
                    style={selectionButtonStyle(furnished == null)}
                  >
                    Não sei
                  </Button>
                </div>
              </div>
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-brand-text-dark">Varanda</h4>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant={balcony === true ? 'action' : 'premium-secondary'}
                    size="premium-sm"
                    onClick={() => setBalcony(true)}
                    aria-pressed={balcony === true}
                    style={selectionButtonStyle(balcony === true)}
                  >
                    Sim
                  </Button>
                  <Button
                    type="button"
                    variant={balcony === false ? 'action' : 'premium-secondary'}
                    size="premium-sm"
                    onClick={() => setBalcony(false)}
                    aria-pressed={balcony === false}
                    style={selectionButtonStyle(balcony === false)}
                  >
                    Não
                  </Button>
                </div>
              </div>
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-brand-text-dark">Piscina</h4>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant={pool === true ? 'action' : 'premium-secondary'}
                    size="premium-sm"
                    onClick={() => setPool(true)}
                    aria-pressed={pool === true}
                    style={selectionButtonStyle(pool === true)}
                  >
                    Sim
                  </Button>
                  <Button
                    type="button"
                    variant={pool === false ? 'action' : 'premium-secondary'}
                    size="premium-sm"
                    onClick={() => setPool(false)}
                    aria-pressed={pool === false}
                    style={selectionButtonStyle(pool === false)}
                  >
                    Não
                  </Button>
                </div>
              </div>
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-brand-text-dark">Garagem</h4>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant={garage === true ? 'action' : 'premium-secondary'}
                    size="premium-sm"
                    onClick={() => setGarage(true)}
                    aria-pressed={garage === true}
                    style={selectionButtonStyle(garage === true)}
                  >
                    Sim
                  </Button>
                  <Button
                    type="button"
                    variant={garage === false ? 'action' : 'premium-secondary'}
                    size="premium-sm"
                    onClick={() => setGarage(false)}
                    aria-pressed={garage === false}
                    style={selectionButtonStyle(garage === false)}
                  >
                    Não
                  </Button>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-brand-text-dark">Comodidades a destacar</h4>
              <Textarea
                value={highlights}
                onChange={event => setHighlights(event.target.value)}
                placeholder="Ex.: vista mar, varanda solarenga, piscina comum, garagem coberta..."
                className="min-h-[120px]"
              />
            </div>
          </PremiumCard>

          <PremiumCard className="space-y-5">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-brand-blue" />
              <h3 className="text-sm font-semibold text-brand-text-dark">Contexto do anúncio</h3>
            </div>

            <ChoiceGroup
              label="Origem da avaliação"
              description="De onde veio a oportunidade."
              options={SOURCE_OPTIONS}
              value={source}
              onChange={setSource}
              columns="grid-cols-2 sm:grid-cols-3"
            />
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant={!source ? 'action' : 'premium-secondary'}
                size="premium-sm"
                onClick={() => setSource('')}
                aria-pressed={!source}
                style={selectionButtonStyle(!source)}
              >
                Não sei
              </Button>
            </div>

            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-brand-text-dark">URL do anúncio</h4>
              <Input
                value={listingUrl}
                onChange={event => setListingUrl(event.target.value)}
                placeholder="Opcional: cole a URL da plataforma, se existir"
              />
              <p className="text-xs text-brand-text-medium">
                Campo complementar. Ajuda a enriquecer a análise quando o imóvel já estiver publicado numa plataforma.
              </p>
            </div>

            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-brand-text-dark">Moeda</h4>
              <div className="grid gap-2 sm:grid-cols-4">
                {CURRENCY_OPTIONS.map(option => {
                  const active = currency === option.value
                  return (
                  <Button
                    key={option.value}
                    type="button"
                    variant={active ? 'action' : 'premium-secondary'}
                    size="premium-sm"
                    onClick={() => setCurrency(option.value)}
                    aria-pressed={active}
                    style={selectionButtonStyle(active)}
                  >
                    {option.label}
                  </Button>
                )
              })}
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-brand-text-dark">Objetivo da leitura</h4>
              <div className="grid gap-2 sm:grid-cols-3">
                {NOTE_OPTIONS.map(option => {
                  const active = note === option.value
                  return (
                  <Button
                    key={option.value}
                    type="button"
                    variant={active ? 'action' : 'premium-secondary'}
                    size="premium-sm"
                    onClick={() => setNote(option.value)}
                    aria-pressed={active}
                    style={selectionButtonStyle(active)}
                    className="h-auto min-h-[76px] flex-col items-start justify-start gap-1.5 px-4 py-3 text-left whitespace-normal leading-5"
                  >
                    <span className="text-sm font-semibold leading-5" style={{ color: 'inherit' }}>{option.label}</span>
                    <span
                      className="text-[11px] leading-4"
                      style={{ color: active ? 'rgba(255,255,255,0.8)' : 'rgba(16,32,62,0.72)' }}
                    >
                      {option.value}
                    </span>
                  </Button>
                )
              })}
              </div>
              <Input
                value={note}
                onChange={event => setNote(event.target.value)}
                placeholder="Adicione uma nota curta se precisar de mais contexto"
              />
            </div>
          </PremiumCard>
        </div>

        <PremiumCard className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-brand-text-dark">Modo avançado</h3>
              <p className="text-xs text-brand-text-medium">
                Para uso técnico. O JSON só aparece se você optar por editar manualmente.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium text-brand-text-medium">Editar JSON</span>
              <Switch checked={advancedMode} onCheckedChange={handleToggleAdvanced} />
            </div>
          </div>

          {advancedMode ? (
            <Textarea
              value={inputText}
              onChange={event => setInputText(event.target.value)}
              className="min-h-[280px] font-mono text-[12px] leading-5"
              spellCheck={false}
            />
          ) : (
            <div className="rounded-2xl border border-dashed border-brand-border-soft bg-brand-surface/50 p-4 text-sm text-brand-text-medium">
              O sistema vai montar o JSON internamente com base nas respostas acima. Mantenha este modo desligado para uma experiência mais simples.
            </div>
          )}
        </PremiumCard>

        <div className="rounded-3xl border border-brand-border-soft bg-white/80 p-4 shadow-[0_12px_36px_rgba(16,32,62,0.06)] backdrop-blur-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-brand-text-dark">Atalhos úteis</h3>
              <p className="text-xs text-brand-text-medium">
                O comando principal está no topo. Aqui ficam apenas ações de apoio para manter a página limpa.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button type="button" variant="premium-secondary" size="premium-sm" onClick={handleReset}>
                <RotateCcw className="h-4 w-4" />
                Repor respostas
              </Button>
              <Button
                type="button"
                variant="premium-secondary"
                size="premium-sm"
                onClick={() => setInputText(formatJson(guidedPayload))}
              >
                <Copy className="h-4 w-4" />
                Copiar JSON
              </Button>
            </div>
          </div>
        </div>

        {!gateEnabled && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <strong className="font-semibold">Feature gate desligado.</strong> A capability está desativada por configuração de ambiente.
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
            <strong className="font-semibold">Falha:</strong> {error}
          </div>
        )}
      </div>

      <div className="space-y-4 xl:sticky xl:top-6">
        <PremiumCard className="space-y-4 border-brand-blue/10 bg-gradient-to-br from-white via-white to-brand-blue/5 shadow-sm">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-brand-blue" />
            <h3 className="text-sm font-semibold text-brand-text-dark">Entrada padronizada</h3>
          </div>

          <div className="rounded-3xl border border-brand-blue/15 bg-[#10203E] p-4 text-white shadow-[0_16px_42px_rgba(16,32,62,0.18)]">
            <p className="text-[10px] font-black uppercase tracking-[2px] text-white/65">Pré-visualização</p>
            <p className="mt-2 text-lg font-semibold leading-6">{propertyName}</p>
            <p className="mt-1 text-sm leading-6 text-white/78">
              {location.trim() || 'Localização em aberto'} · {propertyType} · {typology}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            {selectedSummary.map((item, index) => (
              <div
                key={item.label}
                className={`rounded-2xl border p-4 ${
                  index === 0
                    ? 'border-brand-blue/20 bg-brand-blue/5'
                    : 'border-brand-border-soft bg-white/90'
                }`}
              >
                <p className="text-[10px] font-black uppercase tracking-[2px] text-brand-text-medium">{item.label}</p>
                <p className="mt-2 text-sm font-semibold leading-5 text-brand-text-dark">{item.value}</p>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-brand-border-soft bg-brand-surface/60 p-4 text-sm text-brand-text-medium">
            <p className="font-semibold text-brand-text-dark">Resumo da entrada</p>
            <p className="mt-2">
              O motor recebe uma estrutura consistente, com sugestões padronizadas e uma única fonte de verdade para o relatório.
            </p>
          </div>
        </PremiumCard>

        {result ? (
          <>
            <PremiumCard className="space-y-4 border-brand-gold/15 bg-gradient-to-br from-white via-white to-brand-gold/10 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-brand-blue" />
                    <h3 className="text-sm font-semibold text-brand-text-dark">Leitura concluída</h3>
                  </div>
                  <p className="max-w-md text-sm leading-6 text-brand-text-medium">
                    A análise já produziu um estado, uma recomendação e uma auditoria. O painel abaixo resume a leitura em blocos curtos.
                  </p>
                </div>
                <div className="rounded-2xl border border-brand-border-soft bg-white/90 px-4 py-3 text-right">
                  <p className="text-[10px] font-black uppercase tracking-[2px] text-brand-text-medium">Confiança</p>
                  <p className="mt-1 text-2xl font-semibold tracking-tight text-brand-text-dark">
                    {Math.round(summary.confidence * 100)}%
                  </p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <PremiumMetricCard
                  label="Estado"
                  value={summary.status}
                  icon={CheckCircle2}
                  tone={summary.status === 'ready' ? 'success' : 'blue'}
                  compact
                />
                <PremiumMetricCard
                  label="Recomendação"
                  value={summary.recommendation}
                  icon={Sparkles}
                  tone="gold"
                  compact
                />
                <PremiumMetricCard
                  label="Auditoria"
                  value={summary.auditStatus}
                  icon={ShieldAlert}
                  tone={summary.auditStatus === 'pass' ? 'success' : 'danger'}
                  compact
                />
                <PremiumMetricCard
                  label="Cobertura"
                  value={`${Math.round(summary.coverageScore * 100)}%`}
                  icon={CheckCircle2}
                  tone="blue"
                  compact
                />
              </div>

              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-brand-text-dark">Leitura em uma frase</h3>
                  <p className="max-w-2xl text-sm leading-6 text-brand-text-medium">{resultHeadline}</p>
                </div>
                <Button
                  type="button"
                  variant="premium-secondary"
                  size="premium-sm"
                  onClick={handleCopyMarkdown}
                >
                  <Copy className="h-4 w-4" />
                  {copied ? 'Copiado' : 'Copiar dossiê'}
                </Button>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-brand-border-soft bg-white/90 px-4 py-3 text-xs font-semibold text-brand-text-dark">
                  Market tier: {summary.marketTier}
                </div>
                <div className="rounded-2xl border border-brand-border-soft bg-white/90 px-4 py-3 text-xs font-semibold text-brand-text-dark">
                  Base rate / m²: {summary.baseRatePerM2 || '-'}
                </div>
                <div className="rounded-2xl border border-brand-border-soft bg-white/90 px-4 py-3 text-xs font-semibold text-brand-text-dark">
                  Telemetria: {summary.telemetryCount} eventos
                </div>
              </div>

              <div className="rounded-3xl border border-brand-border-soft bg-brand-surface/50 p-1">
                <div className="grid grid-cols-3 gap-1">
                  {[
                    { key: 'summary' as const, label: 'Resumo' },
                    { key: 'json' as const, label: 'JSON' },
                    { key: 'markdown' as const, label: 'Markdown' },
                  ].map(tab => {
                    const active = resultView === tab.key

                    return (
                      <Button
                        key={tab.key}
                        type="button"
                        variant={active ? 'action' : 'premium-secondary'}
                        size="premium-sm"
                        onClick={() => setResultView(tab.key)}
                        aria-pressed={active}
                        style={selectionButtonStyle(active)}
                        className="w-full justify-center"
                      >
                        {tab.label}
                      </Button>
                    )
                  })}
                </div>
              </div>

              {resultView === 'summary' ? (
                <div className="space-y-3">
                  <div className="rounded-2xl border border-brand-border-soft bg-brand-surface/50 p-4 text-sm text-brand-text-medium">
                    <p className="font-semibold text-brand-text-dark">Saída estruturada</p>
                    <p className="mt-2 leading-6">
                      O resumo abaixo mostra os indicadores principais. Os detalhes técnicos ficam nas abas JSON e Markdown.
                    </p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-brand-border-soft bg-white/90 p-4">
                      <p className="text-[10px] font-black uppercase tracking-[2px] text-brand-text-medium">Estado de publicação</p>
                      <p className="mt-2 text-sm font-semibold text-brand-text-dark">
                        {summary.publicationApproved ? 'Aprovado' : 'Pendente'}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-brand-border-soft bg-white/90 p-4">
                      <p className="text-[10px] font-black uppercase tracking-[2px] text-brand-text-medium">Confiança da leitura</p>
                      <p className="mt-2 text-sm font-semibold text-brand-text-dark">{Math.round(summary.confidence * 100)}%</p>
                    </div>
                    <div className="rounded-2xl border border-brand-border-soft bg-white/90 p-4">
                      <p className="text-[10px] font-black uppercase tracking-[2px] text-brand-text-medium">Recomendação</p>
                      <p className="mt-2 text-sm font-semibold text-brand-text-dark">
                        {formatStayTypeLabel(summary.recommendation)}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-brand-border-soft bg-white/90 p-4">
                      <p className="text-[10px] font-black uppercase tracking-[2px] text-brand-text-medium">Auditoria</p>
                      <p className="mt-2 text-sm font-semibold text-brand-text-dark">{summary.auditStatus}</p>
                    </div>
                  </div>
                </div>
              ) : resultView === 'json' ? (
                <pre className="max-h-[420px] overflow-auto rounded-2xl border border-brand-border-soft bg-brand-bg p-4 text-[12px] leading-5 text-brand-text-dark">
                  {formatJson(result.result)}
                </pre>
              ) : (
                <pre className="max-h-[420px] overflow-auto whitespace-pre-wrap rounded-2xl border border-brand-border-soft bg-brand-white p-4 text-[12px] leading-5 text-brand-text-dark">
                  {result.markdown}
                </pre>
              )}
            </PremiumCard>
          </>
        ) : (
          <PremiumCard className="space-y-4 border-dashed border-brand-border-soft bg-gradient-to-br from-white via-white to-brand-surface/40">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-brand-gold" />
              <h3 className="text-sm font-semibold text-brand-text-dark">Pronto para a primeira execução</h3>
            </div>
            <p className="text-sm leading-6 text-brand-text-medium">
              Quando clicar em <span className="font-semibold text-brand-text-dark">Gerar relatório</span>, este painel vai revelar o estado, a recomendação, a auditoria e o dossiê final.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {selectedSummary.slice(1, 5).map(item => (
                <div key={item.label} className="rounded-2xl border border-brand-border-soft bg-white/90 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[2px] text-brand-text-medium">{item.label}</p>
                  <p className="mt-2 text-sm font-semibold text-brand-text-dark">{item.value}</p>
                </div>
              ))}
            </div>
            <div className="rounded-2xl border border-dashed border-brand-border-soft bg-brand-white p-4 text-sm text-brand-text-medium">
              Execute uma análise para ver o relatório estruturado aqui.
            </div>
          </PremiumCard>
        )}
      </div>
    </div>
  )
}
