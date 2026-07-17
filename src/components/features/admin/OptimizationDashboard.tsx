'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/common/ui/card'
import { Button } from '@/components/common/ui/button'
import { Lightbulb, Zap, Award, AlertCircle } from 'lucide-react'

interface RankingFactor {
  name: string
  score: number
  weight: number
  benchmark: number
  gap: number
  recommendation?: string
}

interface Recommendation {
  id: string
  propertyId: string
  title: string
  description: string
  action: string
  priority: 'critical' | 'high' | 'medium' | 'low'
  estimatedImpact: string
  estimatedImpactPercent: number
  effort: 'quick' | 'medium' | 'high'
  category: string
  implemented: boolean
}

interface OptimizationData {
  overallScore: number
  factors: RankingFactor[]
  competitivePosition: string
  improvementPotential: number
  recommendations: Recommendation[]
  topRecommendation?: Recommendation
  quickWins: Recommendation[]
}

export function OptimizationDashboard({ properties }: { properties: Array<{ id: string; name?: string }> }) {
  const [optimization, setOptimization] = useState<Map<string, OptimizationData>>(new Map())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedProperty, setSelectedProperty] = useState<string | null>(null)

  useEffect(() => {
    if (properties.length > 0) {
      setSelectedProperty(properties[0].id)
    }
  }, [properties])

  useEffect(() => {
    if (selectedProperty) {
      analyzeProperty(selectedProperty)
    }
  }, [selectedProperty])

  async function analyzeProperty(propertyId: string) {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/google/optimization-analysis?propertyId=${propertyId}`)

      if (!response.ok) {
        throw new Error('Failed to analyze property')
      }

      const data = await response.json()
      const newOptimization = new Map(optimization)
      newOptimization.set(propertyId, data)
      setOptimization(newOptimization)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Analysis failed'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-50 border-red-200'
      case 'high':
        return 'bg-orange-50 border-orange-200'
      case 'medium':
        return 'bg-yellow-50 border-yellow-200'
      case 'low':
        return 'bg-blue-50 border-blue-200'
      default:
        return 'bg-gray-50'
    }
  }

  const getEffortLabel = (effort: string) => {
    switch (effort) {
      case 'quick':
        return '⚡ Quick (less than 1h)'
      case 'medium':
        return '⏱️ Medium (1-4h)'
      case 'high':
        return '⚙️ High (> 4h)'
      default:
        return effort
    }
  }

  const currentData = selectedProperty ? optimization.get(selectedProperty) : null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-be-text">
            Google Optimization Tools
          </h1>
          <p className="text-sm text-be-text-muted-500 mt-1">
            AI-powered recommendations to improve ranking and bookings
          </p>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Card className="bg-red-50 border-red-200">
          <div className="flex items-center gap-3 p-4">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <div>
              <h3 className="font-medium text-red-900">Error</h3>
              <p className="text-sm text-red-800">{error}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Property Selector */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {properties.map((property) => (
          <Button
            key={property.id}
            onClick={() => setSelectedProperty(property.id)}
            variant={selectedProperty === property.id ? 'be-primary' : 'be-secondary'}
            size="be-md"
            className="whitespace-nowrap"
          >
            {property.name}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-8">
          <div className="text-be-text-muted-500">Analyzing property...</div>
        </div>
      ) : currentData ? (
        <>
          {/* Overall Score */}
          <Card>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-be-text">Ranking Score</h2>
                  <p className="text-sm text-be-text-muted-500">Overall optimization level</p>
                </div>
                <div className="text-right">
                  <div className="text-4xl font-bold text-be-blue">
                    {currentData.overallScore.toFixed(1)}/5
                  </div>
                  <p className="text-sm text-be-text-muted mt-1">
                    {currentData.competitivePosition.replace(/_/g, ' ')}
                  </p>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-lodgra-neutral-200 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-be-blue h-full transition-all"
                  style={{ width: `${(currentData.overallScore / 5) * 100}%` }}
                />
              </div>

              <p className="text-sm text-be-text-muted mt-4">
                Improvement potential: <span className="font-semibold">{currentData.improvementPotential}%</span>
              </p>
            </div>
          </Card>

          {/* Ranking Factors */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {currentData.factors.map((factor, idx) => (
              <Card key={idx}>
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-be-text capitalize">{factor.name}</h3>
                    <div className="text-2xl font-bold text-be-blue">{factor.score.toFixed(1)}</div>
                  </div>

                  <div className="text-xs text-be-text-muted mb-3">
                    Benchmark: {factor.benchmark.toFixed(0)} | Gap: {factor.gap > 0 ? '+' : ''}{factor.gap.toFixed(0)}
                  </div>

                  <div className="bg-lodgra-neutral-100 rounded h-2 overflow-hidden">
                    <div
                      className="bg-be-blue h-full transition-all"
                      style={{ width: `${(factor.score / 5) * 100}%` }}
                    />
                  </div>

                  {factor.recommendation && (
                    <p className="text-xs text-be-text-muted-700 mt-2 line-clamp-2">
                      💡 {factor.recommendation}
                    </p>
                  )}
                </div>
              </Card>
            ))}
          </div>

          {/* Top Recommendation */}
          {currentData.topRecommendation && (
            <Card className="border-be-blue border-2">
              <div className="p-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-be-blue bg-opacity-10 rounded-lg">
                    <Zap className="w-6 h-6 text-be-blue" />
                  </div>

                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-be-text">
                      {currentData.topRecommendation.title}
                    </h3>
                    <p className="text-sm text-be-text-muted mt-1">
                      {currentData.topRecommendation.description}
                    </p>

                    <div className="flex items-center gap-4 mt-4">
                      <div>
                        <p className="text-xs text-be-text-muted">Expected Impact</p>
                        <p className="text-lg font-semibold text-green-600">
                          {currentData.topRecommendation.estimatedImpact}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-be-text-muted">Effort Required</p>
                        <p className="text-sm font-medium text-be-text">
                          {getEffortLabel(currentData.topRecommendation.effort)}
                        </p>
                      </div>
                    </div>

                    <p className="text-sm text-be-text-muted-700 mt-3 mb-4">
                      <strong>Action:</strong> {currentData.topRecommendation.action}
                    </p>

                    <Button
                      variant="be-primary"
                      size="be-md"
                      className="rounded-full"
                    >
                      Start Optimization
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Quick Wins */}
          {currentData.quickWins.length > 0 && (
            <Card>
              <div className="p-4 border-b border-lodgra-neutral-200">
                <h2 className="text-lg font-semibold text-be-text flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-yellow-600" />
                  Quick Wins ({currentData.quickWins.length})
                </h2>
              </div>

              <div className="space-y-3 p-4">
                {currentData.quickWins.slice(0, 5).map((rec) => (
                  <div key={rec.id} className={`p-4 rounded-lg border ${getPriorityColor(rec.priority)}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-be-text">{rec.title}</h4>
                        <p className="text-sm text-be-text-muted-700 mt-1">{rec.action}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs">
                          <span className="font-medium text-green-600">+{rec.estimatedImpactPercent}%</span>
                          <span className="text-be-text-muted">{getEffortLabel(rec.effort)}</span>
                        </div>
                      </div>

                      <Button
                        size="be-sm"
                        variant="be-primary"
                        className="ml-3"
                      >
                        Apply
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* All Recommendations */}
          <Card>
            <div className="p-4 border-b border-lodgra-neutral-200">
              <h2 className="text-lg font-semibold text-be-text flex items-center gap-2">
                <Award className="w-5 h-5 text-be-blue" />
                All Recommendations ({currentData.recommendations.length})
              </h2>
            </div>

            <div className="space-y-2 p-4">
              {currentData.recommendations.map((rec) => (
                <div
                  key={rec.id}
                  className="flex items-center justify-between p-3 bg-lodgra-neutral-50 rounded-lg border border-lodgra-neutral-200"
                >
                  <div className="flex-1">
                    <p className="font-medium text-be-text">{rec.title}</p>
                    <p className="text-xs text-be-text-muted mt-1">{rec.description}</p>
                  </div>

                  <div className="flex items-center gap-3 ml-4">
                    <span className="text-sm font-semibold text-green-600">+{rec.estimatedImpactPercent}%</span>
                    <span className="text-xs px-2 py-1 bg-lodgra-neutral-200 rounded text-be-text-muted-700">
                      {rec.category}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Info Box */}
          <Card className="bg-blue-50 border-blue-200">
            <div className="p-4">
              <h3 className="font-medium text-blue-900">How this works</h3>
              <ul className="text-sm text-blue-800 mt-2 space-y-1">
                <li>• <strong>Ranking Score:</strong> Weighted analysis of 5 optimization factors</li>
                <li>• <strong>Quick Wins:</strong> Recommendations you can implement in &lt; 1 hour</li>
                <li>• <strong>Estimated Impact:</strong> % improvement in CTR, bookings, or revenue</li>
                <li>• <strong>Benchmark:</strong> Compared against market average for your location</li>
                <li>• Implement top recommendation to see immediate impact on performance</li>
              </ul>
            </div>
          </Card>
        </>
      ) : null}
    </div>
  )
}
