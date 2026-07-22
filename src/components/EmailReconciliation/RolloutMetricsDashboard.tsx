'use client'

import React, { useEffect, useState } from 'react'

interface MatchingMetrics {
  total_extractions: number
  auto_matched_count: number
  needs_review_count: number
  no_match_count: number
  auto_matched_rate: number
  needs_review_rate: number
  no_match_rate: number
  target_met: boolean
}

interface DuplicationCheck {
  has_duplicates: boolean
  duplicate_count: number
  details: string[]
}

interface PropertyAssociationCheck {
  has_wrong_associations: boolean
  wrong_association_count: number
  details: string[]
}

interface RolloutReport {
  metrics: MatchingMetrics
  duplicates: DuplicationCheck
  property_associations: PropertyAssociationCheck
  all_checks_pass: boolean
}

interface DashboardProps {
  organizationId: string
}

/**
 * AC8: Rollout Metrics Dashboard
 * Displays:
 * - Matching rates (auto_matched, needs_review, no_match)
 * - Target status (≥70% auto-match)
 * - Duplication check (must be 0)
 * - Property association check (must be 0)
 */
export function RolloutMetricsDashboard({ organizationId }: DashboardProps) {
  const [report, setReport] = useState<RolloutReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/email-reconciliation/rollout/metrics', {
          headers: {
            'x-organization-id': organizationId,
          },
        })

        if (!response.ok) {
          throw new Error(`Failed to fetch metrics: ${response.statusText}`)
        }

        const data = await response.json()
        setReport(data.report)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
        setReport(null)
      } finally {
        setLoading(false)
      }
    }

    fetchMetrics()
    // Refresh every 5 minutes during pilot
    const interval = setInterval(fetchMetrics, 5 * 60 * 1000)

    return () => clearInterval(interval)
  }, [organizationId])

  if (loading) {
    return <div className="p-6 text-center text-gray-500">Carregando métricas...</div>
  }

  if (error) {
    return <div className="p-6 text-center text-red-600">Erro: {error}</div>
  }

  if (!report) {
    return <div className="p-6 text-center text-gray-500">Sem dados de rollout</div>
  }

  const { metrics, duplicates, property_associations, all_checks_pass } = report

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold">Métricas de Rollout (AC8)</h2>
        <p className="text-gray-600">Monitoramento do piloto de reconciliação automática</p>
      </div>

      {/* Overall Status */}
      <div
        className={`rounded-lg p-6 ${
          all_checks_pass ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className={`text-2xl ${all_checks_pass ? '✅' : '❌'}`} />
          <div>
            <h3 className={`text-lg font-bold ${all_checks_pass ? 'text-green-900' : 'text-red-900'}`}>
              {all_checks_pass ? 'Todos os critérios atendidos' : 'Falha nos critérios'}
            </h3>
            <p className={all_checks_pass ? 'text-green-700' : 'text-red-700'}>
              {all_checks_pass
                ? 'Pronto para expansão após 2 semanas'
                : 'Problemas detectados - revisão necessária'}
            </p>
          </div>
        </div>
      </div>

      {/* Matching Metrics */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h3 className="mb-4 text-lg font-semibold">Resultados de Matching</h3>

        <div className="grid gap-6 md:grid-cols-3">
          {/* Auto-Matched */}
          <div className="rounded-md bg-blue-50 p-4">
            <div className="mb-2 text-sm text-gray-600">Auto-Match</div>
            <div className="mb-2 flex items-baseline gap-2">
              <div className="text-3xl font-bold text-blue-600">{metrics.auto_matched_count}</div>
              <div className="text-sm text-gray-500">
                ({metrics.auto_matched_rate.toFixed(1)}%)
              </div>
            </div>
            <div
              className={`inline-block rounded px-2 py-1 text-xs font-semibold ${
                metrics.target_met
                  ? 'bg-green-100 text-green-800'
                  : 'bg-yellow-100 text-yellow-800'
              }`}
            >
              {metrics.target_met ? '✅ Target met (≥70%)' : '⚠️ Target: ≥70%'}
            </div>
          </div>

          {/* Needs Review */}
          <div className="rounded-md bg-orange-50 p-4">
            <div className="mb-2 text-sm text-gray-600">Needs Review</div>
            <div className="mb-2 flex items-baseline gap-2">
              <div className="text-3xl font-bold text-orange-600">{metrics.needs_review_count}</div>
              <div className="text-sm text-gray-500">
                ({metrics.needs_review_rate.toFixed(1)}%)
              </div>
            </div>
            <div className="text-xs text-gray-500">Manual review required</div>
          </div>

          {/* No Match */}
          <div className="rounded-md bg-gray-50 p-4">
            <div className="mb-2 text-sm text-gray-600">No Match</div>
            <div className="mb-2 flex items-baseline gap-2">
              <div className="text-3xl font-bold text-gray-600">{metrics.no_match_count}</div>
              <div className="text-sm text-gray-500">({metrics.no_match_rate.toFixed(1)}%)</div>
            </div>
            <div className="text-xs text-gray-500">Orphaned extractions</div>
          </div>
        </div>

        <div className="mt-4 text-sm text-gray-500">
          Total extrações: {metrics.total_extractions}
        </div>
      </div>

      {/* Quality Checks */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Duplications */}
        <div
          className={`rounded-lg border p-6 ${
            duplicates.has_duplicates
              ? 'border-red-200 bg-red-50'
              : 'border-green-200 bg-green-50'
          }`}
        >
          <div className="flex items-center gap-2">
            <div className="text-xl">{duplicates.has_duplicates ? '❌' : '✅'}</div>
            <div>
              <h4 className="font-semibold">Duplicações</h4>
              <p
                className={`text-sm ${
                  duplicates.has_duplicates ? 'text-red-700' : 'text-green-700'
                }`}
              >
                {duplicates.duplicate_count === 0
                  ? 'Zero duplicações detectadas'
                  : `${duplicates.duplicate_count} duplicações encontradas`}
              </p>
            </div>
          </div>
          {duplicates.details.length > 0 && (
            <ul className="mt-3 space-y-1 text-xs text-red-600">
              {duplicates.details.map((detail, idx) => (
                <li key={idx}>• {detail}</li>
              ))}
            </ul>
          )}
        </div>

        {/* Property Associations */}
        <div
          className={`rounded-lg border p-6 ${
            property_associations.has_wrong_associations
              ? 'border-red-200 bg-red-50'
              : 'border-green-200 bg-green-50'
          }`}
        >
          <div className="flex items-center gap-2">
            <div className="text-xl">{property_associations.has_wrong_associations ? '❌' : '✅'}</div>
            <div>
              <h4 className="font-semibold">Associações de Propriedade</h4>
              <p
                className={`text-sm ${
                  property_associations.has_wrong_associations
                    ? 'text-red-700'
                    : 'text-green-700'
                }`}
              >
                {property_associations.wrong_association_count === 0
                  ? 'Todas corretas'
                  : `${property_associations.wrong_association_count} incorretas`}
              </p>
            </div>
          </div>
          {property_associations.details.length > 0 && (
            <ul className="mt-3 space-y-1 text-xs text-red-600">
              {property_associations.details.map((detail, idx) => (
                <li key={idx}>• {detail}</li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="rounded-md bg-blue-50 p-4 text-sm text-blue-800">
        <p>
          <strong>Critérios para expansão (após 2 semanas):</strong> Auto-match ≥70% +
          Zero duplicações + Zero associações erradas
        </p>
      </div>
    </div>
  )
}
