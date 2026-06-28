'use client'

import { useState } from 'react'
import { useRouter } from '@/lib/i18n/routing'
import { format, parse } from 'date-fns'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/common/ui/dialog'
import { Button } from '@/components/common/ui/button'
import { Label } from '@/components/common/ui/label'
import { Input } from '@/components/common/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/common/ui/select'
import { Alert, AlertDescription } from '@/components/common/ui/alert'

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

export function NewReservationModal({ open, checkIn: initialCheckIn, checkOut: initialCheckOut, properties, onClose }: NewReservationModalProps) {
  const router = useRouter()
  const [selectedPropertyId, setSelectedPropertyId] = useState('')
  const [checkIn, setCheckIn] = useState(initialCheckIn)
  const [checkOut, setCheckOut] = useState(initialCheckOut)
  const [error, setError] = useState<string | null>(null)

  function formatDateToDDMMYYYY(dateStr: string): string {
    if (!dateStr) return ''
    try {
      const date = parse(dateStr, 'yyyy-MM-dd', new Date())
      return format(date, 'dd.MM.yyyy')
    } catch {
      return dateStr
    }
  }

  function parseDDMMYYYYToISO(dateStr: string): string {
    if (!dateStr) return ''
    try {
      const date = parse(dateStr, 'dd.MM.yyyy', new Date())
      return format(date, 'yyyy-MM-dd')
    } catch {
      return ''
    }
  }

  function handleCreate() {
    setError(null)

    // Validar datas
    if (!checkIn || !checkOut) {
      setError('Preencha as datas de check-in e check-out')
      return
    }

    if (!selectedPropertyId) {
      setError('Seleccione uma propriedade')
      return
    }

    const checkInDate = new Date(checkIn)
    const checkOutDate = new Date(checkOut)

    if (checkInDate >= checkOutDate) {
      setError('Check-out deve ser depois de check-in')
      return
    }

    const params = new URLSearchParams({ check_in: checkIn, check_out: checkOut })
    if (selectedPropertyId) params.set('property_id', selectedPropertyId)
    router.push(`/reservations/new?${params}`)
    onClose()
  }

  const displayCheckIn = formatDateToDDMMYYYY(checkIn)
  const displayCheckOut = formatDateToDDMMYYYY(checkOut)

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nova Reserva</DialogTitle>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-gray-600 mb-1 block">Check-in</Label>
              <div className="flex flex-col gap-2">
                <Input
                  type="date"
                  value={checkIn}
                  onChange={(e) => setCheckIn(e.target.value)}
                  className="bg-white"
                />
                {checkIn && (
                  <p className="text-sm font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded text-center">
                    {displayCheckIn}
                  </p>
                )}
              </div>
            </div>
            <div>
              <Label className="text-xs text-gray-600 mb-1 block">Check-out</Label>
              <div className="flex flex-col gap-2">
                <Input
                  type="date"
                  value={checkOut}
                  onChange={(e) => setCheckOut(e.target.value)}
                  className="bg-white"
                />
                {checkOut && (
                  <p className="text-sm font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded text-center">
                    {displayCheckOut}
                  </p>
                )}
              </div>
            </div>
          </div>

          {properties.length > 0 && (
            <div>
              <Label className="text-xs text-gray-600 mb-1 block">Propriedade *</Label>
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
