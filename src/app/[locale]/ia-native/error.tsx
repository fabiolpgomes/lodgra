'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { AlertTriangle, ArrowLeft, RotateCcw } from 'lucide-react'

export default function IaNativeError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('IA Native page error:', error)
  }, [error])

  const params = useParams<{ locale?: string }>()
  const locale = params?.locale
  const dashboardHref = locale ? `/${locale}/dashboard` : '/dashboard'

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(201,162,39,0.08),transparent_30%),linear-gradient(180deg,#fbf8f1_0%,#fffdf9_100%)] px-6 py-10">
      <div className="mx-auto flex max-w-4xl flex-col items-center justify-center gap-6 rounded-[28px] border border-brand-border-soft bg-white/90 p-8 text-center shadow-sm">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-amber-50 text-amber-700">
          <AlertTriangle className="h-8 w-8" />
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight text-brand-text-dark">
            Não conseguimos abrir a IA Native
          </h1>
          <p className="text-sm leading-6 text-brand-text-medium">
            A entrada controlada falhou ao carregar. Pode tentar novamente ou voltar ao dashboard.
          </p>
        </div>
        <p className="max-w-2xl rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-left font-mono text-xs text-amber-900">
          {error.message || 'Erro desconhecido'}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-full bg-brand-blue px-5 py-3 text-[11px] font-black uppercase tracking-[2px] text-white transition hover:bg-brand-blue/90"
          >
            <RotateCcw className="h-4 w-4" />
            Tentar novamente
          </button>
          <Link
            href={dashboardHref}
            className="inline-flex items-center gap-2 rounded-full border border-brand-border-soft bg-white px-5 py-3 text-[11px] font-black uppercase tracking-[2px] text-brand-text-dark transition hover:bg-brand-surface"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar ao dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
