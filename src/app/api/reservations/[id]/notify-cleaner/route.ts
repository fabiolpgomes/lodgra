/**
 * Notify cleaner on checkout endpoint (Story 30.5 - AC4)
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/requireRole';
import { createClient } from '@/lib/supabase/server';
import { sendTemplate } from '@/lib/whatsapp/client';

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
          postal_code,
          default_cleaner_id
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

    // Get cleaner assigned to property
    const cleanerId = reservation.properties.default_cleaner_id;
    if (!cleanerId) {
      return NextResponse.json(
        { error: 'No cleaner assigned to property', notifyManager: true },
        { status: 400 }
      );
    }

    // Get cleaner phone
    const { data: cleaner } = await supabase
      .from('users')
      .select('phone, full_name')
      .eq('id', cleanerId)
      .eq('organization_id', auth.organizationId)
      .single();

    if (!cleaner?.phone) {
      return NextResponse.json(
        { error: 'Cleaner phone not found' },
        { status: 400 }
      );
    }

    // Check if Epic 29 (Cleaner Portal) is enabled
    const { data: org } = await supabase
      .from('organizations')
      .select('cleaner_portal_enabled')
      .eq('id', auth.organizationId)
      .single();

    const taskLink = org?.cleaner_portal_enabled
      ? `https://www.lodgra.io/cleaners/tasks/${id}` // Placeholder, replace with actual URL
      : '';

    const checkoutDate = new Date(reservation.check_out_date);
    const checkoutTime = checkoutDate.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });

    // Send WhatsApp notification
    const result = await sendTemplate({
      organizationId: auth.organizationId!,
      to: cleaner.phone,
      templateName: 'lodgra_cleaner_checkout_notification',
      variables: {
        property_name: reservation.properties.name || '',
        property_address: `${reservation.properties.address}, ${reservation.properties.city} ${reservation.properties.postal_code}`,
        cleaner_name: cleaner.full_name || 'Cleaner',
        checkout_time: checkoutTime,
        task_link: taskLink,
      },
      lang: 'pt_BR',
    });

    // If Epic 29 enabled, create cleaning task
    if (org?.cleaner_portal_enabled) {
      await supabase.from('cleaning_tasks').insert({
        reservation_id: id,
        property_id: reservation.property_id,
        cleaner_id: cleanerId,
        organization_id: auth.organizationId,
        status: 'pending',
        scheduled_date: new Date(reservation.check_out_date).toISOString(),
        notes: `Automatic cleaning task for checkout of ${reservation.guests.full_name}`,
      });
    }

    // Update reservation
    await supabase
      .from('reservations')
      .update({ cleaner_notified_at: new Date().toISOString() })
      .eq('id', id);

    return NextResponse.json({
      success: true,
      message: 'Cleaner notified',
      logId: result.id,
      taskCreated: org?.cleaner_portal_enabled || false,
    });
  } catch (error) {
    console.error('POST /api/reservations/[id]/notify-cleaner error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
