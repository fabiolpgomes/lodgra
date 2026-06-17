import { SupabaseClient } from '@supabase/supabase-js';

interface TaskChangeData {
  taskId: string;
  organizationId: string;
  userId: string;
  action: 'created' | 'updated' | 'deleted';
  fieldName?: string;
  oldValue?: unknown;
  newValue?: unknown;
  reason?: string;
  fullSnapshot: Record<string, unknown>;
}

export async function recordTaskChange(
  supabase: SupabaseClient,
  data: TaskChangeData
): Promise<void> {
  try {
    const { error } = await supabase.from('task_history').insert({
      task_id: data.taskId,
      organization_id: data.organizationId,
      changed_by: data.userId,
      action: data.action,
      field_name: data.fieldName,
      old_value: data.oldValue ? JSON.stringify(data.oldValue) : null,
      new_value: data.newValue ? JSON.stringify(data.newValue) : null,
      reason: data.reason,
      full_snapshot: data.fullSnapshot,
    });

    if (error) {
      console.error('Failed to record task change:', error);
      // Don't throw - history recording shouldn't break the main operation
    }
  } catch (err) {
    console.error('Error recording task change:', err);
  }
}

export async function getTaskHistory(
  supabase: SupabaseClient,
  taskId: string,
  organizationId: string
): Promise<unknown[]> {
  const { data, error } = await supabase
    .from('task_history')
    .select('*')
    .eq('task_id', taskId)
    .eq('organization_id', organizationId)
    .order('changed_at', { ascending: false });

  if (error) {
    console.error('Error fetching task history:', error);
    return [];
  }

  return data || [];
}
