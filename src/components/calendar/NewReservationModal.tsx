'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface Property {
  id: string
  name: string
}

interface NewReservationModalProps {
  open: boolean
  checkIn: string
  checkOut: string
  properties: Property[]
  onClose: () => void
}

export function NewReservationModal({ open, checkIn, checkOut, properties, onClose }: NewReservationModalProps) {
  const router = useRouter()
  const [selectedPropertyId, setSelectedPropertyId] = useState('')

  function handleCreate() {
    const params = new URLSearchParams({ check_in: checkIn, check_out: checkOut })
    if (selectedPropertyId) params.set('property_id', selectedPropertyId)
    router.push(`/reservations/new?${params}`)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nova Reserva</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-gray-500 mb-1 block">Check-in</Label>
              <Input value={checkIn} readOnly className="bg-gray-50" />
            </div>
            <div>
              <Label className="text-xs text-gray-500 mb-1 block">Check-out</Label>
              <Input value={checkOut} readOnly className="bg-gray-50" />
            </div>
          </div>

          {properties.length > 0 && (
            <div>
              <Label className="text-xs text-gray-500 mb-1 block">Propriedade (opcional)</Label>
              <Select value={selectedPropertyId} onValueChange={setSelectedPropertyId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar propriedade…" />
                </SelectTrigger>
                <SelectContent>
                  {properties.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleCreate}>Criar Reserva</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
