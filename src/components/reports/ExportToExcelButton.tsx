'use client'

import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ExportToExcelProps {
  data: Record<string, unknown>[]
  filename: string
  sheetName: string
}

function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return ''
  const headers = Object.keys(rows[0])
  const escape = (v: unknown) => {
    const s = String(v ?? '')
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"`
      : s
  }
  const lines = [
    headers.map(escape).join(','),
    ...rows.map(row => headers.map(h => escape(row[h])).join(',')),
  ]
  return lines.join('\r\n')
}

export function ExportToExcelButton({ data, filename }: ExportToExcelProps) {
  const handleExport = () => {
    if (data.length === 0) {
      alert('Não há dados para exportar')
      return
    }

    const csv = toCsv(data)
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Button
      onClick={handleExport}
      disabled={data.length === 0}
      className="bg-green-600 hover:bg-green-700"
    >
      <Download className="h-4 w-4" />
      Exportar CSV
    </Button>
  )
}
