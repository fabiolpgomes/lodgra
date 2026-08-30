'use client'

import { useEffect, useMemo, useState, type CSSProperties, type Dispatch, type SetStateAction } from 'react'
import { CheckCircle2, Copy, Play, RotateCcw, ShieldAlert, Sparkles, WandSparkles } from 'lucide-react'

import { Button } from '@/components/common/ui/button'
import { Input } from '@/components/common/ui/input'
import { PremiumCard, PremiumMetricCard } from '@/components/common/layout/PremiumPage'
import { Textarea } from '@/components/common/ui/textarea'
import type { ReadingObjective } from '@/lib/property-intelligence'

type AnalysisProfile = 'conservative' | 'balanced' | 'premium'
type LeadSource = 'WhatsApp' | 'Airbnb' | 'Booking' | 'Website' | 'Manual'
type MarketTier = 'coastal' | 'urban' | 'suburban' | 'rural'
type ConditionTier = 'poor' | 'fair' | 'good' | 'excellent'
type CurrencyCode = 'EUR' | 'BRL' | 'GBP' | 'USD'
type PropertyType = 'Apartamento' | 'Vivenda' | 'Cabana' | 'Prédio'
type ResultView = 'summary' | 'markdown'
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

const READING_OBJECTIVE_OPTIONS: QuickPick<ReadingObjective>[] = [
  {
    value: 'viability',
    label: 'Viabilidade',
    description: 'Avaliar se o imóvel faz sentido para entrada comercial.',
  },
  {
    value: 'executive_report',
    label: 'Relatório executivo',
    description: 'Gerar uma peça premium para o proprietário ou lead.',
  },
  {
    value: 'compare_scenarios',
    label: 'Comparar cenários',
    description: 'Contrapor leitura base, conservadora e otimizada.',
  },
]

const DEFAULT_READING_OBJECTIVES: ReadingObjective[] = [
  'viability',
  'executive_report',
  'compare_scenarios',
]

type PublicationApprovalState = 'pending' | 'approved'

type PropertyIntelligenceAnalysisResult = {
  status?: string
  strategy?: { recommendedStayType?: string; reason?: string }
  audit?: { status?: string; coverageScore?: number }
  publication?: { approved?: boolean }
  location?: { marketTier?: string; confidence?: number; baseRatePerM2?: number }
  telemetry?: { events?: Array<{ name: string }> }
}

type CompanyInfo = {
  name: string | null
  logoUrl: string | null
  websiteUrl: string | null
  email: string | null
  phone: string | null
  whatsappNumber: string | null
  primaryColor: string | null
  secondaryColor: string | null
}

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
  readingObjectives: DEFAULT_READING_OBJECTIVES,
  ownerContext: {
    flexibility: 'high' as OwnerFlexibilityLevel,
    operatingModel: 'short_mid' as OwnerOperatingModel,
    historicalRevenue: 15000,
    rentedDays: 186,
    maintenanceNote:
      'O imóvel é próprio e a locação curta e média permite manutenção preventiva, além de manter a flexibilidade de uso pelo proprietário.',
  },
}

function formatJson(value: unknown) {
  return JSON.stringify(value, null, 2)
}

function getApprovalStorageKey(traceId: string) {
  return `property-intelligence:approval:${traceId}`
}

function resolvePublicationApprovalState(
  analysisResult: PropertyIntelligenceAnalysisResult | undefined,
  storedApprovalState: PublicationApprovalState | null
) {
  return storedApprovalState === 'approved' || analysisResult?.publication?.approved ? 'approved' : 'pending'
}

function applyPublicationApprovalToMarkdown(markdown: string, approvalState: PublicationApprovalState) {
  return markdown.replace(
    /(- Estado da aprovação: )(pendente|aprovada)/,
    `$1${approvalState === 'approved' ? 'aprovada' : 'pendente'}`
  )
}

function formatCurrencyAmount(value: number, currency = 'EUR') {
  return new Intl.NumberFormat('pt-PT', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value)
}

function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!result) {
    return [16, 32, 62]
  }

  return [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
}

