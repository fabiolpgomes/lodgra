'use client'

import { useState } from 'react'
import { FileText } from 'lucide-react'
import { Button } from '@/components/common/ui/button'
import { toast } from 'sonner'

export function FinancialPdfDownloadButton({
  startDate,
  endDate,
  propertyId,
}: {
  startDate: string
  endDate: string
  propertyId?: string
}) {
  const [loading, setLoading] = useState(false)

  async function handleDownload() {
    try {
      setLoading(true)

      const params = new URLSearchParams({
        startDate,
        endDate,
        ...(propertyId && { propertyId }),
      })

      window.open(
        `/api/reports/financial-pdf-download?${params.toString()}`,
        '_blank'
      )

      toast.success('Abrindo relatório em nova aba...')
    } catch (error) {
      console.error('Error downloading financial PDF:', error)
      toast.error('Erro ao gerar relatório')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      onClick={handleDownload}
      disabled={loading}
      className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
    >
      <FileText className="h-4 w-4" />
      {loading ? 'Gerando...' : 'Download PDF'}
    </Button>
  )
}
