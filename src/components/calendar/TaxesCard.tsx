'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/common/ui/card'
import { Button } from '@/components/common/ui/button'
import { Input } from '@/components/common/ui/input'
import { Label } from '@/components/common/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/common/ui/dialog'
import { toast } from 'sonner'
import { X, Plus } from 'lucide-react'

interface Fee {
  name: string
  amount: number
}

type FormFee = Omit<Fee, 'amount'> & { amount: number | '' }

interface TaxesCardProps {
  propertyId: string
  onUpdate?: () => void
}

export function TaxesCard({ propertyId, onUpdate }: TaxesCardProps) {
  const [fees, setFees] = useState<Fee[]>([])
  const [loading, setLoading] = useState(true)
  const [showDialog, setShowDialog] = useState(false)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [formFees, setFormFees] = useState<FormFee[]>([])

  useEffect(() => {
    loadFees()
  }, [propertyId])

  const loadFees = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/properties/${propertyId}/fees`)
      if (!response.ok) throw new Error(`Failed to load fees (${response.status})`)
      const data = await response.json()

      if (data.success && data.data.fees) {
        setFees(data.data.fees)
      } else if (data.success && Array.isArray(data.data)) {
        setFees(data.data)
      }
    } catch (error) {
      console.error('Error loading fees:', error)
      // Silently fail - fees might not exist yet
    } finally {
      setLoading(false)
    }
  }

  const handleOpenDialog = () => {
    setFormFees([...fees])
    setEditingIndex(null)
    setShowDialog(true)
  }

  const handleAddFee = () => {
    setFormFees([...formFees, { name: '', amount: '' }])
  }

  const handleRemoveFee = (index: number) => {
    setFormFees(formFees.filter((_, i) => i !== index))
  }

  const handleFeeChange = (index: number, field: 'name' | 'amount', value: string | number) => {
    const updated = [...formFees]
    if (field === 'amount') {
      updated[index].amount = value === ''
        ? ''
        : typeof value === 'string'
          ? parseFloat(value) || 0
          : value
    } else {
      updated[index].name = value as string
    }
    setFormFees(updated)
  }

  const handleSave = async () => {
    try {
      // Validate fees
      for (const fee of formFees) {
        if (!fee.name.trim()) {
          toast.error('Nome da taxa é obrigatório')
          return
        }
        if (typeof fee.amount !== 'number' || !Number.isFinite(fee.amount) || fee.amount <= 0) {
          toast.error('Valor da taxa deve ser maior que 0')
          return
        }
      }

      const normalizedFees: Fee[] = formFees.map((fee) => ({
        name: fee.name.trim(),
        amount: fee.amount as number,
      }))

      const response = await fetch(`/api/properties/${propertyId}/fees`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fees: normalizedFees }),
      })

      const data = await response.json().catch(() => null)
      if (response.ok && data?.success) {
        setFees(normalizedFees)
        setShowDialog(false)
        toast.success('Taxas atualizadas')
        onUpdate?.()
      } else {
        toast.error(data?.error || 'Erro ao salvar taxas')
      }
    } catch (error) {
      console.error('Error saving fees:', error)
      toast.error('Erro ao salvar taxas')
    }
  }

  if (loading) {
    return (
      <Card className="p-4 md:p-6">
        <h3 className="mb-4 text-lg font-semibold text-[#1B2430]">Taxas</h3>
        <div className="animate-pulse space-y-3">
          <div className="h-16 bg-[#E5DFD2] rounded"></div>
        </div>
      </Card>
    )
  }

  return (
    <>
      <Card className="p-4 md:p-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-lg font-semibold text-[#1B2430]">Taxas</h3>
          <Button
            onClick={handleOpenDialog}
            variant="outline"
            size="sm"
            className="h-10 w-full sm:w-auto"
          >
            <Plus className="w-4 h-4 mr-2" />
            Editar
          </Button>
        </div>

        {fees.length === 0 ? (
          <div className="text-center py-8 text-[#4D5566]">
            <p className="text-sm mb-3">Nenhuma taxa cadastrada</p>
            <Button
              onClick={handleOpenDialog}
              variant="default"
              size="sm"
              className="h-10 w-full sm:w-auto"
            >
              Adicionar Taxa
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {fees.map((fee, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-[#F7F5EF] rounded-lg"
              >
                <div className="flex-1">
                  <p className="font-medium text-sm text-[#1B2430]">{fee.name}</p>
                  <p className="text-xs text-[#4D5566] mt-1">{fee.amount.toFixed(2)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="w-[calc(100%_-_1rem)] max-w-lg sm:w-full">
          <DialogHeader>
            <DialogTitle className="text-[#1B2430]">Gerenciar Taxas</DialogTitle>
            <DialogDescription className="text-[#4D5566]">
              Adicione ou remova taxas que serão aplicadas às reservas
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-96 space-y-4 overflow-y-auto">
            {formFees.map((fee, index) => (
              <div key={index} className="space-y-2 p-3 bg-[#F7F5EF] rounded-lg">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                  <div className="flex-1 space-y-2">
                    <div>
                      <Label className="text-xs mb-1 block text-[#1B2430]">Nome da Taxa</Label>
                      <Input
                        value={fee.name}
                        onChange={(e) => handleFeeChange(index, 'name', e.target.value)}
                        placeholder="Ex: Limpeza, Pet, WiFi"
                        className="h-10 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs mb-1 block text-[#1B2430]">Valor</Label>
                      <Input
                        type="number"
                        value={fee.amount}
                        onChange={(e) => handleFeeChange(index, 'amount', e.target.value)}
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                        className="h-10 text-sm"
                      />
                    </div>
                  </div>
                  <Button
                    onClick={() => handleRemoveFee(index)}
                    variant="ghost"
                    size="sm"
                    className="h-10 w-10 self-end p-0 sm:mt-6 sm:self-auto"
                  >
                    <X className="w-4 h-4 text-[#1B2430]" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <Button
            onClick={handleAddFee}
            variant="outline"
            className="h-12 w-full text-base"
          >
            <Plus className="w-4 h-4 mr-2" />
            Adicionar Taxa
          </Button>

          <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:gap-3">
            <Button
              onClick={() => setShowDialog(false)}
              variant="outline"
              className="h-12 w-full flex-1 text-[#1B2430] border-[#E5DFD2] sm:w-auto"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              className="h-12 w-full flex-1 text-base font-semibold bg-[#10203E] hover:bg-[#0D1A2E] sm:w-auto"
            >
              Salvar Taxas
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