function stripUrlProtocol(url: string) {
  return url.replace(/^https?:\/\//i, '').replace(/\/$/, '')
}

async function loadImageDataUrl(url: string): Promise<{ dataUrl: string; format: 'PNG' | 'JPEG' } | null> {
  try {
    const response = await fetch(url)
    if (!response.ok) {
      return null
    }

    const blob = await response.blob()
    const mimeType = blob.type.toLowerCase()
    const format = mimeType.includes('jpeg') || mimeType.includes('jpg') ? 'JPEG' : mimeType.includes('png') ? 'PNG' : null

    if (!format) {
      return null
    }

    return await new Promise(resolve => {
      const reader = new FileReader()
      reader.onloadend = () => {
        const dataUrl = typeof reader.result === 'string' ? reader.result : null
        resolve(dataUrl ? { dataUrl, format } : null)
      }
      reader.onerror = () => resolve(null)
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
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

function buildSeasonalityCurve(profile: AnalysisProfile, market: MarketTier | ''): Record<string, number> {
  const marketBias = market === 'coastal' ? 0.08 : market === 'urban' ? -0.04 : market === 'suburban' ? -0.01 : -0.06

  if (profile === 'conservative') {
    return {
      jan: 0.72 + marketBias,
      feb: 0.74 + marketBias,
      mar: 0.79 + marketBias,
      apr: 0.86 + marketBias,
      may: 0.94 + marketBias,
      jun: 1.02 + marketBias,
      jul: 1.12 + marketBias,
      aug: 1.16 + marketBias,
      sep: 1.0 + marketBias,
      oct: 0.9 + marketBias,
      nov: 0.78 + marketBias,
      dec: 0.75 + marketBias,
    }
  }

  if (profile === 'premium') {
    return {
      jan: 0.56 + marketBias,
      feb: 0.59 + marketBias,
      mar: 0.68 + marketBias,
      apr: 0.8 + marketBias,
      may: 0.94 + marketBias,
      jun: 1.1 + marketBias,
      jul: 1.34 + marketBias,
      aug: 1.48 + marketBias,
      sep: 1.08 + marketBias,
      oct: 0.92 + marketBias,
      nov: 0.68 + marketBias,
      dec: 0.74 + marketBias,
    }
  }

  return {
    jan: 0.66 + marketBias,
    feb: 0.69 + marketBias,
    mar: 0.76 + marketBias,
    apr: 0.84 + marketBias,
    may: 0.96 + marketBias,
    jun: 1.08 + marketBias,
    jul: 1.28 + marketBias,
    aug: 1.38 + marketBias,
    sep: 1.02 + marketBias,
    oct: 0.88 + marketBias,
    nov: 0.72 + marketBias,
    dec: 0.76 + marketBias,
  }
}

function getProfileAssumptions(profile: AnalysisProfile, market: MarketTier | '') {
  const seasonalityCurve = buildSeasonalityCurve(profile, market)

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
        minStayNights: 7,
        highSeasonMinStayNights: 5,
        highSeasonMonths: ['jun', 'jul', 'aug', 'sep'],
        dynamicPricingEnabled: true,
        monthlySeasonality: seasonalityCurve,
      },
      shortStay: {
        occupancyPct: 0.68,
        fixedCostsMonthly: 340,
        variableCostsPct: 0.13,
        commissionPct: 0.2,
        cleaningPerTurnover: 55,
        turnoversPerMonth: 6,
        minStayNights: 5,
        highSeasonMinStayNights: 4,
        highSeasonMonths: ['jun', 'jul', 'aug', 'sep'],
        dynamicPricingEnabled: true,
        monthlySeasonality: seasonalityCurve,
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
        minStayNights: 7,
        highSeasonMinStayNights: 5,
        highSeasonMonths: ['jun', 'jul', 'aug', 'sep'],
        dynamicPricingEnabled: true,
        monthlySeasonality: seasonalityCurve,
      },
      shortStay: {
        occupancyPct: 0.8,
        fixedCostsMonthly: 280,
        variableCostsPct: 0.1,
        commissionPct: 0.16,
        cleaningPerTurnover: 45,
        turnoversPerMonth: 8,
        minStayNights: 5,
        highSeasonMinStayNights: 4,
        highSeasonMonths: ['jun', 'jul', 'aug', 'sep'],
        dynamicPricingEnabled: true,
        monthlySeasonality: seasonalityCurve,
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
      minStayNights: 7,
      highSeasonMinStayNights: 5,
      highSeasonMonths: ['jun', 'jul', 'aug', 'sep'],
      dynamicPricingEnabled: true,
      monthlySeasonality: seasonalityCurve,
    },
    shortStay: {
      occupancyPct: 0.74,
      fixedCostsMonthly: 320,
      variableCostsPct: 0.12,
      commissionPct: 0.18,
      cleaningPerTurnover: 50,
      turnoversPerMonth: 7,
      minStayNights: 5,
      highSeasonMinStayNights: 4,
      highSeasonMonths: ['jun', 'jul', 'aug', 'sep'],
      dynamicPricingEnabled: true,
      monthlySeasonality: seasonalityCurve,
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

function formatReadingObjectiveLabel(objective: ReadingObjective): string {
  if (objective === 'viability') {
    return 'Viabilidade'
  }

  if (objective === 'executive_report') {
    return 'Relatório executivo'
  }

  if (objective === 'compare_scenarios') {
    return 'Comparar cenários'
  }

  return objective
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

function MultiChoiceGroup<T extends string>({
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
  value: T[]
  onChange: Dispatch<SetStateAction<T[]>>
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
          const active = value.includes(option.value)

          return (
            <Button
              key={option.value}
              type="button"
              variant={active ? 'action' : 'premium-secondary'}
              size="premium-sm"
              onClick={() =>
                onChange(current =>
                  current.includes(option.value)
                    ? current.filter(item => item !== option.value)
                    : [...current, option.value]
                )
              }
              aria-pressed={active}
              style={selectionButtonStyle(active)}
              className="h-auto min-h-[92px] flex-col items-start justify-start gap-1.5 px-4 py-3 text-left whitespace-normal leading-5 ring-1 ring-transparent transition-all hover:-translate-y-0.5 hover:ring-brand-blue/20"
            >
              <div className="flex w-full items-start justify-between gap-2">
                <span className="text-sm font-semibold leading-5" style={{ color: 'inherit' }}>
                  {option.label}
                </span>
                {active ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : null}
              </div>
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
  companyInfo,
}: {
  gateEnabled: boolean
  companyInfo?: CompanyInfo | null
}) {
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
  const [readingObjectives, setReadingObjectives] = useState<ReadingObjective[]>(
    [...DEFAULT_FORM.readingObjectives]
  )
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
  const [markdownDraft, setMarkdownDraft] = useState<string | null>(null)
  const [publicationApprovalState, setPublicationApprovalState] = useState<PublicationApprovalState>('pending')
  const [resultView, setResultView] = useState<ResultView>('summary')
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const guidedPayload = useMemo(
    () => ({
      lead: {
        name: propertyName.trim() || DEFAULT_FORM.propertyName,
        source: source || null,
        note: note.trim() || DEFAULT_FORM.note,
      },
      readingObjectives,
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
        ...getProfileAssumptions(profile, market),
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
      readingObjectives,
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

  const reportCompany = useMemo(() => {
    const primaryColor = companyInfo?.primaryColor?.trim() || '#10203E'
    const secondaryColor = companyInfo?.secondaryColor?.trim() || '#C9A227'

    return {
      name: companyInfo?.name?.trim() || 'Lodgra',
      logoUrl: companyInfo?.logoUrl?.trim() || null,
      websiteUrl: companyInfo?.websiteUrl?.trim() || null,
      email: companyInfo?.email?.trim() || null,
      phone: companyInfo?.phone?.trim() || null,
      whatsappNumber: companyInfo?.whatsappNumber?.trim() || null,
      primaryColor,
      primaryColorRgb: hexToRgb(primaryColor),
      secondaryColor,
      secondaryColorRgb: hexToRgb(secondaryColor),
    }
  }, [companyInfo])

  const effectiveMarkdown = result ? markdownDraft ?? result.markdown : ''
  const isPublicationApproved = publicationApprovalState === 'approved' || summary.publicationApproved

  const selectedSummary = useMemo(
    () => [
      { label: 'Imóvel', value: propertyName || '-' },
      { label: 'Localização', value: location.trim() || 'Não informado' },
      { label: 'Tipo', value: propertyType || 'Não informado' },
      { label: 'Tipologia', value: typology.trim() || 'Não informado' },
      { label: 'Mercado', value: MARKET_OPTIONS.find(option => option.value === market)?.label ?? 'Não informado' },
      { label: 'Perfil', value: PROFILE_OPTIONS.find(option => option.value === profile)?.label ?? profile },
      {
        label: 'Objetivos',
        value:
          readingObjectives.length > 0
            ? readingObjectives.map(formatReadingObjectiveLabel).join(', ')
            : 'Não selecionado',
      },
      { label: 'Moeda', value: currency || 'Não informado' },
      {
        label: 'Flexibilidade',
        value: OWNER_FLEXIBILITY_OPTIONS.find(option => option.value === ownerFlexibility)?.label ?? ownerFlexibility,
      },
      {
        label: 'Operação',
        value: OWNER_OPERATING_MODEL_OPTIONS.find(option => option.value === ownerOperatingModel)?.label ?? ownerOperatingModel,
      },
      {
        label: 'Histórico',
        value:
          historicalRevenue != null || rentedDays != null
            ? `${historicalRevenue != null ? formatCurrencyAmount(historicalRevenue, 'EUR') : '€ -'} / ${rentedDays ?? '-'} dias`
            : 'Não informado',
      },
    ],
    [currency, historicalRevenue, location, market, ownerFlexibility, ownerOperatingModel, profile, propertyName, propertyType, readingObjectives, rentedDays, typology]
  )

  const resultHeadline = result
    ? summary.status === 'ready'
      ? `O imóvel aponta melhor encaixe em ${formatStayTypeLabel(summary.recommendation)}.`
      : 'A leitura ainda está em preparação e depende dos dados críticos em falta.'
    : ''

  async function handleSubmit() {
    setError(null)

    if (!guidedHasRequiredInputs) {
      setError('Localização, tipo e tipologia são obrigatórios para esta análise.')
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/property-intelligence/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(guidedPayload),
      })

      const responsePayload = await response.json()
      const analysisResult = responsePayload.result as PropertyIntelligenceAnalysisResult | undefined

      if (!response.ok) {
        setResult(null)
        setMarkdownDraft(null)
        setPublicationApprovalState('pending')
        setResultView('summary')
        setError(responsePayload?.error?.message || 'Não foi possível executar a análise.')
        return
      }

      setResult(responsePayload)
      const storedApprovalState = window.localStorage.getItem(getApprovalStorageKey(responsePayload.traceId)) as PublicationApprovalState | null
      const nextApprovalState = resolvePublicationApprovalState(analysisResult, storedApprovalState)
      setPublicationApprovalState(nextApprovalState)
      setMarkdownDraft(
        applyPublicationApprovalToMarkdown(responsePayload.markdown || '', nextApprovalState)
      )
      setResultView('summary')
    } catch (requestError) {
      setResult(null)
      setMarkdownDraft(null)
      setPublicationApprovalState('pending')
      setResultView('summary')
      setError(requestError instanceof Error ? requestError.message : 'Falha ao executar a análise.')
    } finally {
      setIsLoading(false)
    }
  }

  function handleReset() {
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
    setReadingObjectives([...DEFAULT_FORM.readingObjectives])
    setHighlights(DEFAULT_FORM.highlights)
    setListingUrl(DEFAULT_FORM.listingUrl)
    setCurrency(DEFAULT_FORM.currency)
    setProfile(DEFAULT_FORM.profile)
    setOwnerFlexibility(DEFAULT_FORM.ownerContext.flexibility)
    setOwnerOperatingModel(DEFAULT_FORM.ownerContext.operatingModel)
    setHistoricalRevenue(DEFAULT_FORM.ownerContext.historicalRevenue)
    setRentedDays(DEFAULT_FORM.ownerContext.rentedDays)
    setMaintenanceNote(DEFAULT_FORM.ownerContext.maintenanceNote)
    setResult(null)
    setMarkdownDraft(null)
    setPublicationApprovalState('pending')
    setResultView('summary')
    setError(null)
  }

  useEffect(() => {
    if (!result) {
      return
    }

    const analysisResult = result.result as PropertyIntelligenceAnalysisResult | undefined
    const storedApprovalState = window.localStorage.getItem(getApprovalStorageKey(result.traceId)) as PublicationApprovalState | null
    const nextApprovalState = resolvePublicationApprovalState(analysisResult, storedApprovalState)

    setPublicationApprovalState(nextApprovalState)
    setMarkdownDraft(applyPublicationApprovalToMarkdown(result.markdown || '', nextApprovalState))
  }, [result])

  async function handleCopyMarkdown() {
    const markdown = effectiveMarkdown
    if (!markdown) {
      return
    }

    await navigator.clipboard.writeText(markdown)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1500)
  }

  async function handleCopyTechnicalData() {
    await navigator.clipboard.writeText(formatJson(guidedPayload))
  }

  function handleApprovePublication(nextState: PublicationApprovalState) {
    if (!result) {
      return
    }

    const nextMarkdown = applyPublicationApprovalToMarkdown(markdownDraft ?? result.markdown, nextState)
    setPublicationApprovalState(nextState)
    setMarkdownDraft(nextMarkdown)
    window.localStorage.setItem(getApprovalStorageKey(result.traceId), nextState)
  }

  async function handleDownloadPdf() {
    if (!result) {
      return
    }

    const { jsPDF } = await import('jspdf')
    const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' })
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const marginX = 16
    const marginTop = 18
    const footerHeight = 24
    const lineHeight = 6
    const maxWidth = pageWidth - marginX * 2
    let cursorY = marginTop

    function ensureSpace(requiredHeight: number) {
      if (cursorY + requiredHeight > pageHeight - marginTop - footerHeight) {
        doc.addPage()
        cursorY = marginTop
      }
    }

    function addHeading(text: string) {
      ensureSpace(12)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(15)
      doc.setTextColor(16, 32, 62)
      doc.text(text, marginX, cursorY)
      cursorY += 9
    }

    function addParagraph(text: string, bold = false) {
      const lines = doc.splitTextToSize(text, maxWidth)
      ensureSpace(lines.length * lineHeight + 4)
      doc.setFont('helvetica', bold ? 'bold' : 'normal')
      doc.setFontSize(10)
      doc.setTextColor(40, 52, 72)
      doc.text(lines, marginX, cursorY)
      cursorY += lines.length * lineHeight + 2
    }

    function addFooter(pageNumber: number, totalPages: number, logoImage: { dataUrl: string; format: 'PNG' | 'JPEG' } | null) {
      doc.setPage(pageNumber)

      const footerLineY = pageHeight - footerHeight + 2
      const footerTextY = pageHeight - 10
      const logoX = marginX
      const contentX = logoImage ? logoX + 14 : marginX
      const contentWidth = pageWidth - contentX - marginX - 26

      doc.setDrawColor(...reportCompany.primaryColorRgb)
      doc.setLineWidth(0.3)
      doc.line(marginX, footerLineY, pageWidth - marginX, footerLineY)

      if (logoImage) {
        try {
          doc.addImage(logoImage.dataUrl, logoImage.format, logoX, pageHeight - 18, 10, 10)
        } catch {
          // ignore logo rendering failures and continue with the text footer
        }
      }

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8.5)
      doc.setTextColor(...reportCompany.primaryColorRgb)
      doc.text(reportCompany.name, contentX, footerTextY)

      const footerSegments = [
        reportCompany.websiteUrl ? `Site: ${stripUrlProtocol(reportCompany.websiteUrl)}` : null,
        reportCompany.email ? `Email: ${reportCompany.email}` : null,
        reportCompany.phone ? `Telefone: ${reportCompany.phone}` : null,
        reportCompany.whatsappNumber ? `WhatsApp: ${reportCompany.whatsappNumber}` : null,
      ].filter(Boolean)

      const footerLine = footerSegments.length > 0 ? footerSegments.join(' · ') : 'Property Intelligence · Lodgra'
      const footerLines = doc.splitTextToSize(footerLine, contentWidth)

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7.5)
      doc.setTextColor(102, 114, 132)
      doc.text(footerLines, contentX, footerTextY + 4)

      doc.setFontSize(7)
      doc.setTextColor(...reportCompany.secondaryColorRgb)
      doc.text(`Página ${pageNumber} de ${totalPages}`, pageWidth - marginX, footerTextY, {
        align: 'right',
      })
    }

    function shouldSkipMarkdownLine(text: string) {
      const normalized = text.trim().toLowerCase()
      return (
        normalized.includes('page-break-after: always') ||
        normalized.includes('nota interna da aplicação') ||
        normalized.includes('não deve ser impresso ou gerado no pdf') ||
        normalized.includes('nao deve ser impresso ou gerado no pdf')
      )
    }

    function isMarkdownTableDivider(text: string) {
      const cells = text
        .trim()
        .replace(/^\|/, '')
        .replace(/\|$/, '')
        .split('|')
        .map(cell => cell.trim())

      return cells.length >= 2 && cells.every(cell => /^:?-{3,}:?$/.test(cell))
    }

    function parseMarkdownTableRow(text: string) {
      return text
        .trim()
        .replace(/^\|/, '')
        .replace(/\|$/, '')
        .split('|')
        .map(cell => cell.trim())
    }

    function renderTableBlock(headers: string[], rows: string[][]) {
      const columnCount = headers.length
      if (columnCount === 0 || rows.length === 0) {
        return
      }

      const columnGap = 2
      const cellWidth = (maxWidth - columnGap * (columnCount - 1)) / columnCount
      const cellPaddingX = 2
      const cellPaddingY = 2
      const labelFontSize = columnCount > 5 ? 5.5 : 6
      const valueFontSize = columnCount > 5 ? 7.5 : 8
      const lineGap = columnCount > 5 ? 2.6 : 3
      const rowGap = 3

      rows.forEach(row => {
        const normalizedRow = headers.map((_, index) => row[index] ?? '')
        const wrappedCells = normalizedRow.map((value, index) => {
          doc.setFont('helvetica', 'bold')
          doc.setFontSize(labelFontSize)
          const labelLines = doc.splitTextToSize(headers[index], cellWidth - cellPaddingX * 2)
          doc.setFont('helvetica', 'normal')
          doc.setFontSize(valueFontSize)
          const valueLines = doc.splitTextToSize(value || '-', cellWidth - cellPaddingX * 2)
          return { labelLines, valueLines }
        })

        const rowHeight =
          Math.max(
            ...wrappedCells.map(cell => cell.labelLines.length * lineGap + cell.valueLines.length * lineGap + 2)
          ) + cellPaddingY * 2

        ensureSpace(rowHeight + rowGap)

        let cellX = marginX
        wrappedCells.forEach((cell, index) => {
          doc.setDrawColor(226, 232, 240)
          doc.setFillColor(255, 255, 255)
          doc.roundedRect(cellX, cursorY, cellWidth, rowHeight, 2, 2, 'S')

          const cellInnerX = cellX + cellPaddingX
          let cellCursorY = cursorY + cellPaddingY + 1

          doc.setFont('helvetica', 'bold')
          doc.setFontSize(labelFontSize)
          doc.setTextColor(102, 114, 132)
          doc.text(cell.labelLines, cellInnerX, cellCursorY)
          cellCursorY += cell.labelLines.length * lineGap + 1

          doc.setFont('helvetica', 'normal')
          doc.setFontSize(valueFontSize)
          doc.setTextColor(40, 52, 72)
          doc.text(cell.valueLines, cellInnerX, cellCursorY)

          if (index < wrappedCells.length - 1) {
            doc.setDrawColor(236, 239, 244)
            doc.line(cellX + cellWidth + 1, cursorY + 1, cellX + cellWidth + 1, cursorY + rowHeight - 1)
          }

          cellX += cellWidth + columnGap
        })

        cursorY += rowHeight + rowGap
      })
    }

    function addMarkdownLine(text: string) {
      if (shouldSkipMarkdownLine(text)) {
        return
      }

      if (!text.trim()) {
        cursorY += 2
        return
      }

      if (text.startsWith('### ')) {
        addHeading(text.replace(/^###\s+/, ''))
        return
      }

      if (text.startsWith('## ')) {
        addHeading(text.replace(/^##\s+/, ''))
        return
      }

      if (text.startsWith('# ')) {
        addHeading(text.replace(/^#\s+/, ''))
        return
      }

      addParagraph(text.replace(/^\-\s+/, '• '))
    }

    doc.setProperties({
      title: 'Dossiê Executivo de Property Intelligence',
      subject: 'Property Intelligence',
      author: reportCompany.name,
    })

    const logoImage = reportCompany.logoUrl ? await loadImageDataUrl(reportCompany.logoUrl) : null

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(18)
    doc.setTextColor(...reportCompany.primaryColorRgb)
    doc.text('Dossiê Executivo de Property Intelligence', marginX, cursorY)
    cursorY += 10

    addParagraph(`Imóvel: ${propertyName}`)
    addParagraph(`Localização: ${location || 'Não informada'}`)
    addParagraph(`Tipologia: ${typology || '-'} · Tipo: ${propertyType} · Moeda: ${currency || '-'}`)
    addParagraph(`Objetivos: ${readingObjectives.map(formatReadingObjectiveLabel).join(', ')}`)
    addParagraph(`Estado de publicação: ${isPublicationApproved ? 'Aprovado' : 'Pendente'}`)
    addParagraph(`Confiança: ${Math.round(summary.confidence * 100)}% · Recomendação: ${formatStayTypeLabel(summary.recommendation)}`)
    cursorY += 2

    const markdown = effectiveMarkdown
    const markdownLines = markdown.split('\n').map(line => line.trim())

    for (let index = 0; index < markdownLines.length; ) {
      const line = markdownLines[index]

      if (shouldSkipMarkdownLine(line)) {
        index += 1
        continue
      }

      if (line.startsWith('|') && index + 1 < markdownLines.length && isMarkdownTableDivider(markdownLines[index + 1])) {
        const headers = parseMarkdownTableRow(line)
        const tableRows: string[][] = []
        index += 2

        while (index < markdownLines.length && markdownLines[index].startsWith('|')) {
          const rowLine = markdownLines[index]
          if (!shouldSkipMarkdownLine(rowLine)) {
            tableRows.push(parseMarkdownTableRow(rowLine))
          }
          index += 1
        }

        renderTableBlock(headers, tableRows)
        continue
      }

      addMarkdownLine(line)
      index += 1
    }

    const totalPages = doc.getNumberOfPages()
    for (let pageNumber = 1; pageNumber <= totalPages; pageNumber += 1) {
      addFooter(pageNumber, totalPages, logoImage)
    }

    doc.save(`property-intelligence-${propertyName.replace(/\s+/g, '-').toLowerCase()}.pdf`)
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
              <h3 className="text-sm font-semibold text-brand-text-dark">Contexto do proprietário</h3>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <ChoiceGroup
                label="Flexibilidade de uso"
                description="Quanto o imóvel precisa continuar disponível para uso próprio."
                options={OWNER_FLEXIBILITY_OPTIONS}
                value={ownerFlexibility}
                onChange={setOwnerFlexibility}
                columns="grid-cols-3"
              />
              <ChoiceGroup
                label="Modelo real de exploração"
                description="Como o imóvel opera na prática."
                options={OWNER_OPERATING_MODEL_OPTIONS}
                value={ownerOperatingModel}
                onChange={setOwnerOperatingModel}
                columns="grid-cols-1 sm:grid-cols-3"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-brand-text-dark">Faturamento acumulado</h4>
                <Input
                  type="number"
                  min={0}
                  step="1"
                  value={historicalRevenue ?? ''}
                  onChange={event => {
                    const nextValue = event.target.value
                    setHistoricalRevenue(nextValue === '' ? null : Number(nextValue))
                  }}
                  placeholder="Ex.: 15000"
                />
                <p className="text-xs text-brand-text-medium">
                  Valor total já faturado pelo imóvel no período informado.
                </p>
              </div>
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-brand-text-dark">Dias alugados</h4>
                <Input
                  type="number"
                  min={0}
                  step="1"
                  value={rentedDays ?? ''}
                  onChange={event => {
                    const nextValue = event.target.value
                    setRentedDays(nextValue === '' ? null : Number(nextValue))
                  }}
                  placeholder="Ex.: 186"
                />
                <p className="text-xs text-brand-text-medium">
                  Ajuda a contextualizar a eficiência real da operação.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-brand-text-dark">Nota de manutenção e operação</h4>
              <Textarea
                value={maintenanceNote}
                onChange={event => setMaintenanceNote(event.target.value)}
                placeholder="Ex.: manutenção preventiva é mais fácil em curta/média duração; contratos longos tendem a concentrar custo no fim."
                className="min-h-[120px]"
              />
              <p className="text-xs text-brand-text-medium">
                Se o imóvel é de uso próprio, explique por que a flexibilidade e a manutenção preventiva importam.
              </p>
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
              <MultiChoiceGroup
                label="Objetivos da leitura"
                description="Marque uma ou mais análises. O lead pode receber a visão por email ou WhatsApp."
                options={READING_OBJECTIVE_OPTIONS}
                value={readingObjectives}
                onChange={setReadingObjectives}
                columns="grid-cols-1 sm:grid-cols-3"
              />
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-brand-text-dark">Nota adicional</h4>
                <Input
                  value={note}
                  onChange={event => setNote(event.target.value)}
                  placeholder="Adicione uma nota curta se precisar de mais contexto"
                />
              </div>
            </div>
          </PremiumCard>
        </div>

        <div className="rounded-3xl border border-brand-border-soft bg-white/80 p-4 shadow-[0_12px_36px_rgba(16,32,62,0.06)] backdrop-blur-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-brand-text-dark">Atalhos úteis</h3>
              <p className="text-xs text-brand-text-medium">
                O comando principal fica no fim do fluxo. Aqui ficam apenas ações de apoio e exportação para manter a página limpa.
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
                onClick={handleCopyTechnicalData}
              >
                <Copy className="h-4 w-4" />
                Copiar dados técnicos
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

        <div id="executar-analise" className="scroll-mt-28">
          <PremiumCard className="border-brand-blue/10 bg-gradient-to-br from-white via-white to-brand-blue/5 shadow-sm">
            <div className="space-y-4">
              <div className="space-y-3 max-w-2xl">
                <p className="text-[10px] font-black uppercase tracking-[2px] text-brand-text-medium">Executar agora</p>
                <h3 className="text-2xl font-semibold tracking-tight text-brand-text-dark sm:text-3xl">
                  Gerar relatório depois de rever todos os campos.
                </h3>
                <p className="max-w-2xl text-sm leading-6 text-brand-text-medium">
                  Feche a leitura dos campos essenciais e use o comando principal como último passo. Se faltar contexto, o sistema avisa antes de executar.
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
                    disabled={isLoading || !gateEnabled || !guidedHasRequiredInputs}
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
                      onClick={handleCopyTechnicalData}
                      className="w-full justify-center border-white/15 bg-white/95 text-brand-text-dark hover:bg-white"
                    >
                      <Copy className="h-4 w-4" />
                      Copiar dados técnicos
                    </Button>
                  </div>
                </div>
              </div>

              <p className="max-w-2xl text-xs leading-5 text-brand-text-medium">
                O botão principal fica no fim do fluxo. Quando a execução estiver bloqueada, a própria interface indica o que falta.
              </p>
            </div>
          </PremiumCard>
        </div>
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

              <div className="rounded-2xl border border-brand-border-soft bg-white/95 p-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0 space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-[2px] text-brand-text-medium">
                      Aprovação de publicação
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[2px] ${
                          publicationApprovalState === 'approved'
                            ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
                            : 'border border-amber-200 bg-amber-50 text-amber-700'
                        }`}
                      >
                        {publicationApprovalState === 'approved' ? 'Aprovado' : 'Pendente'}
                      </span>
                      <p className="text-sm font-semibold text-brand-text-dark">
                        {publicationApprovalState === 'approved' ? 'Relatório aprovado manualmente' : 'Aguardando aprovação manual'}
                      </p>
                    </div>
                    <p className="text-xs leading-5 text-brand-text-medium">
                      A aprovação atualiza o estado de publicação e também o texto exportado para PDF e cópia.
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    {publicationApprovalState === 'approved' ? (
                      <>
                        <Button
                          type="button"
                          variant="premium-primary"
                          size="premium-sm"
                          onClick={() => handleApprovePublication('pending')}
                          className="min-w-[180px] justify-center"
                        >
                          Reverter aprovação
                        </Button>
                        <Button
                          type="button"
                          variant="premium-primary"
                          size="premium-sm"
                          disabled
                          className="min-w-[180px] justify-center bg-emerald-600 text-white hover:bg-emerald-600"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          Aprovado
                        </Button>
                      </>
                    ) : (
                      <Button
                        type="button"
                        variant="premium-primary"
                        size="premium-md"
                        onClick={() => handleApprovePublication('approved')}
                        className="min-w-[240px] justify-center shadow-[0_14px_36px_rgba(16,32,62,0.24)]"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Aprovar publicação
                      </Button>
                    )}
                  </div>
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
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="premium-secondary"
                    size="premium-sm"
                    onClick={handleCopyMarkdown}
                  >
                    <Copy className="h-4 w-4" />
                    {copied ? 'Copiado' : 'Copiar dossiê'}
                  </Button>
                  <Button
                    type="button"
                    variant="premium-secondary"
                    size="premium-sm"
                    onClick={handleDownloadPdf}
                  >
                    <WandSparkles className="h-4 w-4" />
                    Descarregar PDF
                  </Button>
                </div>
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
                      O resumo abaixo mostra os indicadores principais. Os detalhes técnicos ficam no Markdown; os dados técnicos continuam disponíveis para cópia.
                    </p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-brand-border-soft bg-white/90 p-4">
                      <p className="text-[10px] font-black uppercase tracking-[2px] text-brand-text-medium">Estado de publicação</p>
                      <p className="mt-2 text-sm font-semibold text-brand-text-dark">
                        {isPublicationApproved ? 'Aprovado' : 'Pendente'}
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
              ) : (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brand-border-soft bg-brand-surface/50 p-4 text-sm text-brand-text-medium">
                    <div>
                      <p className="font-semibold text-brand-text-dark">Dossiê editável</p>
                      <p className="mt-1 leading-6">
                        Pode complementar o texto gerado com ajustes cirúrgicos antes de copiar ou descarregar o PDF.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="premium-secondary"
                      size="premium-sm"
                      onClick={() => setMarkdownDraft(null)}
                      disabled={markdownDraft === null}
                    >
                      Reverter para original
                    </Button>
                  </div>
                  <Textarea
                    value={effectiveMarkdown}
                    onChange={event => setMarkdownDraft(event.target.value)}
                    className="min-h-[420px] font-mono text-[12px] leading-5"
                    spellCheck={false}
                  />
                </div>
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
