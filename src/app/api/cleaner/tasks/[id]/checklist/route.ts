import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface ChecklistResponse {
  item_id: string;
  checked: boolean;
  notes?: string;
}

/**
 * PUT /api/cleaner/tasks/[id]/checklist
 * Auto-save checklist responses from cleaner
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { responses } = body as { responses: ChecklistResponse[] };

    if (!Array.isArray(responses)) {
      return NextResponse.json(
        { error: 'Invalid request format' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    const taskId = id;

    // Upsert responses (update if exists, insert if not)
    const itemsToUpsert = responses.map((response) => ({
      task_id: taskId,
      item_id: response.item_id,
      checked: response.checked,
      notes: response.notes || null,
      updated_at: new Date().toISOString()
    }));

    // Delete old responses and insert new ones
    // (simpler than upsert for this case)
    await supabase
      .from('cleaning_checklist_responses')
      .delete()
      .eq('task_id', taskId);

    const { error: insertError } = await supabase
      .from('cleaning_checklist_responses')
      .insert(itemsToUpsert);

    if (insertError) throw insertError;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Checklist Auto-save] Error:', error);
    return NextResponse.json(
      { error: 'Failed to save checklist' },
      { status: 500 }
    );
  }
}
