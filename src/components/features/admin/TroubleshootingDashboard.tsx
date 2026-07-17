'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/common/ui/card'
import { Button } from '@/components/common/ui/button'
import { AlertCircle, CheckCircle, AlertTriangle, Lightbulb, Zap } from 'lucide-react'

interface ValidationIssue {
  fieldName: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  message: string
  suggestion?: string
}

interface AutoFixSuggestion {
  fieldName: string
  issue: string
  suggestedFix: string
  priority: 'critical' | 'high' | 'medium' | 'low'
  estimatedImpact: string
  autoFixable: boolean
}

interface ValidationResult {
  propertyId: string
  indexationStatus: 'indexed' | 'pending' | 'rejected' | 'error'
  issues: ValidationIssue[]
  lastValidated: string
  nextCheckTime: string
}

interface PropertyDiagnostics {
  validation: ValidationResult
  suggestions: AutoFixSuggestion[]
  appliedFixes: Array<{ fieldName: string; message: string }>
  totalIssues: number
  criticalIssues: number
  highIssues: number
}

export function TroubleshootingDashboard({ properties }: { properties: any[] }) {
  const [diagnostics, setDiagnostics] = useState<Map<string, PropertyDiagnostics>>(new Map())
  const [loading, setLoading] = useState(true)
  const [validating, setValidating] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    validateAllProperties()
  }, [properties])

  async function validateAllProperties() {
    try {
      setLoading(true)
      setError(null)

      const results = new Map<string, PropertyDiagnostics>()

      for (const property of properties) {
        const diagnostics = await validateProperty(property.id, false)
        results.set(property.id, diagnostics)
      }

      setDiagnostics(results)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to validate properties'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  async function validateProperty(propertyId: string, autoFix: boolean = false) {
    const requestSet = new Set(validating)
    requestSet.add(propertyId)
    setValidating(requestSet)

    try {
      const response = await fetch('/api/google/validate-property', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propertyId, autoFix }),
      })

      if (!response.ok) {
        throw new Error('Validation failed')
      }

      const result = await response.json()
      const newDiagnostics = new Map(diagnostics)
      newDiagnostics.set(propertyId, result)
      setDiagnostics(newDiagnostics)

      return result
    } finally {
      requestSet.delete(propertyId)
      setValidating(requestSet)
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'text-red-600 bg-red-50'
      case 'high':
        return 'text-orange-600 bg-orange-50'
      case 'medium':
        return 'text-yellow-600 bg-yellow-50'
      case 'low':
        return 'text-blue-600 bg-blue-50'
      default:
        return 'text-gray-600 bg-gray-50'
    }
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <AlertCircle className="w-5 h-5" />
      case 'high':
        return <AlertTriangle className="w-5 h-5" />
      case 'medium':
        return <AlertTriangle className="w-5 h-5" />
      case 'low':
        return <Lightbulb className="w-5 h-5" />
      default:
        return null
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Google Troubleshooting & Diagnostics</h1>
        <div className="text-center py-8">
          <div className="text-lodgra-neutral-500">Validating properties...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-lodgra-neutral-900">
            Google Troubleshooting & Diagnostics
          </h1>
          <p className="text-sm text-lodgra-neutral-500 mt-1">
            Identify why properties aren&apos;t indexed and get auto-fix suggestions
          </p>
        </div>
        <Button
          onClick={() => validateAllProperties()}
          disabled={loading}
          variant="be-primary"
          size="be-md"
        >
          Re-validate All
        </Button>
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

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <div className="p-4">
            <p className="text-sm text-lodgra-neutral-600">Properties Checked</p>
            <p className="text-2xl font-bold text-lodgra-neutral-900 mt-1">{properties.length}</p>
          </div>
        </Card>

        <Card>
          <div className="p-4">
            <p className="text-sm text-lodgra-neutral-600">Indexed</p>
            <p className="text-2xl font-bold text-green-600 mt-1">
              {Array.from(diagnostics.values()).filter((d) => d.validation.indexationStatus === 'indexed').length}
            </p>
          </div>
        </Card>

        <Card>
          <div className="p-4">
            <p className="text-sm text-lodgra-neutral-600">Critical Issues</p>
            <p className="text-2xl font-bold text-red-600 mt-1">
              {Array.from(diagnostics.values()).reduce((sum, d) => sum + d.criticalIssues, 0)}
            </p>
          </div>
        </Card>

        <Card>
          <div className="p-4">
            <p className="text-sm text-lodgra-neutral-600">Needs Attention</p>
            <p className="text-2xl font-bold text-orange-600 mt-1">
              {Array.from(diagnostics.values()).filter((d) => d.validation.indexationStatus !== 'indexed').length}
            </p>
          </div>
        </Card>
      </div>

      {/* Properties List */}
      <Card>
        <div className="p-4 border-b border-lodgra-neutral-200">
          <h2 className="text-lg font-semibold text-lodgra-neutral-900">Properties Diagnostics</h2>
        </div>

        <div className="space-y-4 p-4">
          {properties.map((property) => {
            const diagnostic = diagnostics.get(property.id)
            if (!diagnostic) return null

            const isValidating = validating.has(property.id)
            const { validation, suggestions, criticalIssues, highIssues } = diagnostic

            return (
              <div
                key={property.id}
                className="border border-lodgra-neutral-200 rounded-lg p-4 space-y-3"
              >
                {/* Property Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <h3 className="font-medium text-lodgra-neutral-900">{property.name}</h3>
                      <p className="text-sm text-lodgra-neutral-500">ID: {property.id}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {validation.indexationStatus === 'indexed' ? (
                      <div className="flex items-center gap-2 px-3 py-1 bg-green-50 rounded-full">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span className="text-sm font-medium text-green-600">Indexed</span>
                      </div>
                    ) : validation.indexationStatus === 'pending' ? (
                      <div className="flex items-center gap-2 px-3 py-1 bg-yellow-50 rounded-full">
                        <AlertTriangle className="w-4 h-4 text-yellow-600" />
                        <span className="text-sm font-medium text-yellow-600">Pending</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 px-3 py-1 bg-red-50 rounded-full">
                        <AlertCircle className="w-4 h-4 text-red-600" />
                        <span className="text-sm font-medium text-red-600">Rejected</span>
                      </div>
                    )}

                    <Button
                      onClick={() => validateProperty(property.id, false)}
                      disabled={isValidating}
                      size="be-sm"
                      variant="be-secondary"
                    >
                      {isValidating ? 'Validating...' : 'Recheck'}
                    </Button>
                  </div>
                </div>

                {/* Issues Display */}
                {validation.issues.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-lodgra-neutral-700">
                      Issues: {criticalIssues} Critical, {highIssues} High
                    </div>

                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {validation.issues.slice(0, 5).map((issue, idx) => (
                        <div key={idx} className={`p-2 rounded text-sm ${getSeverityColor(issue.severity)}`}>
                          <div className="flex items-start gap-2">
                            {getSeverityIcon(issue.severity)}
                            <div>
                              <p className="font-medium">{issue.fieldName}</p>
                              <p className="text-xs mt-1">{issue.message}</p>
                              {issue.suggestion && (
                                <p className="text-xs mt-1 opacity-75">💡 {issue.suggestion}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}

                      {validation.issues.length > 5 && (
                        <p className="text-xs text-lodgra-neutral-600 mt-2">
                          +{validation.issues.length - 5} more issues...
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Auto-Fix Suggestions */}
                {suggestions.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-lodgra-neutral-200">
                    <div className="text-sm font-medium text-lodgra-neutral-700 flex items-center gap-2 mb-2">
                      <Zap className="w-4 h-4" />
                      Auto-Fix Suggestions
                    </div>

                    <div className="space-y-2">
                      {suggestions.slice(0, 3).map((suggestion, idx) => (
                        <div key={idx} className="text-xs p-2 bg-blue-50 rounded">
                          <p className="font-medium text-blue-900">{suggestion.suggestedFix}</p>
                          {suggestion.autoFixable && (
                            <Button
                              onClick={() => validateProperty(property.id, true)}
                              disabled={isValidating}
                              size="be-sm"
                              variant="be-primary"
                              className="mt-2"
                            >
                              {isValidating ? 'Fixing...' : 'Apply Auto-Fix'}
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Timestamps */}
                <div className="text-xs text-lodgra-neutral-500 pt-2">
                  Last validated: {new Date(validation.lastValidated).toLocaleString('pt-BR')}
                </div>
              </div>
            )
          })}
        </div>
      </Card>

      {/* Info Box */}
      <Card className="bg-blue-50 border-blue-200">
        <div className="p-4">
          <h3 className="font-medium text-blue-900">About this tool</h3>
          <ul className="text-sm text-blue-800 mt-2 space-y-1">
            <li>• <strong>Indexed:</strong> Property is approved and visible on Google</li>
            <li>• <strong>Pending:</strong> Waiting for Google review; fix suggestions above</li>
            <li>• <strong>Rejected:</strong> Critical issues blocking indexation; see red alerts</li>
            <li>• <strong>Auto-Fix:</strong> Automatically corrects common issues (trim, format, etc)</li>
            <li>• Validation runs daily at 2 AM UTC; manual checks available anytime</li>
          </ul>
        </div>
      </Card>
    </div>
  )
}
