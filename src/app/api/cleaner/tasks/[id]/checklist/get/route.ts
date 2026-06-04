import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/cleaner/tasks/[id]/checklist
 * Fetch current checklist progress
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: taskId } = await params;

    const supabase = createAdminClient();

    // Fetch all responses for this task
    const { data: responses, error } = await supabase
      .from('cleaning_checklist_responses')
      .select('*')
      .eq('task_id', taskId)
      .order('updated_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({
      taskId,
      responses: responses || [],
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('[Checklist GET] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch checklist progress' },
      { status: 500 }
    );
  }
}
