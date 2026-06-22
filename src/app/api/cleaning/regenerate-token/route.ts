/**
 * Regenerate access token for a cleaning task
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/requireRole';
import { createClient } from '@/lib/supabase/server';
import { generateAccessToken, hashToken } from '@/lib/cleaner-tokens';

export async function POST(request: NextRequest) {
  try {
    const auth = await requireRole(['admin', 'manager', 'gestor']);
    if (!auth.authorized) return auth.response!;

    const body = await request.json();
    const { taskId } = body;

    if (!taskId) {
      return NextResponse.json({ error: 'taskId required' }, { status: 400 });
    }

    const supabase = await createClient();

    const { data: task, error: taskError } = await supabase
      .from('cleaning_tasks')
      .select('cleaner_id')
      .eq('id', taskId)
      .eq('organization_id', auth.organizationId)
      .single();

    if (taskError || !task?.cleaner_id) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Delete old tokens
    await supabase
      .from('cleaner_access_tokens')
      .delete()
      .eq('cleaner_id', task.cleaner_id);

    // Generate new token
    const plainToken = await generateAccessToken();
    const tokenHash = hashToken(plainToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await supabase.from('cleaner_access_tokens').insert({
      cleaner_id: task.cleaner_id,
      token_hash: tokenHash,
      expires_at: expiresAt.toISOString(),
      ip_address: '0.0.0.0',
      user_agent: 'system',
    });

    const newAccessLink = `/cleaner/auth?token=${plainToken}`;

    return NextResponse.json({
      success: true,
      accessLink: newAccessLink,
    });
  } catch (error) {
    console.error('Regenerate token error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
