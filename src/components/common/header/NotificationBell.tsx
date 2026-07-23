'use client'

import { useEffect, useRef, useState } from 'react'
import { Bell, AlertTriangle, RefreshCw, Wallet, TrendingDown } from 'lucide-react'
import Link from 'next/link'
import type { NotificationAlertType } from '@/lib/dashboard/notificationAlerts'

/**
 * Story 39.6 — Sino de Notificações
 *
 * Extraído de `page.tsx` (era um `<button>` decorativo, ver linhas ~705-711
 * antes desta story). Recebe as pendências já calculadas no server component
 * (org-wide, nunca filtradas pelo filtro de propriedade do topo — AC da
 * Story 39.6) e só cuida do estado de abrir/fechar a box.
 */
export interface NotificationBellAlert {
  id: string
  type: NotificationAlertType
  message: string
  /** Link para o detalhe da reserva/propriedade, quando aplicável — já resolvido com o locale pelo caller. */
  href?: string
}

interface NotificationBellProps {
  alerts: NotificationBellAlert[]
}

const ALERT_ICON: Record<NotificationAlertType, typeof AlertTriangle> = {
  placeholder_guest: AlertTriangle,
  sync_failure: RefreshCw,
  pending_payment: Wallet,
  low_occupancy: TrendingDown,
}

export function NotificationBell({ alerts }: NotificationBellProps) {
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const hasAlerts = alerts.length > 0

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [])

  return (
    <div ref={wrapperRef} className="relative z-[90]">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="relative flex h-11 w-11 items-center justify-center rounded-full border border-neutral-200/60 bg-brand-bg text-brand-text-dark shadow-2xs transition-all hover:bg-brand-bg/85"
        aria-label={
          hasAlerts
            ? `Notificações — ${alerts.length} pendência${alerts.length !== 1 ? 's' : ''}`
            : 'Notificações — nenhuma pendência'
        }
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <Bell className="h-4.5 w-4.5" />
        <span
          className={`absolute right-2 top-2 h-2 w-2 rounded-full ring-2 ring-brand-white ${
            hasAlerts ? 'bg-red-500' : 'bg-brand-gold'
          }`}
        />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Pendências"
          className="absolute right-0 top-[calc(100%+10px)] z-[120] w-[min(400px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-neutral-200/80 bg-[#FBFAF6] shadow-[0_24px_64px_rgba(16,32,62,0.24)] ring-1 ring-white/80"
        >
          <div className="border-b border-neutral-200/60 px-4 py-3">
            <p className="text-xs font-bold uppercase tracking-wider text-brand-text-dark">
              Notificações{hasAlerts ? ` (${alerts.length})` : ''}
            </p>
          </div>

          {!hasAlerts ? (
            <p className="px-4 py-6 text-center text-xs font-medium text-brand-text-medium">
              Nenhuma pendência no momento.
            </p>
          ) : (
            <ul className="max-h-[360px] divide-y divide-neutral-200/60 overflow-y-auto">
              {alerts.map((alert) => {
                const Icon = ALERT_ICON[alert.type] || AlertTriangle
                const content = (
                  <div className="flex items-start gap-2.5 px-4 py-3 text-left transition-colors hover:bg-brand-bg">
                    <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-500" />
                    <p className="text-xs font-semibold leading-relaxed text-brand-text-dark">{alert.message}</p>
                  </div>
                )
                return (
                  <li key={alert.id}>
                    {alert.href ? (
                      <Link href={alert.href} onClick={() => setOpen(false)}>
                        {content}
                      </Link>
                    ) : (
                      content
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
