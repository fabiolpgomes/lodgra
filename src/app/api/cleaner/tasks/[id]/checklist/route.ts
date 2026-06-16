import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

interface ChecklistItem {
  id: string;
  completed: boolean;
  notes?: string;
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient();
    const { id: taskId } = await params;
    const { items, notes } = await request.json() as { items: ChecklistItem[]; notes?: string };

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

    // Calculate completion percentage
    const completedCount = items.filter((item) => item.completed).length;
    const completionPercentage = Math.round((completedCount / items.length) * 100);

    // Update task with checklist data
    const { error } = await supabase
      .from('cleaning_tasks')
      .update({
        checklist_completion: completionPercentage,
        checklist_items: items,
        notes: notes || task.notes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', taskId);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      completionPercentage,
    });
  } catch (error) {
    console.error('Error updating checklist:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update checklist' },
      { status: 500 }
    );
  }
}
