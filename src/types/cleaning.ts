export interface CleaningTask {
  id: string
  organization_id: string
  property_id: string
  reservation_id: string | null
  cleaner_id: string | null
  checklist_template_id: string | null
  status: 'pending' | 'in_progress' | 'done' | 'issue'
  scheduled_date: string
  scheduled_time: string
  notes: string | null
  completed_at: string | null
  started_at: string | null
  created_at: string
  updated_at: string
  // Progress tracking
  checklist_completion?: number
  photo_count?: number
  photos?: string[]
  // Joined fields for display
  property_name?: string
  guest_name?: string
  booking_id?: string
}
