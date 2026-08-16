'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/common/ui/card'
import { Button } from '@/components/common/ui/button'
import { Input } from '@/components/common/ui/input'
import { Label } from '@/components/common/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/common/ui/select'
import { Switch } from '@/components/common/ui/switch'
import { toast } from 'sonner'

interface AvailabilitySettings {
  minNights: number
  maxNights: number
  advanceNoticeDays: number
  allowLastMinuteBookings: boolean
  availabilityWindowMonths: number
  allowBookingsBeyondWindow: boolean
}

interface AvailabilityCardProps {
  propertyId: string
  onUpdate?: () => void
}

const NOTICE_DAYS_OPTIONS = [
  { value: 0, label: 'Mesmo dia' },
  { value: 1, label: '1 dia' },
  { value: 2, label: '2 dias' },
  { value: 7, label: '7 dias' },
]

const WINDOW_MONTHS_OPTIONS = [
  { value: 3, label: '3 meses' },
  { value: 6, label: '6 meses' },
  { value: 9, label: '9 meses' },
  { value: 12, label: '12 meses' },
  { value: 24, label: '24 meses' },
]

export function AvailabilityCard({ propertyId, onUpdate }: AvailabilityCardProps) {
  const [settings, setSettings] = useState<AvailabilitySettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Form state
  const [minNights, setMinNights] = useState('')
  const [maxNights, setMaxNights] = useState('')
  const [advanceNoticeDays, setAdvanceNoticeDays] = useState('0')
  const [allowLastMinute, setAllowLastMinute] = useState(false)
  const [windowMonths, setWindowMonths] = useState('12')
  const [allowBeyondWindow, setAllowBeyondWindow] = useState(false)

  // Load settings on mount
  useEffect(() => {
    loadSettings()
  }, [propertyId])

  const loadSettings = async () => {
    try {
      setLoading(true)
      const response = await fetch(
        `/api/properties/${propertyId}/availability/settings`,
        { credentials: 'include' }
      )
      const data = await response.json()

      if (response.ok) {
        setSettings(data)
        setMinNights(data.minNights.toString())
        setMaxNights(data.maxNights.toString())
        setAdvanceNoticeDays(data.advanceNoticeDays.toString())
        setAllowLastMinute(data.allowLastMinuteBookings)
        setWindowMonths(data.availabilityWindowMonths.toString())
        setAllowBeyondWindow(data.allowBookingsBeyondWindow)
      } else {
        toast.error(data?.error || 'Erro ao carregar configurações')
      }
    } catch (error) {
      console.error('Error loading settings:', error)
      toast.error('Erro ao carregar disponibilidade')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)

      // Validate inputs
      const minVal = parseInt(minNights)
      const maxVal = parseInt(maxNights)

      if (isNaN(minVal) || minVal < 1 || minVal > 365) {
        toast.error('Mínimo deve estar entre 1 e 365')
        return
      }

      if (isNaN(maxVal) || maxVal < 1 || maxVal > 365) {
        toast.error('Máximo deve estar entre 1 e 365')
        return
      }

      if (minVal > maxVal) {
        toast.error('Mínimo não pode ser maior que máximo')
        return
      }

      const response = await fetch(
        `/api/properties/${propertyId}/availability/settings`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            minNights: minVal,
            maxNights: maxVal,
            advanceNoticeDays: parseInt(advanceNoticeDays),
            allowLastMinuteBookings: allowLastMinute,
            availabilityWindowMonths: parseInt(windowMonths),
            allowBookingsBeyondWindow: allowBeyondWindow,
          }),
        }
      )

      if (response.ok) {
        const data = await response.json()
        setSettings(data)
        toast.success('Disponibilidade atualizada')
        onUpdate?.()
      } else {
        toast.error('Erro ao salvar')
      }
    } catch (error) {
      console.error('Error saving settings:', error)
      toast.error('Erro ao atualizar disponibilidade')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Card className="p-4 md:p-6">
        <h3 className="text-lg font-semibold mb-4 text-[#1B2430]">Disponibilidade</h3>
        <div className="animate-pulse space-y-4">
          <div className="h-10 bg-[#E5DFD2] rounded"></div>
          <div className="h-10 bg-[#E5DFD2] rounded"></div>
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-4 md:p-6">
      <h3 className="text-lg font-semibold mb-6 text-[#1B2430]">Disponibilidade</h3>

      {/* Min/Max Nights */}
      <div className="space-y-4 mb-6">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="minNights" className="text-sm mb-2 text-[#1B2430]">
              Mínimo de Noites
            </Label>
            <Input
              id="minNights"
              type="number"
              min="1"
              max="365"
              value={minNights}
              onChange={(e) => setMinNights(e.target.value)}
              className="h-12 text-base"
              placeholder="1"
            />
          </div>
          <div>
            <Label htmlFor="maxNights" className="text-sm mb-2 text-[#1B2430]">
              Máximo de Noites
            </Label>
            <Input
              id="maxNights"
              type="number"
              min="1"
              max="365"
              value={maxNights}
              onChange={(e) => setMaxNights(e.target.value)}
              className="h-12 text-base"
              placeholder="365"
            />
          </div>
        </div>
      </div>

      {/* Advance Notice */}
      <div className="mb-6">
        <Label htmlFor="notice" className="text-sm mb-2 block text-[#1B2430]">
          Aviso Prévio Requerido
        </Label>
        <Select value={advanceNoticeDays} onValueChange={setAdvanceNoticeDays}>
          <SelectTrigger id="notice" className="h-12 text-base">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {NOTICE_DAYS_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value.toString()}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Last Minute Bookings Flag */}
      <div className="flex items-center gap-3 mb-6 p-3 bg-[#F7F5EF] rounded-lg">
        <Switch
          id="allowLastMinute"
          checked={allowLastMinute}
          onCheckedChange={setAllowLastMinute}
          className="ml-0"
        />
        <Label
          htmlFor="allowLastMinute"
          className="text-sm font-medium cursor-pointer flex-1 mb-0 text-[#1B2430]"
        >
          Permitir Reservas com &lt;1 Dia
          <span className="block text-xs text-[#4D5566] font-normal mt-1">
            Requer aprovação manual
          </span>
        </Label>
      </div>

      {/* Availability Window */}
      <div className="mb-6">
        <Label htmlFor="window" className="text-sm mb-2 block text-[#1B2430]">
          Período de Disponibilidade
        </Label>
        <Select value={windowMonths} onValueChange={setWindowMonths}>
          <SelectTrigger id="window" className="h-12 text-base">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {WINDOW_MONTHS_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value.toString()}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Beyond Window Flag */}
      <div className="flex items-center gap-3 mb-6 p-3 bg-[#F7F5EF] rounded-lg">
        <Switch
          id="allowBeyond"
          checked={allowBeyondWindow}
          onCheckedChange={setAllowBeyondWindow}
          className="ml-0"
        />
        <Label
          htmlFor="allowBeyond"
          className="text-sm font-medium cursor-pointer flex-1 mb-0 text-[#1B2430]"
        >
          Permitir Reservas Além do Período
          <span className="block text-xs text-[#4D5566] font-normal mt-1">
            Fica como pendente
          </span>
        </Label>
      </div>

      {/* Save Button - Full Width on Mobile */}
      <Button
        onClick={handleSave}
        disabled={saving}
        className="w-full h-12 text-base font-semibold"
      >
        {saving ? 'Salvando...' : 'Salvar Disponibilidade'}
      </Button>
    </Card>
  )
}
