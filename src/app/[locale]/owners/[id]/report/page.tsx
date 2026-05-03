'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from '@/lib/i18n/routing'
import Link from 'next/link'
import { ArrowLeft, FileText, Building2, Download, TrendingUp, Loader2, MessageCircle } from 'lucide-react'
import { Button } from '@/components/common/ui/button'
import { formatCurrency, type CurrencyCode } from '@/lib/utils/currency'
import { CurrencyStack } from '@/components/common/ui/CurrencyStack'
// Lazy import: @react-pdf/renderer is ~500KB, only load when user clicks download
const loadOwnerReportPDF = () => import('@/components/features/reports/OwnerReportPDF')

interface PropertyReport {
  id: string
  name: string
  currency: string
  management_percentage: number
  revenue: number
  managementFee: number
  expenses: number
  ownerNet: number
}

interface CurrencySummary {
  revenue: number
  managementFee: number
  expenses: number
  ownerNet: number
}

interface ReportData {
  owner: { id: string; full_name: string; email: string; preferred_currency: string }
  properties: PropertyReport[]
  summary: { revenue: number; managementFee: number; expenses: number; ownerNet: number }
  summaryByCurrency: Record<string, CurrencySummary>
}

type Period = 'month' | 'quarter' | 'year' | 'custom'

