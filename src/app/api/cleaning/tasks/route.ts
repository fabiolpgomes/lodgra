/**
 * GET cleaning tasks for manager view (Story 29.7)
 * Returns all tasks with cleaner info, reservation details, and photos
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/requireRole';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const { createAdminClient } = await import('@/lib/supabase/admin');
    const admin = createAdminClient();
    const { searchParams } = new URL(request.url);

    const status = searchParams.get('status');
    const propertyId = searchParams.get('propertyId');
    const cleanerId = searchParams.get('cleanerId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    let query = admin
      .from('cleaning_tasks')
      .select('*, properties(id, name), users(id, full_name)', { count: 'exact' })
      .eq('organization_id', '00000000-0000-0000-0000-000000000001');

    if (status) query = query.eq('status', status);
    if (propertyId) query = query.eq('property_id', propertyId);
    if (cleanerId) query = query.eq('cleaner_id', cleanerId);
    if (startDate) query = query.gte('scheduled_date', startDate);
    if (endDate) query = query.lte('scheduled_date', endDate);

    query = query.order('scheduled_date', { ascending: true });

    const { data: tasks, error, count } = await query;

    if (error) {
      console.error('Error fetching cleaning tasks:', error);
      return NextResponse.json({ tasks: [], total: 0 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const enrichedTasks = (tasks || []).map((task: any) => ({
      ...task,
      property_name: task.properties?.name || 'Imóvel Desconhecido',
      cleaner_name: task.users?.full_name || 'Não atribuído',
    }));

    return NextResponse.json({
      tasks: enrichedTasks,
      total: count,
      filters: { status, propertyId, cleanerId, startDate, endDate },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('GET /api/cleaning/tasks error:', error);
    return NextResponse.json({ tasks: [], total: 0 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireRole(['admin', 'manager', 'gestor']);
    if (!auth.authorized) return auth.response!;

    const body = await request.json();
    const { property_id, scheduled_date, scheduled_time, cleaner_id, reservation_id, notes } = body;

    if (!property_id || !scheduled_date) {
      return NextResponse.json({ error: 'property_id and scheduled_date are required' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: task, error: taskError } = await supabase
      .from('cleaning_tasks')
      .insert({
        organization_id: auth.organizationId,
        property_id,
        scheduled_date,
        scheduled_time: scheduled_time || null,
        cleaner_id: cleaner_id || null,
        reservation_id: reservation_id || null,
        notes: notes || null,
        status: 'pending',
      })
      .select()
      .single();

    if (taskError) {
      console.error('Error creating cleaning task:', taskError);
      return NextResponse.json({ error: taskError.message }, { status: 500 });
    }

    // Generate access token if cleaner_id exists
    let accessLink = null;
    if (cleaner_id) {
      try {
        const { generateAccessToken, hashToken } = await import('@/lib/cleaner-tokens');
        const plainToken = await generateAccessToken();
        const tokenHash = hashToken(plainToken);
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

        await supabase.from('cleaner_access_tokens').insert({
          cleaner_id,
          organization_id: auth.organizationId,
          token_hash: tokenHash,
          expires_at: expiresAt.toISOString(),
          ip_address: '0.0.0.0',
          user_agent: 'system',
        });

        accessLink = `/cleaner/auth?token=${plainToken}`;
      } catch (tokenError) {
        console.error('Error generating access token:', tokenError);
      }
    }

    return NextResponse.json({ ...task, accessLink }, { status: 201 });
  } catch (error) {
    console.error('POST /api/cleaning/tasks error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireRole(['admin', 'manager', 'gestor']);
    if (!auth.authorized) return auth.response!;

    const body = await request.json();
    const { id, item_id, status, notes, is_checked, scheduled_date, cleaner_id } = body;

    // Update checklist item
    if (item_id !== undefined && is_checked !== undefined) {
      const supabase = await createClient();
      const { error } = await supabase
        .from('cleaning_checklist_responses')
        .update({ is_checked, checked_at: is_checked ? new Date().toISOString() : null })
        .eq('id', item_id);

      if (error) {
        console.error('Error updating checklist item:', error);
        return NextResponse.json({ error: 'Failed to update item' }, { status: 500 });
      }

      return NextResponse.json({ success: true });
    }

    // Update task properties
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const supabase = await createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: Record<string, any> = {};

    if (status !== undefined) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;
    if (scheduled_date !== undefined) updateData.scheduled_date = scheduled_date;
    if (cleaner_id !== undefined) updateData.cleaner_id = cleaner_id;
    if (status === 'completed') updateData.completed_at = new Date().toISOString();

    const { data: task, error } = await supabase
      .from('cleaning_tasks')
      .update(updateData)
      .eq('id', id)
      .eq('organization_id', auth.organizationId)
      .select()
      .single();

    if (error) {
      console.error('Error updating cleaning task:', error);
      return NextResponse.json({ error: 'Failed to update task' }, { status: 500 });
    }

    return NextResponse.json({ success: true, task });
  } catch (error) {
    console.error('PATCH /api/cleaning/tasks error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
