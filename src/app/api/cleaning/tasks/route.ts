/**
 * GET cleaning tasks for manager view (Story 29.7)
 * Returns all tasks with cleaner info, reservation details, and photos
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/requireRole';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireRole(['admin', 'gestor']);
    if (!auth.authorized) return auth.response!;

    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    const status = searchParams.get('status');
    const propertyId = searchParams.get('propertyId');
    const cleanerId = searchParams.get('cleanerId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    let query = supabase
      .from('cleaning_tasks')
      .select(
        `
        id,
        organization_id,
        property_id,
        reservation_id,
        cleaner_id,
        status,
        scheduled_date,
        scheduled_time,
        notes,
        completed_at,
        created_at,
        updated_at,
        properties (
          id,
          name,
          address,
          city,
          postal_code
        ),
        reservations (
          id,
          guest_id,
          check_in_date,
          check_out_date,
          guests (
            full_name,
            phone,
            email
          )
        ),
        user_profiles:cleaner_id (
          id,
          full_name,
          phone,
          email
        ),
        cleaning_photos (
          id,
          storage_path,
          uploaded_at
        ),
        cleaning_checklist_responses (
          id,
          is_done
        )
      `,
        { count: 'exact' }
      )
      .eq('organization_id', auth.organizationId);

    if (status) query = query.eq('status', status);
    if (propertyId) query = query.eq('property_id', propertyId);
    if (cleanerId) query = query.eq('cleaner_id', cleanerId);
    if (startDate) query = query.gte('scheduled_date', startDate);
    if (endDate) query = query.lte('scheduled_date', endDate);

    query = query.order('scheduled_date', { ascending: true });

    const { data: tasks, error, count } = await query;

    if (error) {
      console.error('Error fetching cleaning tasks:', error);
      return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
    }

    const enrichedTasks = (tasks || []).map(
      (task: Record<string, unknown>) => ({
        ...task,
        property: Array.isArray(task.properties)
          ? task.properties[0]
          : task.properties,
        reservation: Array.isArray(task.reservations)
          ? task.reservations[0]
          : task.reservations,
        cleaner: Array.isArray(task.user_profiles)
          ? task.user_profiles[0]
          : task.user_profiles,
        photo_count: (task.cleaning_photos as Array<unknown>)?.length || 0,
        checklist_completion:
          task.cleaning_checklist_responses &&
          Array.isArray(task.cleaning_checklist_responses)
            ? Math.round(
                ((task.cleaning_checklist_responses as Array<Record<string, unknown>>).filter(
                  (r) => r.is_done
                ).length /
                  task.cleaning_checklist_responses.length) *
                  100
              )
            : 0,
      })
    );

    return NextResponse.json({
      tasks: enrichedTasks,
      total: count,
      filters: { status, propertyId, cleanerId, startDate, endDate },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('GET /api/cleaning/tasks error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireRole(['admin', 'gestor']);
    if (!auth.authorized) return auth.response!;

    const body = await request.json();
    const { taskId, status, notes } = body;

    if (!taskId || !status) {
      return NextResponse.json({ error: 'taskId and status required' }, { status: 400 });
    }

    const supabase = await createClient();
    const updateData: Record<string, string> = { status };
    if (notes !== undefined) updateData.notes = notes;
    if (status === 'done') updateData.completed_at = new Date().toISOString();

    const { data: task, error } = await supabase
      .from('cleaning_tasks')
      .update(updateData)
      .eq('id', taskId)
      .eq('organization_id', auth.organizationId)
      .select()
      .single();

    if (error) {
      console.error('Error updating cleaning task:', error);
      return NextResponse.json({ error: 'Failed to update task' }, { status: 500 });
    }

    return NextResponse.json({ success: true, task, message: `Task marked as ${status}` });
  } catch (error) {
    console.error('PATCH /api/cleaning/tasks error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
