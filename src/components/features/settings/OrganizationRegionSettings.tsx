'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Globe2, Loader2, Save } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/common/ui/button'
import {
  ORGANIZATION_CURRENCIES,
  ORGANIZATION_TIME_ZONES,
  type OrganizationCurrency,
} from '@/lib/organization/regional-settings'

interface Props {
  timezone: string
  currency: string
}

const CURRENCY_LABELS: Record<OrganizationCurrency, string> = {
  EUR: 'Euro (EUR)',
  BRL: 'Real brasileiro (BRL)',
}

export function OrganizationRegionSettings({ timezone, currency }: Props) {
  const router = useRouter()
  const [timezoneValue, setTimezoneValue] = useState(timezone)
  const [currencyValue, setCurrencyValue] = useState(currency.toUpperCase())
  const [saving, setSaving] = useState(false)
  const unchanged = timezoneValue === timezone && currencyValue === currency.toUpperCase()
  const knownTimeZone = ORGANIZATION_TIME_ZONES.some(zone => zone.value === timezoneValue)
  const knownCurrency = (ORGANIZATION_CURRENCIES as readonly string[]).includes(currencyValue)

  async function handleSave() {
    setSaving(true)
    try {
      const response = await fetch('/api/organization', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ timezone: timezoneValue, currency: currencyValue }),
      })
      if (!response.ok) {
        const body = await response.json().catch(() => null) as { error?: string } | null
        throw new Error(body?.error ?? 'Não foi possível guardar.')
      }
      toast.success('Região e moeda atualizadas.')
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível guardar.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Globe2 className="h-5 w-5 text-brand-blue" />
        <h2 className="text-lg font-semibold text-brand-text-dark">Região e moeda</h2>
      </div>
      <p className="text-sm text-brand-text-medium">
        O fuso horário define o que é &quot;hoje&quot; e &quot;este mês&quot; nos relatórios, no dashboard, nos repasses e nas sincronizações.
      </p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="org-timezone" className="text-xs font-semibold uppercase tracking-wide text-brand-text-medium">
            Fuso horário
          </label>
          <select
            id="org-timezone"
            value={timezoneValue}
            onChange={event => setTimezoneValue(event.target.value)}
            className="mt-1 w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm font-semibold text-brand-text-dark"
          >
            {!knownTimeZone && <option value={timezoneValue} disabled>{timezoneValue}</option>}
            {ORGANIZATION_TIME_ZONES.map(zone => (
              <option key={zone.value} value={zone.value}>{zone.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="org-currency" className="text-xs font-semibold uppercase tracking-wide text-brand-text-medium">
            Moeda
          </label>
          <select
            id="org-currency"
            value={currencyValue}
            onChange={event => setCurrencyValue(event.target.value)}
            className="mt-1 w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm font-semibold text-brand-text-dark"
          >
            {!knownCurrency && <option value={currencyValue} disabled>{currencyValue}</option>}
            {ORGANIZATION_CURRENCIES.map(code => (
              <option key={code} value={code}>{CURRENCY_LABELS[code]}</option>
            ))}
          </select>
        </div>
      </div>
      <Button type="button" onClick={() => void handleSave()} disabled={saving || unchanged || !knownTimeZone || !knownCurrency}>
        {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
        Guardar
      </Button>
    </div>
  )
}
