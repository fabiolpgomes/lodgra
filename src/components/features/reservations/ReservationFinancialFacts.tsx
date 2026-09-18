'use client'

import { useEffect, useState } from 'react'
import { Alert, AlertDescription } from '@/components/common/ui/alert'
import { Button } from '@/components/common/ui/button'
import { Input } from '@/components/common/ui/input'
import { Label } from '@/components/common/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/common/ui/select'

type Mode = 'declared_owner_base' | 'component_breakdown'
type FactsResponse = {
  reservation: { source: string; currency: string | null; declaredOwnerBaseAllowed: boolean; compatibility: string }
  currentSnapshot: null | ({
    version: number; factMode: Mode; status: string; capturedAt: string; declaredOwnerBaseAmount?: string
    capturedBy?: { id: string; name: string | null } | null
  } & Record<string, unknown>)
  defaults: null | { managerCleaningCostDefaultAmount: string | null; managerCleaningCostMode?: 'per_stay' | 'per_night' | null }
}

const detailedFields = [
  ['accommodationAmount', 'Valor bruto da hospedagem'],
  ['municipalTaxAmount', 'Imposto municipal / taxa turística'],
  ['cleaningFeeAmount', 'Limpeza cobrada ao hóspede'],
  ['otherGuestFeesAmount', 'Outras taxas do hóspede'],
  ['discountAmount', 'Desconto'],
  ['platformAdjustmentAmount', 'Ajuste de preço da plataforma'],
  ['guestTotalAmount', 'Total cobrado pela plataforma'],
  ['otaCommissionBaseAmount', 'Base da comissão OTA'],
  ['otaCommissionAmount', 'Comissão OTA'],
  ['paymentProcessingFeeAmount', 'Processamento de pagamento'],
  ['managerCleaningCostAmount', 'Custo de limpeza da gestora'],
  ['channelNetPayoutAmount', 'Líquido da plataforma'],
] as const

function subtractMoney(left: string, right: string): string {
  const cents = (value: string) => Math.round(Number(value || 0) * 100)
  const result = cents(left) - cents(right)
  return Number.isSafeInteger(result) && result >= 0 ? (result / 100).toFixed(2) : ''
}

function isManualFinancialSource(source: string): boolean {
  return source === 'manual' || source.startsWith('ical')
}

