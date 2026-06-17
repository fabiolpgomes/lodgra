import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: taskId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (!profile) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { data: history, error } = await supabase
      .from('task_history')
      .select('*')
      .eq('task_id', taskId)
      .eq('organization_id', profile.organization_id)
      .order('changed_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ history });
  } catch (error) {
    console.error('GET task history error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: taskId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (!profile) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    // Get current task state
    const { data: currentTask } = await supabase
      .from('cleaning_tasks')
      .select('*')
      .eq('id', taskId)
      .eq('organization_id', profile.organization_id)
      .single();

    if (!currentTask) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Get the history entry to revert to
    const { historyId, reason } = await request.json();

    const { data: historyEntry } = await supabase
      .from('task_history')
      .select('*')
      .eq('id', historyId)
      .eq('organization_id', profile.organization_id)
      .single();

    if (!historyEntry) {
      return NextResponse.json({ error: 'History entry not found' }, { status: 404 });
    }

    // Revert to previous state
    const revertedValues = historyEntry.full_snapshot;

    const { error: updateError } = await supabase
      .from('cleaning_tasks')
      .update({
        ...revertedValues,
        updated_at: new Date().toISOString(),
      })
      .eq('id', taskId)
      .eq('organization_id', profile.organization_id);

    if (updateError) throw updateError;

    // Log the reversion
    await supabase.from('task_history').insert({
      task_id: taskId,
      organization_id: profile.organization_id,
      changed_by: user.id,
      action: 'reverted',
      reason: `Reverted. Reason: ${reason}`,
      full_snapshot: currentTask,
    });

    return NextResponse.json({ success: true, message: 'Task reverted successfully' });
  } catch (error) {
    console.error('POST revert task error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
