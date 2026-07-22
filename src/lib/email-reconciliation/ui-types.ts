/**
 * AC6: UI types for confirmation flow
 * - needs_review: show up to 3 candidates side-by-side
 * - auto_matched: passive notification with edit option
 * - no_match: manual creation form (after 48h)
 */

import { MatchCandidate, MatchDecision } from './matching-engine'
import { EmailExtractionData } from './extraction.schema'

export interface PendingReview {
  id: string
  organization_id: string
  extraction_id: string
  extraction: EmailExtractionData & { id: string }
  decision: MatchDecision
  created_at: Date
  expires_at: Date // 48 hours from creation
  status: 'pending_review' | 'confirmed' | 'rejected' | 'manual_created'
}

export interface ConfirmationAction {
  type: 'auto_matched' | 'needs_review' | 'no_match'
  extraction_id: string
  selected_candidate?: string // For needs_review selection
  manual_data?: Partial<EmailExtractionData> // For manual creation
  timestamp: Date
}

export interface ReviewState {
  pending_count: number
  auto_matched_count: number
  no_match_count: number
  pending_items: PendingReview[]
}

/**
 * UI Component Props
 */
export interface PendingReviewListProps {
  items: PendingReview[]
  onConfirm: (action: ConfirmationAction) => Promise<void>
  onReject: (extraction_id: string) => Promise<void>
  loading?: boolean
}

export interface CandidateComparisonProps {
  extraction: EmailExtractionData
  candidates: MatchCandidate[]
  onSelect: (candidate: MatchCandidate) => void
  selected?: MatchCandidate
}

export interface AutoMatchNotificationProps {
  extraction: EmailExtractionData
  candidate: MatchCandidate
  onConfirm: () => Promise<void>
  onEdit: () => void
  onReject: () => Promise<void>
}

export interface ManualCreationFormProps {
  extraction: EmailExtractionData
  onSubmit: (data: Partial<EmailExtractionData>) => Promise<void>
  onCancel: () => void
  suggestedData?: Partial<EmailExtractionData>
}
