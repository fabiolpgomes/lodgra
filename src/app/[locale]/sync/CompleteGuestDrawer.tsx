'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/common/ui/sheet'
import { Button } from '@/components/common/ui/button'
import { Input } from '@/components/common/ui/input'
import { Label } from '@/components/common/ui/label'

export interface CompleteGuestTarget {
  reservationId: string
  title: string
  href: string | null
}

/** Fills in what the platform did not send (guest, guests, total) without leaving the sync panel. */
export function CompleteGuestDrawer({ target, onClose, onSaved }: {
  target: CompleteGuestTarget | null
  onClose: () => void
  onSaved: () => void
}) {
  const [name, setName] = useState('')
  const [guests, setGuests] = useState('')
  const [total, setTotal] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function reset() { setName(''); setGuests(''); setTotal(''); setError(null) }

  async function save(event: React.FormEvent) {
    event.preventDefault()
    if (!target) return
    setSaving(true)
    setError(null)
    const body: Record<string, unknown> = { guest_name: name.trim() }
    if (guests.trim()) body.number_of_guests = Number(guests)
    if (total.trim()) body.total_price = Number(total.replace(',', '.'))
    try {
      const response = await fetch(`/api/reservations/${target.reservationId}/guest`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) { setError(data.error || 'Não foi possível guardar.'); return }
      reset()
      onSaved()
    } catch {
      setError('Sem ligação ao servidor. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet open={Boolean(target)} onOpenChange={open => { if (!open) { reset(); onClose() } }}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <form onSubmit={save} className="flex h-full flex-col">
          <SheetHeader>
            <SheetTitle>Completar reserva</SheetTitle>
            <SheetDescription>{target?.title}</SheetDescription>
          </SheetHeader>
          <div className="flex-1 space-y-4 px-4">
            <p className="text-sm text-brand-text-medium">
              A plataforma não enviou estes dados. Copie-os da reserva no extranet ou na app da plataforma.
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="guest-name">Nome do hóspede *</Label>
              <Input id="guest-name" value={name} onChange={e => setName(e.target.value)} required minLength={2} autoFocus />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="guest-count">Nº de hóspedes</Label>
              <Input id="guest-count" type="number" min={1} max={50} value={guests} onChange={e => setGuests(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="guest-total">Valor total da reserva</Label>
              <Input id="guest-total" inputMode="decimal" placeholder="Ex.: 247,84" value={total} onChange={e => setTotal(e.target.value)} />
              <p className="text-xs text-brand-text-medium">Deixe vazio para manter o valor atual.</p>
            </div>
            {error && <p role="alert" className="text-sm font-semibold text-red-700">{error}</p>}
            {target?.href && (
              <a href={target.href} className="inline-block text-sm font-semibold text-brand-blue underline">
                Abrir a reserva completa para editar outros campos
              </a>
            )}
          </div>
          <SheetFooter>
            <Button type="submit" disabled={saving || name.trim().length < 2}>
              {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> A guardar…</> : 'Guardar'}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}
