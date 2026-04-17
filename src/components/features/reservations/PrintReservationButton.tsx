'use client'

import { Printer } from 'lucide-react'
import { Button } from '@/components/common/ui/button'

export function PrintReservationButton() {
  return (
    <Button
      variant="outline"
      onClick={() => window.print()}
      title="Imprimir / Salvar como PDF"
    >
      <Printer className="h-4 w-4" />
      Imprimir / PDF
    </Button>
  )
}
