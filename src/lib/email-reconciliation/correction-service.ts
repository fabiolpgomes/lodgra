import { createAdminClient } from '@/lib/supabase/admin'

export interface CorrectionRecord {
  id: string
  organization_id: string
  extraction_id: string
  field: string
  original_value?: string | null
  corrected_value: string
  source_platform: string
  created_at: string
}

export interface CorrectionStats {
  field: string
  platform: string
  count: number
  rate: number // percentage of corrections to total extractions
}

/**
 * AC7: Log a correction when user edits an extraction field
 */
export async function logCorrection(
  organizationId: string,
  extractionId: string,
  field: string,
  originalValue: string | null,
  correctedValue: string,
  sourcePlatform: string
): Promise<CorrectionRecord | null> {
  const supabase = createAdminClient()

  // Verify extraction belongs to organization
  const { data: extraction, error: extractionError } = await supabase
    .from('email_extractions')
    .select('id, organization_id')
    .eq('id', extractionId)
    .eq('organization_id', organizationId)
    .single()

  if (extractionError || !extraction) {
    throw new Error(`Extraction ${extractionId} not found for organization ${organizationId}`)
  }

  // Insert correction record
  const { data, error } = await supabase
    .from('extraction_corrections')
    .insert({
      organization_id: organizationId,
      extraction_id: extractionId,
      field,
      original_value: originalValue,
      corrected_value: correctedValue,
      source_platform: sourcePlatform,
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to log correction: ${error.message}`)
  }

  return data
}

/**
 * AC7: Get correction statistics by field and platform
 * Used by dashboard to show correction rate
 */
export async function getCorrectionStats(organizationId: string): Promise<CorrectionStats[]> {
  const supabase = createAdminClient()

  // Count corrections by field and platform
  const { data: corrections, error: correctionsError } = await supabase
    .from('extraction_corrections')
    .select('field, source_platform')
    .eq('organization_id', organizationId)

  if (correctionsError) {
    throw new Error(`Failed to fetch corrections: ${correctionsError.message}`)
  }

  // Count total extractions by platform
  const { data: extractions, error: extractionsError } = await supabase
    .from('email_extractions')
    .select('source_platform')
    .eq('organization_id', organizationId)

  if (extractionsError) {
    throw new Error(`Failed to fetch extractions: ${extractionsError.message}`)
  }

  // Build stats: correction count by field/platform and rate
  const correctionsByFieldPlatform = new Map<string, number>()
  const extractionsByPlatform = new Map<string, number>()

  corrections?.forEach((c) => {
    const key = `${c.field}:${c.source_platform}`
    correctionsByFieldPlatform.set(key, (correctionsByFieldPlatform.get(key) || 0) + 1)
  })

  extractions?.forEach((e) => {
    extractionsByPlatform.set(
      e.source_platform || 'unknown',
      (extractionsByPlatform.get(e.source_platform || 'unknown') || 0) + 1
    )
  })

  // Calculate stats
  const stats: CorrectionStats[] = []
  correctionsByFieldPlatform.forEach((count, key) => {
    const [field, platform] = key.split(':')
    const totalExtractions = extractionsByPlatform.get(platform) || 0
    const rate = totalExtractions > 0 ? (count / totalExtractions) * 100 : 0

    stats.push({
      field,
      platform,
      count,
      rate,
    })
  })

  // Sort by count descending
  return stats.sort((a, b) => b.count - a.count)
}

/**
 * AC7: Get all corrections for an extraction (for audit trail)
 */
export async function getExtractionCorrections(
  organizationId: string,
  extractionId: string
): Promise<CorrectionRecord[]> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('extraction_corrections')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('extraction_id', extractionId)
    .order('created_at', { ascending: true })

  if (error) {
    throw new Error(`Failed to fetch corrections: ${error.message}`)
  }

  return data || []
}
