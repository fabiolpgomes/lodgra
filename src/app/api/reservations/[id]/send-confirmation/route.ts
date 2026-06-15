/**
 * Manual reservation confirmation send endpoint (Story 30.7 - AC4)
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

    // Get reservation with related data
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
          full_name,
          email
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

    // Calculate total price
    const checkInDate = new Date(reservation.check_in_date);
    const checkOutDate = new Date(reservation.check_out_date);
    const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));
    const totalPrice = (reservation.nightly_price || 0) * nights;

    // Send message
    const result = await sendTemplate({
      organizationId: auth.organizationId!,
      to: reservation.guests.phone,
      templateName: 'lodgra_reservation_confirmation',
      variables: {
        property_name: reservation.properties.name || '',
        property_address: `${reservation.properties.address}, ${reservation.properties.city} ${reservation.properties.postal_code}`,
        guest_name: reservation.guests.full_name || 'Guest',
        checkin_date: checkInDate.toLocaleDateString('pt-BR'),
        checkout_date: checkOutDate.toLocaleDateString('pt-BR'),
        total_price: `R$ ${totalPrice.toFixed(2)}`,
      },
      lang: 'pt_BR',
    });

    // Update reservation with confirmation sent timestamp
    await supabase
      .from('reservations')
      .update({ confirmation_sent_at: new Date().toISOString() })
      .eq('id', id);

    return NextResponse.json({
      success: true,
      message: 'Reservation confirmation sent',
      logId: result.id,
    });
  } catch (error) {
    console.error('POST /api/reservations/[id]/send-confirmation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
