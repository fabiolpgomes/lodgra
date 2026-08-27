'use client'

import React, { useState, useEffect } from 'react'
import { formatCurrency } from '@/lib/utils/currency'

interface RevenueData {
  month: string
  actual: number
  predicted: number
}

type SupportedCurrency = 'EUR' | 'BRL' | 'USD' | 'GBP' | 'JPY' | 'AUD' | 'CAD' | 'CHF'

function isSupportedCurrency(curr: string): curr is SupportedCurrency {
  const supported: SupportedCurrency[] = ['EUR', 'BRL', 'USD', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF']
  return supported.includes(curr as SupportedCurrency)
}

interface RevenueBreakdownProps {
  currency?: string
  month?: string
  className?: string
}

export function RevenueBreakdown({ currency, month, className = '' }: RevenueBreakdownProps) {
  const [data, setData] = useState<Record<string, RevenueData[]> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchRevenue = async () => {
      try {
        const params = new URLSearchParams()
        if (currency) params.append('currency', currency)
        if (month) params.append('month', month)

        const response = await fetch(`/api/dashboard/revenue?${params}`)
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const result = await response.json()
        setData(result)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Falha ao carregar os dados de receita')
      } finally {
        setLoading(false)
      }
    }

    fetchRevenue()
  }, [currency, month])

  if (loading) return <div className={className}>A carregar dados de receita...</div>
  if (error) return <div className={className}>Erro: {error}</div>
  if (!data) return <div className={className}>Sem dados disponíveis</div>

  return (
    <div className={className}>
      {Object.entries(data).map(([curr, revenues]) => (
        <div key={curr} className="mb-6 p-4 border rounded-lg">
          <h3 className="text-lg font-semibold mb-4">Receita em {curr}</h3>

          {revenues.length === 0 ? (
            <p className="text-gray-600">Não existem dados de receita disponíveis</p>
          ) : (
            <div className="space-y-3">
              {revenues.map(item => (
                <div key={item.month} className="flex items-center justify-between border-b pb-2">
                  <div className="flex-1">
                    <p className="font-medium">{item.month}</p>
                  </div>

                  <div className="ml-4 text-right">
                    <div className="mb-1">
                      <span className="text-sm text-gray-600">Atual: </span>
                      <span className="font-semibold" title="Receita real do mês atual">
                        {isSupportedCurrency(curr)
                          ? formatCurrency(item.actual, curr)
                          : `${item.actual.toFixed(2)} ${curr}`}
                      </span>
                    </div>

                    {item.predicted > 0 && (
                      <div>
                        <span className="text-sm text-gray-600">Previsto: </span>
                        <span
                          className="font-semibold text-brand-600"
                          title="Receita prevista (fórmula proporcional para reservas com mais de 30 dias)"
                        >
                          {isSupportedCurrency(curr)
                            ? formatCurrency(item.predicted, curr)
                            : `${item.predicted.toFixed(2)} ${curr}`}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              <div className="mt-4 pt-3 border-t-2">
                <p className="text-xs text-gray-600">
                  💡 Reservas ≤30 dias: 100% contabilizadas no mês do check-in
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  💡 Reservas &gt;30 dias: distribuição proporcional usando a fórmula (Total / Dias) × 30
                </p>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
