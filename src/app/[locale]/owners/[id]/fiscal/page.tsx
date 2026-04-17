'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from '@/lib/i18n/routing'
import Link from 'next/link'
import { ArrowLeft, FileText, Download, Scale, Building2, TrendingUp, Loader2 } from 'lucide-react'
import { Button } from '@/components/common/ui/button'
import { formatCurrency, type CurrencyCode } from '@/lib/utils/currency'
// Lazy import: @react-pdf/renderer is ~500KB, only load when user clicks download
const loadFiscalReportPDF = () => import('@/components/features/reports/FiscalReportPDF')

interface PropertyFiscal {
  id: string
  name: string
  address: string
  currency: string
  totalRevenue: number
  deductibleExpenses: number
  taxableNet: number
}

interface FiscalData {
  owner: { id: string; full_name: string; email: string; preferred_currency: string; tax_id?: string | null }
  year: number
  properties: PropertyFiscal[]
  summary: { totalRevenue: number; deductibleExpenses: number; taxableNet: number }
}

const CURRENT_YEAR = new Date().getFullYear()
const YEARS = Array.from({ length: 5 }, (_, i) => CURRENT_YEAR - i)

export default function OwnerFiscalPage() {
  const params = useParams<{ id: string }>()
  const ownerId = params.id

  const [year, setYear] = useState(CURRENT_YEAR)
  const [data, setData] = useState<FiscalData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [planUpgradeRequired, setPlanUpgradeRequired] = useState(false)
  const [pdfGenerating, setPdfGenerating] = useState(false)

  const fetchFiscal = useCallback(async () => {
    setLoading(true)
    setError(null)
    setPlanUpgradeRequired(false)
    try {
      const res = await fetch(`/api/owners/${ownerId}/fiscal?year=${year}`)
      const json = await res.json()
      if (res.status === 403 && json.error === 'plan_upgrade_required') {
        setPlanUpgradeRequired(true)
        return
      }
      if (!res.ok) throw new Error(json.error ?? 'Erro ao carregar relatório fiscal')
      setData(json)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }, [ownerId, year])

  useEffect(() => { fetchFiscal() }, [fetchFiscal])

  const currency = (data?.owner?.preferred_currency || 'EUR') as CurrencyCode

  function exportToCsv() {
    if (!data) return
    const rows: Record<string, unknown>[] = data.properties.map(p => ({
      'Imóvel': p.address,
      'Rendas Recebidas': p.totalRevenue.toFixed(2),
      'Deduções (Categoria F)': p.deductibleExpenses.toFixed(2),
      'Resultado Líquido Tributável': p.taxableNet.toFixed(2),
    }))
    rows.push({
      'Imóvel': 'TOTAL',
      'Rendas Recebidas': data.summary.totalRevenue.toFixed(2),
      'Deduções (Categoria F)': data.summary.deductibleExpenses.toFixed(2),
      'Resultado Líquido Tributável': data.summary.taxableNet.toFixed(2),
    })
    const headers = Object.keys(rows[0])
    const escape = (v: unknown) => {
      const s = String(v ?? '')
      return s.includes(',') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s
    }
    const csv = [
      headers.map(escape).join(','),
      ...rows.map(row => headers.map(h => escape(row[h])).join(',')),
    ].join('\r\n')

    const ownerSlug = data.owner.full_name.toLowerCase().replace(/\s+/g, '-')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `categoria-f-${ownerSlug}-${year}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleDownloadPDF() {
    if (!data) return
    setPdfGenerating(true)
    try {
      const { downloadFiscalReportPDF } = await loadFiscalReportPDF()
      await downloadFiscalReportPDF(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao gerar PDF')
    } finally {
      setPdfGenerating(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Toolbar */}
      <div className="no-print bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4 flex-wrap">
          <Link href={`/owners/${ownerId}`} className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900">
            <ArrowLeft className="h-4 w-4" />
            Voltar ao Proprietário
          </Link>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Year selector */}
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600 font-medium">Ano fiscal:</label>
              <select
                value={year}
                onChange={e => setYear(Number(e.target.value))}
                className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {YEARS.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            <Button
              onClick={exportToCsv}
              variant="outline"
              size="sm"
              disabled={!data || data.properties.length === 0}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Exportar Excel
            </Button>

            <Button
              onClick={handleDownloadPDF}
              variant="outline"
              size="sm"
              disabled={!data || data.properties.length === 0 || pdfGenerating}
              className="flex items-center gap-2"
            >
              {pdfGenerating
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <FileText className="h-4 w-4" />}
              {pdfGenerating ? 'A gerar…' : 'Exportar PDF'}
            </Button>
          </div>
        </div>
      </div>

      {/* Report content */}
      <div className="max-w-4xl mx-auto px-6 py-8 report-container">
        {loading && (
          <div className="text-center py-16 text-gray-500">A carregar relatório fiscal…</div>
        )}

        {planUpgradeRequired && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-8 text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-amber-100 rounded-full">
                <TrendingUp className="h-8 w-8 text-amber-600" />
              </div>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Funcionalidade exclusiva do plano Professional</h3>
            <p className="text-gray-600 mb-6">Faça upgrade para aceder a relatórios por proprietário e compliance fiscal.</p>
            <Link href="/#pricing" className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-blue-700 transition-colors">
              Ver planos
            </Link>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">{error}</div>
        )}

        {data && !loading && (
          <>
            {/* Report Header */}
            <div className="mb-8 print:mb-6">
              <div className="flex items-center gap-3 mb-2">
                <Scale className="h-6 w-6 text-purple-600 no-print" />
                <h1 className="text-2xl font-bold text-gray-900 uppercase tracking-wide">
                  Mapa de Rendimentos Prediais — {data.year}
                </h1>
              </div>
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <p className="text-gray-600 text-lg">{data.owner.full_name}</p>
                  {data.owner.email && (
                    <p className="text-gray-500 text-sm">{data.owner.email}</p>
                  )}
                  <p className="text-gray-400 text-xs mt-1">
                    Rendimentos Categoria F · IRS {data.year} · Artigo 8.º CIRS
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400 uppercase font-medium mb-0.5">NIF</p>
                  {data.owner.tax_id
                    ? <p className="text-lg font-mono font-bold text-purple-700 tracking-wider">{data.owner.tax_id}</p>
                    : <p className="text-sm text-red-500">Não preenchido</p>
                  }
                </div>
              </div>
            </div>

            {data.properties.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-12 text-center text-gray-500">
                <Building2 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p className="font-medium">Sem dados fiscais para {data.year}</p>
                <p className="text-sm mt-1">Nenhuma propriedade com movimentos no ano {data.year}.</p>
              </div>
            ) : (
              <>
                {/* Fiscal table */}
                <div className="bg-white rounded-lg shadow overflow-hidden mb-8 print:shadow-none print:border print:border-gray-200">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Imóvel / Identificação
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Rendas Recebidas
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Deduções<br />
                          <span className="text-xs font-normal normal-case text-gray-400">(manut./reparos/seguros/impostos)</span>
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Resultado<br />
                          <span className="text-xs font-normal normal-case text-gray-400">Líquido Tributável</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {data.properties.map(prop => {
                        const propCurrency = (prop.currency || currency) as CurrencyCode
                        return (
                          <tr key={prop.id}>
                            <td className="px-6 py-4">
                              <div className="text-sm font-medium text-gray-900">{prop.name}</div>
                              {prop.address && prop.address !== prop.name && (
                                <div className="text-xs text-gray-500 mt-0.5">{prop.address}</div>
                              )}
                            </td>
                            <td className="px-6 py-4 text-right text-sm text-gray-900">
                              {formatCurrency(prop.totalRevenue, propCurrency)}
                            </td>
                            <td className="px-6 py-4 text-right text-sm text-green-700">
                              {prop.deductibleExpenses > 0
                                ? `− ${formatCurrency(prop.deductibleExpenses, propCurrency)}`
                                : '—'}
                            </td>
                            <td className="px-6 py-4 text-right text-sm font-semibold text-purple-700">
                              {formatCurrency(prop.taxableNet, propCurrency)}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                    <tfoot className="bg-gray-50 border-t-2 border-gray-300">
                      <tr>
                        <td className="px-6 py-4 text-sm font-bold text-gray-900 uppercase">Total</td>
                        <td className="px-6 py-4 text-right text-sm font-bold text-gray-900">
                          {formatCurrency(data.summary.totalRevenue, currency)}
                        </td>
                        <td className="px-6 py-4 text-right text-sm font-bold text-green-700">
                          {data.summary.deductibleExpenses > 0
                            ? `− ${formatCurrency(data.summary.deductibleExpenses, currency)}`
                            : '—'}
                        </td>
                        <td className="px-6 py-4 text-right text-sm font-bold text-purple-700">
                          {formatCurrency(data.summary.taxableNet, currency)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Summary cards */}
                <div className="grid grid-cols-3 gap-4 no-print">
                  <div className="bg-blue-50 rounded-lg p-4 text-center">
                    <p className="text-xs text-gray-500 uppercase font-medium mb-1">Rendas Totais</p>
                    <p className="text-xl font-bold text-blue-700">{formatCurrency(data.summary.totalRevenue, currency)}</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4 text-center">
                    <p className="text-xs text-gray-500 uppercase font-medium mb-1">Deduções Cat. F</p>
                    <p className="text-xl font-bold text-green-700">{formatCurrency(data.summary.deductibleExpenses, currency)}</p>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-4 text-center">
                    <p className="text-xs text-gray-500 uppercase font-medium mb-1">Líquido Tributável</p>
                    <p className="text-xl font-bold text-purple-700">{formatCurrency(data.summary.taxableNet, currency)}</p>
                  </div>
                </div>

                {/* Legal disclaimer */}
                <div className="mt-6 bg-amber-50 border border-amber-200 rounded-lg p-4 no-print">
                  <p className="text-xs text-amber-800">
                    <strong>Nota:</strong> Este mapa é apenas indicativo. Deduções incluem despesas categorizadas como manutenção,
                    reparações, seguros e impostos. Confirme com o seu contabilista antes de submeter a declaração de IRS.
                    Retenção na fonte (25%) aplica-se apenas quando o arrendatário é uma pessoa colectiva.
                  </p>
                </div>
              </>
            )}
          </>
        )}
      </div>

    </div>
  )
}
