// Supabase queries for Cleaning Portal (Story 29.1)
// Helper functions for cleaning_tasks, templates, photos, and access tokens

import { createClient } from '@supabase/supabase-js';
import type {
  CleaningTask,
  CleaningTaskInsert,
  CleaningChecklistTemplate,
  CleaningChecklistTemplateInsert,
  CleaningPhoto,
  CleaningPhotoInsert,
  CleanerAccessToken,
  CleanerAccessTokenInsert,
} from '@/types/database.cleaning';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

// ============================================================================
// CLEANING TASKS
// ============================================================================

export async function createCleaningTask(task: CleaningTaskInsert) {
  const { data, error } = await supabase
    .from('cleaning_tasks')
    .insert(task)
    .select()
    .single();

  if (error) throw error;
  return data as CleaningTask;
}

export async function getCleaningTasksByOrganization(organizationId: string) {
  const { data, error } = await supabase
    .from('cleaning_tasks')
    .select('*')
    .eq('organization_id', organizationId)
    .order('scheduled_date', { ascending: true });

  if (error) throw error;
  return (data || []) as CleaningTask[];
}

export async function getCleaningTasksByStatus(
  organizationId: string,
  status: string
) {
  const { data, error } = await supabase
    .from('cleaning_tasks')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('status', status)
    .order('scheduled_date', { ascending: true });

  if (error) throw error;
  return (data || []) as CleaningTask[];
}

export async function updateCleaningTaskStatus(taskId: string, status: string) {
  const { data, error } = await supabase
    .from('cleaning_tasks')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', taskId)
    .select()
    .single();

  if (error) throw error;
  return data as CleaningTask;
}

export async function completeCleaningTask(taskId: string) {
  const { data, error } = await supabase
    .from('cleaning_tasks')
    .update({
      status: 'done',
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', taskId)
    .select()
    .single();

  if (error) throw error;
  return data as CleaningTask;
}

// ============================================================================
// CHECKLIST TEMPLATES
// ============================================================================

export async function createChecklistTemplate(
  template: CleaningChecklistTemplateInsert
) {
  const { data, error } = await supabase
    .from('cleaning_checklist_templates')
    .insert(template)
    .select()
    .single();

  if (error) throw error;
  return data as CleaningChecklistTemplate;
}

export async function getChecklistTemplates(organizationId: string) {
  const { data, error } = await supabase
    .from('cleaning_checklist_templates')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []) as CleaningChecklistTemplate[];
}

// ============================================================================
// CLEANING PHOTOS
// ============================================================================

export async function createCleaningPhoto(photo: CleaningPhotoInsert) {
  const { data, error } = await supabase
    .from('cleaning_photos')
    .insert(photo)
    .select()
    .single();

  if (error) throw error;
  return data as CleaningPhoto;
}

export async function getCleaningPhotosByTask(taskId: string) {
  const { data, error } = await supabase
    .from('cleaning_photos')
    .select('*')
    .eq('task_id', taskId)
    .order('uploaded_at', { ascending: true });

  if (error) throw error;
  return (data || []) as CleaningPhoto[];
}

export async function getSignedPhotoUrl(storagePath: string, expiresIn = 3600) {
  const { data, error } = await supabase.storage
    .from('cleaning-photos')
    .createSignedUrl(storagePath, expiresIn);

  if (error) throw error;
  return data.signedUrl;
}

export async function deleteCleaningPhoto(photoId: string) {
  const { error } = await supabase
    .from('cleaning_photos')
    .delete()
    .eq('id', photoId);

  if (error) throw error;
}

// ============================================================================
// CLEANER ACCESS TOKENS
// ============================================================================

export async function generateCleanerAccessToken(
  token: CleanerAccessTokenInsert
) {
  const { data, error } = await supabase
    .from('cleaner_access_tokens')
    .insert(token)
    .select()
    .single();

  if (error) throw error;
  return data as CleanerAccessToken;
}

export async function validateAccessToken(token: string) {
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('cleaner_access_tokens')
    .select('*, cleaner_id(*)')
    .eq('token', token)
    .gt('expires_at', now)
    .single();

  if (error) throw error;
  return data as CleanerAccessToken;
}

export async function markTokenAsUsed(tokenId: string) {
  const { data, error } = await supabase
    .from('cleaner_access_tokens')
    .update({ used_at: new Date().toISOString() })
    .eq('id', tokenId)
    .select()
    .single();

  if (error) throw error;
  return data as CleanerAccessToken;
}

export async function getCleanerTokens(cleanerId: string) {
  const { data, error } = await supabase
    .from('cleaner_access_tokens')
    .select('*')
    .eq('cleaner_id', cleanerId)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []) as CleanerAccessToken[];
}

// ============================================================================
// STORAGE OPERATIONS
// ============================================================================

export async function uploadCleaningPhoto(
  organizationId: string,
  taskId: string,
  file: File
) {
  const fileName = `${Date.now()}_${file.name}`;
  const storagePath = `organizations/${organizationId}/tasks/${taskId}/${fileName}`;

  const { data: _data, error } = await supabase.storage
    .from('cleaning-photos')
    .upload(storagePath, file);

  if (error) throw error;
  return storagePath;
}

export async function createCleaningPhotoBucket() {
  // Check if bucket exists
  const { data: buckets } = await supabase.storage.listBuckets();
  const exists = buckets?.some((b) => b.name === 'cleaning-photos');

  if (!exists) {
    const { error } = await supabase.storage.createBucket('cleaning-photos', {
      public: false,
    });
    if (error) throw error;
  }
}

// ============================================================================
// REALTIME SUBSCRIPTIONS
// ============================================================================

interface RealtimePayload {
  eventType?: string;
  new?: Record<string, unknown>;
  old?: Record<string, unknown>;
  [key: string]: unknown;
}

export function subscribeToCleaningTasks(
  organizationId: string,
  callback: (payload: RealtimePayload) => void
) {
  return supabase
    .channel(`cleaning_tasks:org_id=eq.${organizationId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'cleaning_tasks',
        filter: `organization_id=eq.${organizationId}`,
      },
      callback
    )
    .subscribe();
}

export function subscribeToCleaningPhotos(
  taskId: string,
  callback: (payload: RealtimePayload) => void
) {
  return supabase
    .channel(`cleaning_photos:task_id=eq.${taskId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'cleaning_photos',
        filter: `task_id=eq.${taskId}`,
      },
      callback
    )
    .subscribe();
}
