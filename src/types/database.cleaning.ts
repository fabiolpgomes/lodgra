// Auto-generated types for cleaning portal schema (Story 29.1)
// Tables: cleaning_tasks, cleaning_checklist_templates, cleaning_checklist_items,
//         cleaning_checklist_responses, cleaning_photos, cleaner_access_tokens

export interface CleaningTask {
  id: string;
  organization_id: string;
  property_id: string;
  reservation_id: string | null;
  cleaner_id: string | null;
  checklist_template_id: string | null;
  status: 'pending' | 'in_progress' | 'done' | 'issue';
  scheduled_date: string;
  scheduled_time: string | null;
  notes: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CleaningChecklistTemplate {
  id: string;
  organization_id: string;
  property_id: string | null;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CleaningChecklistItem {
  id: string;
  template_id: string;
  label: string;
  category: string | null;
  is_required: boolean;
  order_index: number;
  created_at: string;
}

export interface CleaningChecklistResponse {
  id: string;
  task_id: string;
  item_id: string;
  is_checked: boolean;
  notes: string | null;
  checked_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CleaningPhoto {
  id: string;
  task_id: string;
  storage_path: string;
  uploader_id: string;
  caption: string | null;
  uploaded_at: string;
  created_at: string;
}

export interface CleanerAccessToken {
  id: string;
  cleaner_id: string;
  token: string;
  expires_at: string;
  used_at: string | null;
  created_at: string;
}

// Type exports for Story 29.1
export type CleaningTaskStatus = 'pending' | 'in_progress' | 'done' | 'issue';
export type CleanerGuestType = 'cleaner';

// Insert types (without id, created_at, updated_at)
export interface CleaningTaskInsert {
  organization_id: string;
  property_id: string;
  reservation_id?: string | null;
  cleaner_id?: string | null;
  checklist_template_id?: string | null;
  status?: CleaningTaskStatus;
  scheduled_date: string;
  scheduled_time?: string | null;
  notes?: string | null;
  completed_at?: string | null;
}

export interface CleaningChecklistTemplateInsert {
  organization_id: string;
  property_id?: string | null;
  name: string;
  description?: string | null;
  is_active?: boolean;
}

export interface CleaningChecklistItemInsert {
  template_id: string;
  label: string;
  category?: string | null;
  is_required?: boolean;
  order_index?: number;
}

export interface CleaningChecklistResponseInsert {
  task_id: string;
  item_id: string;
  is_checked?: boolean;
  notes?: string | null;
  checked_at?: string | null;
}

export interface CleaningPhotoInsert {
  task_id: string;
  storage_path: string;
  uploader_id: string;
  caption?: string | null;
}

export interface CleanerAccessTokenInsert {
  cleaner_id: string;
  token: string;
  expires_at: string;
}
