/**
 * WhatsApp Analytics Dashboard Endpoint
 * Returns message statistics, delivery rates, engagement metrics
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
    const days = parseInt(searchParams.get('days') || '30');
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get summary statistics
    const { data: logs } = await supabase
      .from('whatsapp_logs')
      .select('status, message_type, recipient_type, created_at')
      .eq('organization_id', auth.organizationId)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', new Date().toISOString());

    // Calculate metrics
    const metrics = {
      total_sent: logs?.length || 0,
      successful: logs?.filter((l) => l.status === 'sent').length || 0,
      failed: logs?.filter((l) => l.status === 'failed').length || 0,
      bounced: logs?.filter((l) => l.status === 'bounced').length || 0,
      read: logs?.filter((l) => l.status === 'read').length || 0,
      delivery_rate: 0,
      read_rate: 0,
    };

    if (metrics.total_sent > 0) {
      metrics.delivery_rate = Math.round((metrics.successful / metrics.total_sent) * 100);
      metrics.read_rate = Math.round((metrics.read / metrics.successful) * 100);
    }

    // Group by message type
    const byMessageType = logs?.reduce(
      (acc, log) => {
        if (!acc[log.message_type]) {
          acc[log.message_type] = { total: 0, successful: 0, failed: 0 };
        }
        acc[log.message_type].total++;
        if (log.status === 'sent') acc[log.message_type].successful++;
        if (log.status === 'failed') acc[log.message_type].failed++;
        return acc;
      },
      {} as Record<string, { total: number; successful: number; failed: number }>
    );

    // Group by recipient type
    const byRecipientType = logs?.reduce(
      (acc, log) => {
        if (!acc[log.recipient_type]) {
          acc[log.recipient_type] = { total: 0, successful: 0, failed: 0 };
        }
        acc[log.recipient_type].total++;
        if (log.status === 'sent') acc[log.recipient_type].successful++;
        if (log.status === 'failed') acc[log.recipient_type].failed++;
        return acc;
      },
      {} as Record<string, { total: number; successful: number; failed: number }>
    );

    // Trend data (last 30 days)
    const trendData = Array.from({ length: days }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (days - i - 1));
      const dateStr = date.toISOString().split('T')[0];

      const dayLogs = logs?.filter((l) => l.created_at.startsWith(dateStr)) || [];
      return {
        date: dateStr,
        sent: dayLogs.length,
        successful: dayLogs.filter((l) => l.status === 'sent').length,
        failed: dayLogs.filter((l) => l.status === 'failed').length,
      };
    });

    return NextResponse.json({
      period_days: days,
      summary: metrics,
      by_message_type: byMessageType,
      by_recipient_type: byRecipientType,
      trend: trendData,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('GET /api/whatsapp/analytics error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireRole(['admin']);
    if (!auth.authorized) return auth.response!;

    const body = await request.json();
    const { message_type, recipient_type } = body;

    const supabase = await createClient();

    // Upsert daily analytics record
    const today = new Date().toISOString().split('T')[0];

    const { data: logs } = await supabase
      .from('whatsapp_logs')
      .select('status')
      .eq('organization_id', auth.organizationId)
      .eq('message_type', message_type)
      .eq('recipient_type', recipient_type)
      .gte('created_at', `${today}T00:00:00Z`)
      .lte('created_at', `${today}T23:59:59Z`);

    const analytics = {
      organization_id: auth.organizationId,
      date: today,
      message_type,
      recipient_type,
      total_sent: logs?.length || 0,
      successful: logs?.filter((l) => l.status === 'sent').length || 0,
      failed: logs?.filter((l) => l.status === 'failed').length || 0,
      bounced: logs?.filter((l) => l.status === 'bounced').length || 0,
    };

    await supabase
      .from('whatsapp_analytics')
      .upsert(analytics, { onConflict: 'organization_id,date,message_type,recipient_type' });

    return NextResponse.json({ success: true, analytics });
  } catch (error) {
    console.error('POST /api/whatsapp/analytics error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
