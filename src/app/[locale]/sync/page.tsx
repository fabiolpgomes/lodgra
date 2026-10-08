'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Calendar } from 'lucide-react'
import { PremiumPageShell, PremiumPageHeader } from '@/components/common/layout/PremiumPage'
import { SyncActionsPanel } from '@/app/[locale]/sync/SyncActionsPanel'

/** Minutes until the next scheduled cycle (the scheduler runs every 15 minutes). */
function minutesToNextCycle(now: Date): number {
  return Math.max(1, Math.ceil(((15 - (now.getMinutes() % 15)) * 60 - now.getSeconds()) / 60))
}

export default function SyncStatusPage() {
  const router = useRouter()
  const params = useParams<{ locale: string }>()
  const [nextRun, setNextRun] = useState(() => minutesToNextCycle(new Date()))

  useEffect(() => {
    const timer = setInterval(() => setNextRun(minutesToNextCycle(new Date())), 30_000)
    return () => clearInterval(timer)
  }, [])

  return (
    <PremiumPageShell>
      <button
        onClick={() => router.back()}
        className="mb-4 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-brand-blue transition-colors hover:text-brand-blue/80"
        aria-label="Voltar"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar
      </button>

      <PremiumPageHeader
        title="Atualização das reservas"
        description="O Lodgra lê os calendários e os e-mails das plataformas a cada 15 minutos. Aqui só aparece o que precisa de si."
        icon={Calendar}
        badge={`Próxima atualização em ${nextRun} min`}
      />

      <SyncActionsPanel locale={params.locale} />
    </PremiumPageShell>
  )
}
