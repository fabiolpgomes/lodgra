import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';

/**
 * FIX: Restore reservations incorrectly marked as cancelled in July & August 2026
 * Issue: Calendar synchronization incorrectly updated reservation status to 'cancelled'
 * Note: Temporarily disables conflict check trigger to allow restoration of cancelled bookings
 *
 * Usage: POST /api/admin/fix-cancelled-reservations
 * Body: { secret: process.env.CRON_SECRET }
 */

export async function POST(req: NextRequest) {
  try {
    // Validate admin token
    const { secret } = await req.json();
    if (secret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createAdminClient();

    // Fetch cancelled reservations in July and August
    const { data: cancelledReservations, error: fetchError } = await supabase
      .from('reservations')
      .select(
        `
        id,
        check_in,
        check_out,
        guest_id,
        status,
        cancelled_at,
        cancellation_reason,
        external_reservation_id
      `
      )
      .eq('status', 'cancelled')
      .gte('check_in', '2026-07-01')
      .lte('check_in', '2026-08-31');

    if (fetchError) {
      console.error('Error fetching cancelled reservations:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch cancelled reservations', details: fetchError },
        { status: 500 }
      );
    }

    console.log(`Found ${cancelledReservations.length} cancelled reservations in July-August 2026`);

    if (cancelledReservations.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No cancelled reservations found to fix',
        fixed: 0,
      });
    }

    // Use RPC function to fix with trigger disabled
    console.log(`Attempting to restore ${cancelledReservations.length} cancelled reservations using safe function...`);

    const { data: rpcResult, error: rpcError } = await supabase.rpc('fix_cancelled_reservations_safe');

    if (rpcError) {
      console.error('Error calling fix function:', rpcError);
      return NextResponse.json(
        { error: 'Failed to update reservations', details: rpcError },
        { status: 500 }
      );
    }

    const fixedCount = rpcResult?.[0]?.fixed_count || 0;
    const conflictCount = rpcResult?.[0]?.conflict_count || 0;

    console.log(`Restoration complete: ${fixedCount} restored, ${conflictCount} conflicts`);

    // Log the fix for audit trail
    const { error: logError } = await supabase.from('sync_logs').insert({
      sync_type: 'manual_fix',
      direction: 'internal',
      status: conflictCount === 0 ? 'success' : 'partial',
      records_updated: fixedCount,
      records_failed: conflictCount,
      error_message: conflictCount > 0 ? `${conflictCount} reservations have overlapping bookings` : null,
    });
    if (logError) {
      console.warn('Could not log to sync_logs:', logError);
    }

    return NextResponse.json({
      success: true,
      message: `Restored ${fixedCount} reservations`,
      fixed: fixedCount,
      total_scanned: cancelledReservations.length,
      reservations: cancelledReservations.map(r => ({
        id: r.id,
        checkIn: r.check_in,
        checkOut: r.check_out,
        status: 'confirmed',
      })),
    });
  } catch (err) {
    console.error('Unexpected error:', err);
    return NextResponse.json(
      { error: 'Internal server error', details: String(err) },
      { status: 500 }
    );
  }
}
