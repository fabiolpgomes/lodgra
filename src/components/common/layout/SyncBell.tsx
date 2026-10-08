'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Bell } from 'lucide-react'

interface BellAction {
  key: string
  severity: 'stopped' | 'attention'
  title: string
  cta: string
  href: string | null
  external: boolean
}

interface BellState {
  status: 'ok' | 'attention' | 'stopped'
  actions: BellAction[]
}

const REFRESH_MS = 5 * 60_000
const SHOWN = 5

/** Bell in the top bar: sync actions pending for this tenant, linked straight to where they are fixed. */
export function SyncBell({ locale }: { locale: string }) {
  const [state, setState] = useState<BellState | null>(null)
  const [open, setOpen] = useState(false)
  const wrapper = useRef<HTMLDivElement>(null)

  const load = useCallback(async () => {
    if (typeof fetch !== 'function') return
    try {
      const response = await fetch(`/api/sync/actions?locale=${encodeURIComponent(locale)}`, { cache: 'no-store' })
      // 401/403: roles without sync access simply see a quiet bell.
      if (!response.ok) return
      const body = await response.json() as BellState
      setState({ status: body.status, actions: body.actions ?? [] })
    } catch {
      // Keep the last known state; the panel shows the error in full.
    }
  }, [locale])

  useEffect(() => {
    void load()
    const timer = setInterval(() => void load(), REFRESH_MS)
    const onFocus = () => void load()
    window.addEventListener('focus', onFocus)
    return () => { clearInterval(timer); window.removeEventListener('focus', onFocus) }
  }, [load])

  useEffect(() => {
    if (!open) return
    const close = (event: MouseEvent) => {
      if (wrapper.current && !wrapper.current.contains(event.target as Node)) setOpen(false)
    }
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', escape)
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', escape) }
  }, [open])

  const count = state?.actions.length ?? 0
  const dot = state?.status === 'stopped' ? 'bg-red-600' : 'bg-amber-500'
  const panelHref = `/${locale}/sync`

  return (
    <div ref={wrapper} className="relative">
      <button
        type="button"
        onClick={() => setOpen(value => !value)}
        className="relative p-2 text-brand-text-medium hover:text-brand-blue hover:bg-brand-blue/5 transition-all rounded"
        aria-label={count === 1 ? 'Notificações: 1 ação de sincronização pendente' : count ? `Notificações: ${count} ações de sincronização pendentes` : 'Notificações'}
        aria-expanded={open}
      >
        <Bell className="h-4 w-4" />
        {count > 0 && (
          <span className={`absolute -right-0.5 -top-0.5 min-w-[16px] rounded-full px-1 text-center text-[10px] font-bold leading-4 text-white ${dot}`}>
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-40 mt-2 w-80 rounded-md border border-brand-border bg-brand-canvas shadow-lg">
          <div className="border-b border-brand-border-soft px-4 py-3 text-sm font-semibold text-brand-text-dark">
            {count === 0 ? 'Tudo em dia' : state?.status === 'stopped' ? 'Sincronização parada' : count === 1 ? '1 ação pendente' : `${count} ações pendentes`}
          </div>
          {count === 0 ? (
            <p className="px-4 py-4 text-sm text-brand-text-medium">Reservas, calendários e e-mails sincronizados.</p>
          ) : (
            <ul className="max-h-80 overflow-y-auto">
              {state!.actions.slice(0, SHOWN).map(action => {
                const href = action.href ?? panelHref
                const content = (
                  <>
                    <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${action.severity === 'stopped' ? 'bg-red-600' : 'bg-amber-500'}`} />
                    <span className="min-w-0">
                      <span className="block truncate text-sm text-brand-text-dark">{action.title}</span>
                      <span className="block text-xs font-semibold text-brand-blue">{action.cta}</span>
                    </span>
                  </>
                )
                const className = 'flex gap-2 px-4 py-3 hover:bg-brand-blue/5'
                return (
                  <li key={action.key} className="border-b border-brand-border-soft last:border-0">
                    {action.external
                      ? <a href={href} target="_blank" rel="noopener noreferrer" className={className} onClick={() => setOpen(false)}>{content}</a>
                      : <Link href={href} className={className} onClick={() => setOpen(false)}>{content}</Link>}
                  </li>
                )
              })}
            </ul>
          )}
          <Link href={panelHref} onClick={() => setOpen(false)} className="block border-t border-brand-border-soft px-4 py-2.5 text-center text-sm font-semibold text-brand-blue hover:bg-brand-blue/5">
            {count > SHOWN ? `Ver todas (${count})` : 'Abrir painel de sincronização'}
          </Link>
        </div>
      )}
    </div>
  )
}