export function ReservationFinancialFacts({ reservationId, currency }: { reservationId: string; currency: string }) {
  const [data, setData] = useState<FactsResponse | null>(null)
  const [mode, setMode] = useState<Mode>('declared_owner_base')
  const [net, setNet] = useState('')
  const [cleaningCost, setCleaningCost] = useState('')
  const [declaredBase, setDeclaredBase] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [details, setDetails] = useState<Record<string, string>>({})
  const [otaSettlement, setOtaSettlement] = useState('unknown')
  const [processingSettlement, setProcessingSettlement] = useState('unknown')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    fetch(`/api/reservations/${reservationId}/financial-facts`, { cache: 'no-store' })
      .then(async response => {
        const body = await response.json()
        if (!response.ok) throw new Error(body.error?.message ?? 'Não foi possível carregar os dados financeiros')
        return body as FactsResponse
      })
      .then(body => {
        if (!active) return
        setData(body)
        const snapshot = body.currentSnapshot
        const sourcePreferredMode: Mode = isManualFinancialSource(body.reservation.source)
          ? 'declared_owner_base'
          : 'component_breakdown'
        const preferredMode: Mode = snapshot?.factMode
          ?? (body.reservation.declaredOwnerBaseAllowed ? sourcePreferredMode : 'component_breakdown')
        setMode(preferredMode)
        if (snapshot?.factMode === 'declared_owner_base') setDeclaredBase(snapshot.declaredOwnerBaseAmount ?? '')
        if (snapshot?.factMode === 'component_breakdown') {
          setDetails(Object.fromEntries(detailedFields.map(([key]) => [key, String(snapshot[key] ?? '')])))
          if (typeof snapshot.otaCommissionSettlement === 'string') setOtaSettlement(snapshot.otaCommissionSettlement)
          if (typeof snapshot.paymentProcessingSettlement === 'string') setProcessingSettlement(snapshot.paymentProcessingSettlement)
        }
        if (body.defaults?.managerCleaningCostMode !== 'per_night') {
          setCleaningCost(body.defaults?.managerCleaningCostDefaultAmount ?? '')
        }
      })
      .catch(reason => active && setError(reason instanceof Error ? reason.message : 'Erro ao carregar'))
      .finally(() => active && setLoading(false))
    return () => { active = false }
  }, [reservationId])

  function updateAssistedBase(nextNet: string, nextCleaningCost: string) {
    setDeclaredBase(nextNet !== '' && nextCleaningCost !== '' ? subtractMoney(nextNet, nextCleaningCost) : '')
    setConfirmed(false)
  }

  async function save() {
    setError(null)
    setSuccess(null)
    if (mode === 'declared_owner_base' && !confirmed) {
      setError('Confirme explicitamente o valor base para repasse antes de salvar.')
      return
    }
    if (mode === 'declared_owner_base' && declaredBase === '') {
      setError('Informe o valor base para repasse antes de salvar.')
      return
    }
    setSaving(true)
    try {
      const payload = mode === 'declared_owner_base'
        ? { expectedCurrentVersion: data?.currentSnapshot?.version ?? null, factMode: mode, currency, declaredOwnerBaseAmount: declaredBase, note: note || null }
        : {
          expectedCurrentVersion: data?.currentSnapshot?.version ?? null, factMode: mode, currency, note: note || null,
          ...Object.fromEntries(detailedFields.map(([key]) => [key, details[key] || null])),
          otaCommissionSettlement: otaSettlement, paymentProcessingSettlement: processingSettlement,
        }
      const response = await fetch(`/api/reservations/${reservationId}/financial-facts`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error?.message ?? 'Não foi possível salvar')
      setData(body as FactsResponse)
      setSuccess('Informação financeira guardada com versão e autoria.')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível salvar')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p className="text-sm text-gray-600" aria-live="polite">Carregando informação financeira…</p>

  const declaredDisabled = data?.reservation.declaredOwnerBaseAllowed === false
  return (
    <section className="mb-8 min-w-0 space-y-4" aria-labelledby="financial-facts-title">
      <div>
        <h3 id="financial-facts-title" className="text-lg font-semibold text-gray-900">Informação financeira</h3>
        <p className="mt-1 text-sm text-gray-600">
          O valor declarado é antes da comissão de gestão e das despesas da propriedade; já líquido das deduções da plataforma e da limpeza retida pelo gestor.
        </p>
      </div>

      {data?.currentSnapshot && (
        <p className="text-xs text-gray-600">
          Versão {data.currentSnapshot.version} · {data.currentSnapshot.status} · por {data.currentSnapshot.capturedBy?.name ?? 'utilizador identificado'} · {new Date(data.currentSnapshot.capturedAt).toLocaleString('pt-PT')}
        </p>
      )}
      {data?.reservation.compatibility === 'legacy_divergence_visible' && (
        <Alert><AlertDescription>O valor legado da reserva não será alterado automaticamente porque a origem pode representar valor bruto.</AlertDescription></Alert>
      )}
      {declaredDisabled && (
        <Alert><AlertDescription>O contrato de repasse vigente ainda não autoriza valores declarados. Ative essa opção na política financeira da propriedade.</AlertDescription></Alert>
      )}
      {data?.defaults?.managerCleaningCostMode === 'per_night' && (
        <Alert><AlertDescription>O custo padrão de limpeza é por noite. Confirme manualmente o total desta estadia antes de guardar.</AlertDescription></Alert>
      )}

      <div>
        <Label htmlFor="financial-fact-mode">Modo de informação</Label>
        <Select value={mode} onValueChange={value => { setMode(value as Mode); setError(null) }}>
          <SelectTrigger id="financial-fact-mode" className="mt-1 w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="declared_owner_base" disabled={declaredDisabled}>Modo simplificado — valor base para repasse</SelectItem>
            <SelectItem value="component_breakdown">Componentes reconciliados</SelectItem>
          </SelectContent>
        </Select>
        <p className="mt-2 text-xs font-medium text-gray-700">
          Evidência: {mode === 'declared_owner_base' ? 'Valor declarado manualmente' : 'Componentes reconciliados'}
        </p>
      </div>

      {mode === 'declared_owner_base' ? (
        <div className="space-y-4 rounded-lg border p-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div><Label htmlFor="platform-net">Valor líquido da plataforma</Label><Input id="platform-net" inputMode="decimal" type="number" min="0" step="0.01" value={net} onChange={event => { setNet(event.target.value); updateAssistedBase(event.target.value, cleaningCost) }} /></div>
            <div><Label htmlFor="manager-cleaning">Custo de limpeza da gestora</Label><Input id="manager-cleaning" inputMode="decimal" type="number" min="0" step="0.01" value={cleaningCost} onChange={event => { setCleaningCost(event.target.value); updateAssistedBase(net, event.target.value) }} /></div>
          </div>
          <div><Label htmlFor="declared-base">Valor base para repasse ({currency})</Label><Input id="declared-base" inputMode="decimal" type="number" min="0" step="0.01" value={declaredBase} onChange={event => { setDeclaredBase(event.target.value); setConfirmed(false) }} /></div>
          <label className="flex min-h-11 items-start gap-3 text-sm"><input className="mt-1 h-5 w-5" type="checkbox" checked={confirmed} onChange={event => setConfirmed(event.target.checked)} /><span>Confirmo que este é o valor efetivamente aplicado à reserva.</span></label>
        </div>
      ) : (
        <div className="space-y-4 rounded-lg border p-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {detailedFields.map(([key, label]) => <div key={key}><Label htmlFor={`financial-${key}`}>{label}</Label><Input id={`financial-${key}`} inputMode="decimal" type="number" step="0.01" min={key === 'platformAdjustmentAmount' ? undefined : '0'} value={details[key] ?? ''} onChange={event => setDetails(current => ({ ...current, [key]: event.target.value }))} /></div>)}
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div><Label htmlFor="ota-settlement">Liquidação da comissão OTA</Label><Select value={otaSettlement} onValueChange={setOtaSettlement}><SelectTrigger id="ota-settlement"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="unknown">Ainda não confirmado</SelectItem><SelectItem value="withheld">Retida no payout</SelectItem><SelectItem value="invoiced_separately">Faturada separadamente</SelectItem><SelectItem value="not_applicable">Não aplicável</SelectItem></SelectContent></Select></div>
            <div><Label htmlFor="processing-settlement">Liquidação do processamento</Label><Select value={processingSettlement} onValueChange={setProcessingSettlement}><SelectTrigger id="processing-settlement"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="unknown">Ainda não confirmado</SelectItem><SelectItem value="withheld">Retida no payout</SelectItem><SelectItem value="invoiced_separately">Faturada separadamente</SelectItem><SelectItem value="not_applicable">Não aplicável</SelectItem></SelectContent></Select></div>
          </div>
        </div>
      )}

      <div><Label htmlFor="financial-note">Observação opcional</Label><Input id="financial-note" value={note} maxLength={2000} onChange={event => setNote(event.target.value)} /></div>
      {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
      {success && <Alert><AlertDescription>{success}</AlertDescription></Alert>}
      <Button type="button" className="min-h-11 w-full sm:w-auto" disabled={saving || (mode === 'declared_owner_base' && declaredDisabled)} onClick={save}>
        {saving ? 'Guardando…' : 'Guardar informação financeira'}
      </Button>
    </section>
  )
}
