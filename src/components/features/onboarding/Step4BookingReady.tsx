'use client'

import { CheckCircle2, Copy, ExternalLink, LayoutDashboard } from 'lucide-react'
import { Button } from '@/components/common/ui/button'

interface Props {
  orgName: string
  orgSlug: string
  onDashboard: () => void
  dashboardLoading?: boolean
}

export function Step4BookingReady({ orgName, orgSlug, onDashboard, dashboardLoading = false }: Props) {
  const bookingUrl = `https://${orgSlug}.lodgra.io/booking`

  async function copyLink() {
    await navigator.clipboard?.writeText(bookingUrl)
  }

  return (
    <div className="text-center">
      <div className="flex justify-center mb-6">
        <div className="p-4 bg-green-100 rounded-full">
          <CheckCircle2 className="h-10 w-10 text-green-600" />
        </div>
      </div>

      <h2 className="text-2xl font-bold text-gray-900 mb-2">
        Sua página de reservas está pronta
      </h2>
      <p className="text-gray-600 text-sm mb-6">
        {orgName || 'Sua empresa'} já tem um canal direto para receber reservas sem depender apenas das OTAs.
      </p>

      <div className="rounded-xl border border-green-100 bg-green-50 p-4 text-left mb-6">
        <p className="text-sm font-semibold text-green-950 mb-2">Link público da empresa</p>
        <p className="font-mono text-sm text-green-800 break-all">{bookingUrl}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        <Button asChild variant="action" className="w-full">
          <a href={bookingUrl} target="_blank" rel="noreferrer">
            <ExternalLink className="h-4 w-4" />
            Abrir página
          </a>
        </Button>
        <Button type="button" variant="outline" onClick={copyLink} className="w-full">
          <Copy className="h-4 w-4" />
          Copiar link
        </Button>
      </div>

      <Button
        type="button"
        onClick={onDashboard}
        disabled={dashboardLoading}
        className="w-full"
      >
        <LayoutDashboard className="h-4 w-4" />
        {dashboardLoading ? 'A abrir painel...' : 'Ir para o painel'}
      </Button>
    </div>
  )
}
