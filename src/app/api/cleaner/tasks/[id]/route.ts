import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient();
    const { id: taskId } = await params;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch task with related data
    const { data: task, error } = await supabase
      .from('cleaning_tasks')
      .select(
        `
        *,
        properties:property_id(name),
        reservations:booking_id(
          id,
          guest_id,
          guests(full_name, phone)
        )
      `
      )
      .eq('id', taskId)
      .eq('cleaner_id', user.id)
      .single();

    if (error || !task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Format response
    return NextResponse.json({
      id: task.id,
      property: {
        name: task.properties?.name || 'Unknown Property',
      },
      scheduled_date: task.scheduled_date,
      status: task.status,
      notes: task.notes,
      photo_count: task.photo_count || 0,
      photos: task.photos || [],
      checklist: task.checklist_items
        ? {
            items: task.checklist_items,
          }
        : null,
    });
  } catch (error) {
    console.error('Error fetching task:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch task' },
      { status: 500 }
    );
  }
}