function getPeriodDates(period: Period, customFrom?: string, customTo?: string): { from: string; to: string; label: string } {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth()

  if (period === 'month') {
    const from = new Date(y, m, 1).toISOString().slice(0, 10)
    const to = new Date(y, m + 1, 0).toISOString().slice(0, 10)
    return { from, to, label: now.toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' }) }
  }
  if (period === 'quarter') {
    const q = Math.floor(m / 3)
    const from = new Date(y, q * 3, 1).toISOString().slice(0, 10)
    const to = new Date(y, q * 3 + 3, 0).toISOString().slice(0, 10)
    return { from, to, label: `T${q + 1} ${y}` }
  }
  if (period === 'year') {
    return { from: `${y}-01-01`, to: `${y}-12-31`, label: `${y}` }
  }
  // custom
  return {
    from: customFrom ?? `${y}-01-01`,
    to: customTo ?? new Date(y, m + 1, 0).toISOString().slice(0, 10),
    label: `${customFrom} a ${customTo}`,
  }
}

const BADGE_COLORS: Record<string, string> = {
  EUR: 'bg-blue-50 text-blue-700 ring-blue-200',
  BRL: 'bg-green-50 text-green-700 ring-green-200',
  USD: 'bg-yellow-50 text-yellow-700 ring-yellow-200',
  GBP: 'bg-purple-50 text-purple-700 ring-purple-200',
}
const DEFAULT_BADGE = 'bg-gray-100 text-gray-700 ring-gray-200'

function CurrencyBadge({ currency }: { currency: string }) {
  const color = BADGE_COLORS[currency] ?? DEFAULT_BADGE
  return (
    <span className={`inline-flex items-center justify-center min-w-[2.5rem] h-5 px-1.5 text-[10px] font-bold uppercase tracking-widest rounded ring-1 shrink-0 ${color}`}>
      {currency}
    </span>
  )
}

export default function OwnerReportPage() {
  const params = useParams<{ id: string }>()
  const ownerId = params.id

  const [period, setPeriod] = useState<Period>('month')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [report, setReport] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [planUpgradeRequired, setPlanUpgradeRequired] = useState(false)
  const [pdfGenerating, setPdfGenerating] = useState(false)

  const fetchReport = useCallback(async () => {
    const { from, to } = getPeriodDates(period, customFrom, customTo)
    setLoading(true)
    setError(null)
    setPlanUpgradeRequired(false)
    try {
      const res = await fetch(`/api/owners/${ownerId}/report?from=${from}&to=${to}`)
      const data = await res.json()
      if (res.status === 403 && data.error === 'plan_upgrade_required') {
        setPlanUpgradeRequired(true)
        return
      }
      if (!res.ok) throw new Error(data.error ?? 'Erro ao carregar relatório')
      setReport(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }, [ownerId, period, customFrom, customTo])

  useEffect(() => {
    if (period !== 'custom') fetchReport()
  }, [period, fetchReport])

  const { label } = getPeriodDates(period, customFrom, customTo)

  // Resolve summaryByCurrency — fallback for old API responses without the field
  function getSummaryByCurrency(): Record<string, CurrencySummary> {
    if (!report) return {}
    if (report.summaryByCurrency && Object.keys(report.summaryByCurrency).length > 0) {
      return report.summaryByCurrency
    }
    // Fallback: build from properties
    const byCur: Record<string, CurrencySummary> = {}
    report.properties.forEach(p => {
      const cur = p.currency || 'EUR'
      if (!byCur[cur]) byCur[cur] = { revenue: 0, managementFee: 0, expenses: 0, ownerNet: 0 }
      byCur[cur].revenue += p.revenue
      byCur[cur].managementFee += p.managementFee
      byCur[cur].expenses += p.expenses
      byCur[cur].ownerNet += p.ownerNet
    })
    return byCur
  }

  function exportToCsv() {
    if (!report) return
    const rows: Record<string, unknown>[] = report.properties.map(p => ({
      'Moeda': p.currency || 'EUR',
      'Propriedade': p.name,
      'Receita Bruta': p.revenue.toFixed(2),
      'Comissão Gestão (%)': p.management_percentage,
      'Comissão Gestão': p.managementFee.toFixed(2),
      'Despesas': p.expenses.toFixed(2),
      'Receita Líquida': p.ownerNet.toFixed(2),
    }))
    // One total row per currency
    const byCur = getSummaryByCurrency()
    Object.entries(byCur).forEach(([cur, s]) => {
      rows.push({
        'Moeda': cur,
        'Propriedade': `TOTAL (${cur})`,
        'Receita Bruta': s.revenue.toFixed(2),
        'Comissão Gestão (%)': '',
        'Comissão Gestão': s.managementFee.toFixed(2),
        'Despesas': s.expenses.toFixed(2),
        'Receita Líquida': s.ownerNet.toFixed(2),
      })
    })

    const headers = Object.keys(rows[0])
    const escape = (v: unknown) => {
      const s = String(v ?? '')
      return s.includes(',') || s.includes('"') || s.includes('\n')
        ? `"${s.replace(/"/g, '""')}"` : s
    }
    const csv = [
      headers.map(escape).join(','),
      ...rows.map(row => headers.map(h => escape(row[h])).join(',')),
    ].join('\r\n')

    const ownerSlug = report.owner.full_name.toLowerCase().replace(/\s+/g, '-')
    const periodSlug = label.replace(/\s+/g, '-')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `relatorio-${ownerSlug}-${periodSlug}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleShareWhatsApp() {
    if (!report) return
    const { label: periodLabel } = getPeriodDates(period, customFrom, customTo)
    const ownerName = report.owner.full_name
    const byCur = getSummaryByCurrency()
    const currencies = Object.keys(byCur)

    let financialLines: string[]
    if (currencies.length === 1) {
      const cur = currencies[0] as CurrencyCode
      const s = byCur[cur]
      financialLines = [
        `💰 Receita bruta: ${formatCurrency(s.revenue, cur)}`,
        `🔧 Despesas: ${formatCurrency(s.expenses, cur)}`,
        `📋 Taxa de gestão: ${formatCurrency(s.managementFee, cur)}`,
        `✅ *Líquido proprietário: ${formatCurrency(s.ownerNet, cur)}*`,
      ]
    } else {
      financialLines = currencies.flatMap(cur => {
        const s = byCur[cur]
        return [
          `[${cur}] 💰 ${formatCurrency(s.revenue, cur as CurrencyCode)} | 🔧 ${formatCurrency(s.expenses, cur as CurrencyCode)} | ✅ ${formatCurrency(s.ownerNet, cur as CurrencyCode)}`,
        ]
      })
    }

    const text = [
      `📊 *Relatório Lodgra — ${periodLabel}*`,
      `👤 Proprietário: ${ownerName}`,
      ``,
      ...financialLines,
      ``,
      `Gerado via Lodgra 🏠`,
    ].join('\n')
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
  }

  async function handleDownloadPDF() {
    if (!report) return
    setPdfGenerating(true)
    try {
      const { downloadOwnerReportPDF } = await loadOwnerReportPDF()
      await downloadOwnerReportPDF(report, label)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao gerar PDF')
    } finally {
      setPdfGenerating(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Toolbar — hidden on print */}
      <div className="no-print bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4 flex-wrap">
          <Link href={`/owners/${ownerId}`} className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900">
            <ArrowLeft className="h-4 w-4" />
            Voltar ao Proprietário
          </Link>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Period selector */}
            <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
              {(['month', 'quarter', 'year', 'custom'] as Period[]).map(p => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    period === p ? 'bg-white shadow text-gray-900' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {p === 'month' ? 'Mês' : p === 'quarter' ? 'Trimestre' : p === 'year' ? 'Ano' : 'Custom'}
                </button>
              ))}
            </div>

            {period === 'custom' && (
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={customFrom}
                  onChange={e => setCustomFrom(e.target.value)}
                  className="border border-gray-300 rounded px-2 py-1 text-sm"
                />
                <span className="text-gray-500">→</span>
                <input
                  type="date"
                  value={customTo}
                  onChange={e => setCustomTo(e.target.value)}
                  className="border border-gray-300 rounded px-2 py-1 text-sm"
                />
                <Button size="sm" onClick={fetchReport} disabled={!customFrom || !customTo}>
                  Carregar
                </Button>
              </div>
            )}

            <Button
              onClick={handleShareWhatsApp}
              variant="outline"
              size="sm"
              disabled={!report || report.properties.length === 0}
              className="flex items-center gap-2 text-green-700 border-green-300 hover:bg-green-50"
            >
              <MessageCircle className="h-4 w-4" />
              WhatsApp
            </Button>

            <Button
              onClick={exportToCsv}
              variant="outline"
              size="sm"
              disabled={!report || report.properties.length === 0}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Exportar Excel
            </Button>

            <Button
              onClick={handleDownloadPDF}
              variant="outline"
              size="sm"
              disabled={!report || report.properties.length === 0 || pdfGenerating}
              className="flex items-center gap-2"
            >
              {pdfGenerating
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <FileText className="h-4 w-4" />
              }
              {pdfGenerating ? 'A gerar…' : 'Exportar PDF'}
            </Button>
          </div>
        </div>
      </div>

      {/* Report content */}
      <div className="max-w-4xl mx-auto px-6 py-8 report-container">
        {loading && (
          <div className="text-center py-16 text-gray-500">A carregar relatório…</div>
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
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
            {error}
          </div>
        )}

        {report && !loading && (
          <>
            {/* Report Header */}
            <div className="mb-8 print:mb-6">
              <div className="flex items-center gap-3 mb-2">
                <FileText className="h-6 w-6 text-blue-600 no-print" />
                <h1 className="text-2xl font-bold text-gray-900">Relatório do Proprietário</h1>
              </div>
              <p className="text-gray-600 text-lg">{report.owner.full_name}</p>
              <p className="text-gray-500 text-sm mt-1">Período: {label}</p>
              {report.owner.email && (
                <p className="text-gray-500 text-sm">{report.owner.email}</p>
              )}
            </div>

            {report.properties.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-12 text-center text-gray-500">
                <Building2 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p className="font-medium">Nenhuma propriedade associada</p>
                <p className="text-sm mt-1">Este proprietário não tem propriedades com dados no período seleccionado.</p>
              </div>
            ) : (
              <>
                {/* Table */}
                <div className="bg-white rounded-lg shadow overflow-hidden mb-8 print:shadow-none print:border print:border-gray-200">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Propriedade
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Receita Bruta
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Comissão Gestão
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Despesas
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Líquido Proprietário
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {report.properties.map(prop => {
                        const propCurrency = (prop.currency || 'EUR') as CurrencyCode
                        return (
                          <tr key={prop.id}>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <CurrencyBadge currency={prop.currency || 'EUR'} />
                                <div>
                                  <div className="text-sm font-medium text-gray-900">{prop.name}</div>
                                  {prop.management_percentage > 0 && (
                                    <div className="text-xs text-gray-500">{prop.management_percentage}% gestão</div>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-right text-sm text-gray-900">
                              {formatCurrency(prop.revenue, propCurrency)}
                            </td>
                            <td className="px-6 py-4 text-right text-sm text-orange-600">
                              {prop.management_percentage > 0
                                ? formatCurrency(prop.managementFee, propCurrency)
                                : '—'}
                            </td>
                            <td className="px-6 py-4 text-right text-sm text-red-600">
                              {formatCurrency(prop.expenses, propCurrency)}
                            </td>
                            <td className="px-6 py-4 text-right text-sm font-semibold text-teal-700">
                              {formatCurrency(prop.ownerNet, propCurrency)}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                    {/* One total row per currency — never mix currencies */}
                    <tfoot className="bg-gray-50 border-t-2 border-gray-300">
                      {Object.entries(getSummaryByCurrency()).map(([cur, s]) => (
                        <tr key={cur}>
                          <td className="px-6 py-4 text-sm font-bold text-gray-900 uppercase">
                            <div className="flex items-center gap-2">
                              <CurrencyBadge currency={cur} />
                              Total
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right text-sm font-bold text-gray-900">
                            {formatCurrency(s.revenue, cur as CurrencyCode)}
                          </td>
                          <td className="px-6 py-4 text-right text-sm font-bold text-orange-600">
                            {formatCurrency(s.managementFee, cur as CurrencyCode)}
                          </td>
                          <td className="px-6 py-4 text-right text-sm font-bold text-red-600">
                            {formatCurrency(s.expenses, cur as CurrencyCode)}
                          </td>
                          <td className="px-6 py-4 text-right text-sm font-bold text-teal-700">
                            {formatCurrency(s.ownerNet, cur as CurrencyCode)}
                          </td>
                        </tr>
                      ))}
                    </tfoot>
                  </table>
                </div>

                {/* Summary cards — grouped by currency */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 no-print">
                  <div className="bg-green-50 rounded-lg p-4">
                    <p className="text-xs text-gray-500 uppercase font-medium mb-2">Receita Bruta</p>
                    <CurrencyStack
                      totals={Object.fromEntries(Object.entries(getSummaryByCurrency()).map(([c, s]) => [c, s.revenue]))}
                      size="sm"
                      showEmpty={true}
                    />
                  </div>
                  <div className="bg-orange-50 rounded-lg p-4">
                    <p className="text-xs text-gray-500 uppercase font-medium mb-2">Comissão</p>
                    <CurrencyStack
                      totals={Object.fromEntries(Object.entries(getSummaryByCurrency()).map(([c, s]) => [c, s.managementFee]))}
                      size="sm"
                      showEmpty={true}
                    />
                  </div>
                  <div className="bg-red-50 rounded-lg p-4">
                    <p className="text-xs text-gray-500 uppercase font-medium mb-2">Despesas</p>
                    <CurrencyStack
                      totals={Object.fromEntries(Object.entries(getSummaryByCurrency()).map(([c, s]) => [c, s.expenses]))}
                      size="sm"
                      showEmpty={true}
                    />
                  </div>
                  <div className="bg-teal-50 rounded-lg p-4">
                    <p className="text-xs text-gray-500 uppercase font-medium mb-2">Líquido Proprietário</p>
                    <CurrencyStack
                      totals={Object.fromEntries(Object.entries(getSummaryByCurrency()).map(([c, s]) => [c, s.ownerNet]))}
                      size="sm"
                      showEmpty={true}
                    />
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>

    </div>
  )
}
