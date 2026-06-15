/**
 * Manual check-in code send endpoint (Story 30.3 - AC7)
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/requireRole';
import { createClient } from '@/lib/supabase/server';
import { sendTemplate } from '@/lib/whatsapp/client';
import { getDefaultTemplate } from '@/lib/whatsapp/default-templates';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await requireRole(['admin', 'gestor']);
    if (!auth.authorized) return auth.response!;

    const supabase = await createClient();

    // Get reservation
    const { data: reservation, error: resError } = await supabase
      .from('reservations')
      .select(`
        *,
        properties (
          id,
          name,
          address,
          city,
          postal_code
        ),
        guests (
          phone,
          full_name
        )
      `)
      .eq('id', id)
      .eq('organization_id', auth.organizationId)
      .single();

    if (resError || !reservation) {
      return NextResponse.json({ error: 'Reservation not found' }, { status: 404 });
    }

    if (!reservation.guests?.phone) {
      return NextResponse.json(
        { error: 'Guest phone number not found' },
        { status: 400 }
      );
    }

    if (!reservation.checkin_code) {
      return NextResponse.json(
        { error: 'Check-in code not configured' },
        { status: 400 }
      );
    }

    // Get template
    const templateBody = getDefaultTemplate('checkin_code', 'pt-BR');
    if (!templateBody) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 500 }
      );
    }

    // Send message
    const result = await sendTemplate({
      organizationId: auth.organizationId!,
      to: reservation.guests.phone,
      templateName: 'lodgra_checkin_code',
      variables: {
        property_name: reservation.properties.name || '',
        property_address: `${reservation.properties.address}, ${reservation.properties.city} ${reservation.properties.postal_code}`,
        guest_name: reservation.guests.full_name || 'Guest',
        checkin_date: new Date(reservation.check_in_date).toLocaleDateString(),
        checkin_code: reservation.checkin_code,
        checkin_instructions: reservation.checkin_instructions || 'Please follow the instructions provided',
        manager_phone: '',
      },
      lang: 'pt_BR',
    });

    // Update reservation
    await supabase
      .from('reservations')
      .update({ checkin_code_sent_at: new Date().toISOString() })
      .eq('id', id);

    return NextResponse.json({
      success: true,
      message: 'Check-in code sent',
      logId: result.id,
    });
  } catch (error) {
    console.error('POST /api/reservations/[id]/send-checkin-code error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
