/**
 * Vercel Cron: Send check-in codes automatically (Story 30.3 - AC3)
 * Schedule: 0 10 * * * (10:00 UTC daily)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendTemplate } from '@/lib/whatsapp/client';
import { getDefaultTemplate } from '@/lib/whatsapp/default-templates';

export const maxDuration = 60; // Cron timeout

export async function GET(request: NextRequest) {
  // Verify cron secret
  if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = await createClient();

    // Get all organizations with check-in code enabled
    const { data: configs } = await supabase
      .from('whatsapp_config')
      .select('organization_id, checkin_code_hours_before')
      .eq('send_checkin_code', true);

    if (!configs || configs.length === 0) {
      return NextResponse.json({ success: true, sent: 0 });
    }

    let totalSent = 0;

    for (const config of configs) {
      const hoursBeforeCheckin = config.checkin_code_hours_before || 24;

      // Calculate time window
      const now = new Date();
      const windowStart = new Date(now.getTime() - 1 * 60 * 60 * 1000); // Last hour
      const windowEnd = new Date(now.getTime() + hoursBeforeCheckin * 60 * 60 * 1000);

      // Find reservations due for check-in code
      const { data: reservations } = await supabase
        .from('reservations')
        .select(`
          id,
          organization_id,
          check_in_date,
          checkin_code,
          checkin_instructions,
          checkin_code_sent_at,
          properties (
            name,
            address,
            city,
            postal_code
          ),
          guests (
            full_name,
            phone
          )
        `)
        .eq('organization_id', config.organization_id)
        .is('checkin_code_sent_at', null)
        .gte('check_in_date', windowStart.toISOString())
        .lt('check_in_date', windowEnd.toISOString())
        .in('status', ['confirmed', 'checked_in']);

      if (!reservations) continue;

      const templateBody = getDefaultTemplate('checkin_code', 'pt-BR');
      if (!templateBody) continue;

      for (const reservation of reservations) {
        const guest = Array.isArray(reservation.guests) ? reservation.guests[0] : reservation.guests;
        const property = Array.isArray(reservation.properties) ? reservation.properties[0] : reservation.properties;

        if (!guest?.phone || !reservation.checkin_code) {
          continue;
        }

        try {
          await sendTemplate({
            organizationId: config.organization_id,
            to: guest.phone,
            templateName: 'lodgra_checkin_code',
            variables: {
              property_name: property?.name || '',
              property_address: `${property?.address}, ${property?.city} ${property?.postal_code}`,
              guest_name: guest.full_name || 'Guest',
              checkin_date: new Date(reservation.check_in_date).toLocaleDateString(),
              checkin_code: reservation.checkin_code,
              checkin_instructions: reservation.checkin_instructions || '',
              manager_phone: '',
            },
            lang: 'pt_BR',
          });

          // Mark as sent
          await supabase
            .from('reservations')
            .update({ checkin_code_sent_at: now.toISOString() })
            .eq('id', reservation.id);

          totalSent++;
        } catch (error) {
          console.error(`Failed to send check-in code for reservation ${reservation.id}:`, error);
        }
      }
    }

    return NextResponse.json({
      success: true,
      sent: totalSent,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Cron checkin-codes error:', error);
    return NextResponse.json(
      { error: 'Internal server error', sent: 0 },
      { status: 500 }
    );
  }
}
