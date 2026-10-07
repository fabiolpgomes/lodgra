'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { PremiumCard } from '@/components/common/layout/PremiumPage'

interface Health {
  checked_at: string
  limit: number
  gmail_connected: boolean
  gmail_last_sync_at: string | null
  last_email_received_at: string | null
  emails: { id: string; processing_status: string; received_at: string; last_error: string | null }[]
  events: { id: string; property_id: string; source_platform: string; check_in: string; check_out: string; event_kind: string }[]
  failures: { id: string; synced_at: string; sync_type: string; error_message: string | null }[]
  truncated: { emails: boolean; events: boolean; failures: boolean }
}

const statuses: Record<string, string> = { pending: 'Na fila', retry: 'Nova tentativa', processing: 'Em processamento', needs_review: 'Revisão necessária' }
const dateTime = (value: string | null) => value ? new Date(value).toLocaleString('pt-PT') : 'Sem registo'

export function SyncHealthPanel({ locale }: { locale: string }) {
  const [health, setHealth] = useState<Health | null>(null)
  const [error, setError] = useState(false)
  useEffect(() => {
    let active = true
    let loading = false
    const controller = new AbortController()
    async function load() {
      if (loading) return
      loading = true
      try {
        const response = await fetch('/api/admin/sync-health', { cache: 'no-store', signal: controller.signal })
        if (!response.ok) throw new Error('unavailable')
        const data: Health = await response.json()
        if (active) { setHealth(data); setError(false) }
      } catch {
        if (active) { setError(true); setHealth(null) }
      } finally {
        loading = false
      }
    }
    void load()
    const timer = setInterval(() => { void load() }, 30000)
    return () => { active = false; controller.abort(); clearInterval(timer) }
  }, [])

  return <PremiumCard>
    <h2 className="text-lg font-bold text-brand-text-dark">Pendências de reservas e mensagens</h2>
    <p className="mt-2 text-sm text-brand-text-medium">O calendário pode bloquear datas sem criar uma reserva. O Booking pode enviar apenas disponibilidade, e o e-mail pode não conter todos os dados. Confira a plataforma e complete ou reveja a reserva quando necessário.</p>
    {error ? <p role="alert" className="mt-4 text-red-700">Não foi possível consultar as pendências. A sincronização não pôde ser confirmada; nova tentativa em 30 segundos.</p> : !health ? <p role="status" className="mt-4">A consultar pendências…</p> : <div className="mt-4 space-y-4 text-sm">
      <p>Última consulta Gmail: {health.gmail_connected ? dateTime(health.gmail_last_sync_at) : 'Gmail não conectado'}. Última mensagem recebida: {dateTime(health.last_email_received_at)}.</p>
      <p className="text-brand-text-medium">Consulta em {dateTime(health.checked_at)}. Até {health.limit} itens por lista. Ausência de pendências não comprova que todas as plataformas entregaram as reservas.</p>
      <section aria-label="Mensagens pendentes"><h3 className="font-semibold">Mensagens por tratar ({health.emails.length}{health.truncated.emails ? '+' : ''})</h3>
        {health.emails.length === 0 ? <p>Nenhuma mensagem pendente encontrada.</p> : <ul className="mt-2 space-y-2">{health.emails.map(email => <li key={email.id}>{statuses[email.processing_status] ?? email.processing_status} · {dateTime(email.received_at)}{email.last_error && <p className="break-words text-amber-800">{email.last_error}</p>}</li>)}</ul>}
      </section>
      <section aria-label="Eventos sem reserva"><h3 className="font-semibold">Eventos sem reserva vinculada ({health.events.length}{health.truncated.events ? '+' : ''})</h3>
        {health.events.length === 0 ? <p>Nenhum evento sem vínculo encontrado para estadias atuais ou futuras.</p> : <ul className="mt-2 space-y-2">{health.events.map(event => <li key={event.id}>{event.source_platform} · {event.check_in} a {event.check_out} · {event.event_kind === 'reservation' ? 'Reserva indicada pela plataforma: rever vínculo' : event.event_kind === 'block' ? 'Bloqueio de disponibilidade: confirmar se corresponde a uma reserva' : 'Evento não identificado: rever na plataforma'} <Link className="underline" href={`/${locale}/properties/${event.property_id}`}>Ver imóvel</Link></li>)}</ul>}
      </section>
      <section aria-label="Falhas recentes"><h3 className="font-semibold">Falhas nas últimas 24 horas ({health.failures.length}{health.truncated.failures ? '+' : ''})</h3>
        {health.failures.length === 0 ? <p>Nenhuma falha registada neste período.</p> : <ul className="mt-2 space-y-2">{health.failures.map(failure => <li key={failure.id}>{failure.sync_type} · {dateTime(failure.synced_at)} · {failure.error_message || 'Falha sem detalhe registado'}</li>)}</ul>}
      </section>
    </div>}
    <Link href={`/${locale}/reservations`} className="mt-4 inline-block font-semibold text-brand-blue underline">Rever e completar reservas</Link>
  </PremiumCard>
}
