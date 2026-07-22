import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Diagnose: Check for real conflicts between cancelled and confirmed reservations
 */

interface ReservationData {
  id: string
  check_in: string
  check_out: string
  property_listing_id: string
  status: string
}

interface ConflictItem {
  cancelled: {
    id: string
    from: string
    to: string
  }
  overlappingConfirmed: Array<{
    id: string
    from: string
    to: string
  }>
}

export async function POST(req: NextRequest) {
  try {
    const { secret } = await req.json();
    if (secret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createAdminClient();

    // Get cancelled reservations
    const { data: cancelled } = await supabase
      .from('reservations')
      .select('id, check_in, check_out, property_listing_id, status')
      .eq('status', 'cancelled')
      .gte('check_in', '2026-07-01')
      .lte('check_in', '2026-08-31');

    // Get confirmed reservations in same period
    const { data: confirmed } = await supabase
      .from('reservations')
      .select('id, check_in, check_out, property_listing_id, status')
      .eq('status', 'confirmed')
      .gte('check_in', '2026-07-01')
      .lte('check_out', '2026-08-31');

    // Check for overlaps
    const conflicts: ConflictItem[] = [];

    for (const c of (cancelled as ReservationData[] | null) || []) {
      const overlaps = ((confirmed as ReservationData[] | null) || []).filter(f =>
        f.property_listing_id === c.property_listing_id &&
        c.check_in < f.check_out &&
        c.check_out > f.check_in
      );

      if (overlaps.length > 0) {
        conflicts.push({
          cancelled: {
            id: c.id,
            from: c.check_in,
            to: c.check_out,
          },
          overlappingConfirmed: overlaps.map(o => ({
            id: o.id,
            from: o.check_in,
            to: o.check_out,
          })),
        });
      }
    }

    return NextResponse.json({
      cancelled_total: cancelled?.length || 0,
      confirmed_total: confirmed?.length || 0,
      conflicts_found: conflicts.length,
      conflicts: conflicts.length > 0 ? conflicts : [],
      analysis: conflicts.length === 0
        ? '✅ No real conflicts - safe to restore all'
        : '⚠️ Real conflicts found - manual review needed',
    });
  } catch (err) {
    console.error('Error:', err);
    return NextResponse.json(
      { error: 'Internal server error', details: String(err) },
      { status: 500 }
    );
  }
}
