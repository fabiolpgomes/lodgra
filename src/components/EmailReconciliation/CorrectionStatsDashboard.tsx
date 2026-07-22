'use client'

import React, { useEffect, useState } from 'react'

interface CorrectionStats {
  field: string
  platform: string
  count: number
  rate: number
}

interface DashboardProps {
  organizationId: string
}

/**
 * AC7: Simple dashboard showing correction rate by field and platform
 * Displays: field name, platform, correction count, and correction rate (%)
 */
export function CorrectionStatsDashboard({ organizationId }: DashboardProps) {
  const [stats, setStats] = useState<CorrectionStats[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/email-reconciliation/corrections/stats', {
          headers: {
            'x-organization-id': organizationId,
          },
        })

        if (!response.ok) {
          throw new Error(`Failed to fetch stats: ${response.statusText}`)
        }

        const data = await response.json()
        setStats(data.stats || [])
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
        setStats([])
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [organizationId])

  if (loading) {
    return <div className="p-6 text-center text-gray-500">Carregando estatísticas...</div>
  }

  if (error) {
    return <div className="p-6 text-center text-red-600">Erro: {error}</div>
  }

  if (stats.length === 0) {
    return <div className="p-6 text-center text-gray-500">Nenhuma correção registrada</div>
  }

  return (
    <div className="space-y-6 p-6">
      <div className="mb-4">
        <h2 className="text-2xl font-bold">Taxa de Correções</h2>
        <p className="text-gray-600">Campos corrigidos por plataforma</p>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Campo</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Plataforma</th>
              <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">
                Correções
              </th>
              <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">Taxa %</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {stats.map((stat, idx) => (
              <tr key={`${stat.field}-${stat.platform}-${idx}`} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm font-medium text-gray-900">{stat.field}</td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  <span className="inline-block rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-800">
                    {stat.platform}
                  </span>
                </td>
                <td className="px-6 py-4 text-right text-sm text-gray-600">{stat.count}</td>
                <td className="px-6 py-4 text-right text-sm">
                  <div className="flex items-center justify-end gap-2">
                    <div className="h-2 w-24 rounded-full bg-gray-200">
                      <div
                        className="h-full rounded-full bg-orange-500"
                        style={{ width: `${Math.min(stat.rate, 100)}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-900">
                      {stat.rate.toFixed(1)}%
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rounded-md bg-blue-50 p-4 text-sm text-blue-800">
        <p>
          <strong>Dica:</strong> Uma alta taxa de correção em um campo pode indicar problema na
          extração LLM ou configuração de validação.
        </p>
      </div>
    </div>
  )
}
