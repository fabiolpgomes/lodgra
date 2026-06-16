import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient();
    const { id: taskId } = await params;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify task belongs to cleaner
    const { data: task } = await supabase
      .from('cleaning_tasks')
      .select('*')
      .eq('id', taskId)
      .eq('cleaner_id', user.id)
      .single();

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Update task status to done
    const { error } = await supabase
      .from('cleaning_tasks')
      .update({ status: 'done', completed_at: new Date().toISOString() })
      .eq('id', taskId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error completing task:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to complete task' },
      { status: 500 }
    );
  }
}
