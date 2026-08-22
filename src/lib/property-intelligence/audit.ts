import type { AuditResult, PropertyIntelligenceResult } from './types'

export function auditPropertyIntelligenceResult(result: PropertyIntelligenceResult): AuditResult {
  const issues: string[] = []

  if (result.blockedInputs.length > 0) {
    issues.push(`Missing required inputs: ${result.blockedInputs.join(', ')}`)
  }

  if (!result.location) {
    issues.push('Location signal is missing.')
  }

  if (!result.models) {
    issues.push('Deterministic models were not generated.')
  }

  const coverageScore = Math.max(
    0,
    Math.min(
      1,
      result.intake.completenessScore - (result.intake.estimatedFields.length * 0.015)
    )
  )

  let status: AuditResult['status'] = 'pass'
  if (issues.length > 0 && result.blockedInputs.length === 0) {
    status = 'warn'
  }
  if (result.blockedInputs.length > 0) {
    status = 'fail'
  }

  return {
    status,
    issues,
    coverageScore: Math.round(coverageScore * 100) / 100,
    publishApprovalRequired: true,
    publishApprovalState: 'pending',
  }
}

