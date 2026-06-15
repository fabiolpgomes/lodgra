/**
 * Manager notification for new booking endpoint (Story 30.8 - AC3)
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/requireRole';
import { createClient } from '@/lib/supabase/server';
import { sendTemplate } from '@/lib/whatsapp/client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { reservationId } = body;

    if (!reservationId) {
      return NextResponse.json(
        { error: 'reservationId is required' },
        { status: 400 }
      );
    }

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
      .eq('id', reservationId)
      .eq('organization_id', auth.organizationId)
      .single();

    if (resError || !reservation) {
      return NextResponse.json({ error: 'Reservation not found' }, { status: 404 });
    }

    // Get manager contact (from organization)
    const { data: org } = await supabase
      .from('organizations')
      .select('manager_phone, contact_phone')
      .eq('id', auth.organizationId)
      .single();

    const managerPhone = org?.manager_phone || org?.contact_phone;
    if (!managerPhone) {
      return NextResponse.json(
        { error: 'Manager phone not configured in organization' },
        { status: 400 }
      );
    }

    // Calculate total price
    const checkInDate = new Date(reservation.check_in_date);
    const checkOutDate = new Date(reservation.check_out_date);
    const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));
    const totalPrice = (reservation.nightly_price || 0) * nights;

    // Send notification to manager
    const result = await sendTemplate({
      organizationId: auth.organizationId!,
      to: managerPhone,
      templateName: 'lodgra_new_booking_alert',
      variables: {
        property_name: reservation.properties.name || '',
        property_address: `${reservation.properties.address}, ${reservation.properties.city} ${reservation.properties.postal_code}`,
        guest_name: reservation.guests.full_name || 'Guest',
        guest_phone: reservation.guests.phone || '',
        checkin_date: checkInDate.toLocaleDateString('pt-BR'),
        checkout_date: checkOutDate.toLocaleDateString('pt-BR'),
        total_price: `R$ ${totalPrice.toFixed(2)}`,
      },
      lang: 'pt_BR',
    });

    // Update reservation with manager notification timestamp
    await supabase
      .from('reservations')
      .update({ manager_notified_at: new Date().toISOString() })
      .eq('id', reservationId);

    return NextResponse.json({
      success: true,
      message: 'Manager notification sent',
      logId: result.id,
    });
  } catch (error) {
    console.error('POST /api/reservations/notify-manager error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
