import { revalidatePath } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Force cache revalidation for calendar and reservation pages
 * Clears ISR cache after data updates
 */

export async function POST(req: NextRequest) {
  try {
    const { secret } = await req.json();
    if (secret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🔄 Revalidating cache...');

    // Revalidate all calendar-related paths
    revalidatePath('/(locale)/calendar', 'page');
    revalidatePath('/(locale)/reservations', 'page');
    revalidatePath('/(locale)/dashboard', 'page');

    console.log('✓ Cache revalidated');

    return NextResponse.json({
      success: true,
      message: 'Cache revalidated for calendar and reservations',
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Revalidation error:', err);
    return NextResponse.json(
      { error: 'Revalidation failed', details: String(err) },
      { status: 500 }
    );
  }
}
