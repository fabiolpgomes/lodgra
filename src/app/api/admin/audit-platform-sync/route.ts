import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

/**
 * Endpoint de auditoria para validar dados de platform sync
 * Detecta inconsistências e dados faltantes
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const adminSecret = process.env.ADMIN_SECRET

    if (!adminSecret || authHeader !== `Bearer ${adminSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createAdminClient()

    console.log('[Audit] Iniciando auditoria de platform sync metadata...')

    // Stats gerais
    const { data: totalStats } = await supabase
      .from('reservations')
      .select('id', { count: 'exact' })
      .not('external_id', 'is', null)
      .eq('booking_source', 'ical_auto_sync')

    // Reservas com booking_reference faltando
    const { data: missingReference } = await supabase
      .from('reservations')
      .select('id, external_id, created_at')
      .not('external_id', 'is', null)
      .eq('booking_source', 'ical_auto_sync')
      .is('booking_reference', null)

    // Reservas com platform_sync_url faltando
    const { data: missingUrl } = await supabase
      .from('reservations')
      .select('id, external_id')
      .not('external_id', 'is', null)
      .eq('booking_source', 'ical_auto_sync')
      .is('platform_sync_url', null)

    // Reservas com email fake (ainda importadas como genéricas)
    const { data: fakeEmails } = await supabase
      .from('reservations')
      .select('id, guest_email, guest_name, created_at')
      .ilike('guest_email', '%@lodgra.local')
      .eq('booking_source', 'ical_auto_sync')

    // Stats por plataforma
    const { data: platformStats } = await supabase
      .from('reservations')
      .select('booking_source')
      .not('external_id', 'is', null)
      .eq('booking_source', 'ical_auto_sync')

    const platformCount = {
      booking: 0,
      airbnb: 0,
      vrbo: 0,
      flatio: 0,
      ical_import: 0,
    }

    for (const row of platformStats || []) {
      const source = row.booking_source as string
      if (source in platformCount) {
        platformCount[source as keyof typeof platformCount]++
      }
    }

    // Recomendações
    const recommendations: string[] = []

    if ((missingReference || []).length > 0) {
      recommendations.push(`⚠️ ${missingReference?.length} reservas faltam booking_reference`)
    }

    if ((missingUrl || []).length > 0) {
      recommendations.push(`⚠️ ${missingUrl?.length} reservas faltam platform_sync_url`)
    }

    if ((fakeEmails || []).length > 0) {
      recommendations.push(`⚠️ ${fakeEmails?.length} reservas ainda têm emails fake (imported-*)`)
    }

    if ((missingReference || []).length === 0 && (missingUrl || []).length === 0) {
      recommendations.push('✅ Todos os dados de platform sync estão completos!')
    }

    recommendations.push('📋 Rodar POST /api/admin/backfill-platform-metadata se houver dados faltantes')

    console.log('[Audit] ✅ Auditoria concluída')

    return NextResponse.json({
      success: true,
      audit_results: {
        total_ical_reservations: totalStats?.length || 0,
        by_platform: platformCount,

        inconsistencies: {
          missing_booking_reference: (missingReference || []).length,
          missing_platform_sync_url: (missingUrl || []).length,
          still_with_fake_emails: (fakeEmails || []).length,
        },

        fake_emails_sample: (fakeEmails || []).slice(0, 5).map(r => ({
          id: r.id,
          guest_email: r.guest_email,
          guest_name: r.guest_name,
          created_at: r.created_at,
        })),
      },

      recommendations,

      health_check: {
        booking_reference_complete: (missingReference || []).length === 0,
        platform_sync_url_complete: (missingUrl || []).length === 0,
        no_fake_emails: (fakeEmails || []).length === 0,
        all_platforms_mapped: platformCount.ical_import === 0,
      },
    })
  } catch (error: unknown) {
    console.error('[Audit] Erro:', error)
    const errMsg = error instanceof Error ? error.message : 'Audit failed'
    return NextResponse.json({ error: errMsg }, { status: 500 })
  }
}
