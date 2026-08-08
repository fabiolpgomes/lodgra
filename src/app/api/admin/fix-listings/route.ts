import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createAdminClient()

    // Buscar todas as listings sem nome
    const { data: listings } = await supabase
      .from('property_listings')
      .select('id, name, platform, property_id')
      .or('name.is.null,platform.is.null')

    if (!listings?.length) {
      return NextResponse.json({
        message: 'Nenhuma listing para corrigir',
        updated: 0
      })
    }

    console.log(`[fix-listings] Corrigindo ${listings.length} listings...`)

    let updated = 0

    for (const listing of listings) {
      try {
        // Buscar nome da propriedade
        const { data: property } = await supabase
          .from('properties')
          .select('name')
          .eq('id', listing.property_id)
          .single()

        const propertyName = property?.name || `Listing ${listing.id}`

        // Atualizar
        const { error } = await supabase
          .from('property_listings')
          .update({
            name: listing.name || propertyName,
            platform: listing.platform || 'Airbnb'
          })
          .eq('id', listing.id)

        if (!error) {
          updated++
          console.log(`[fix-listings] ✅ ${listing.id}: ${propertyName}`)
        } else {
          console.error(`[fix-listings] ❌ ${listing.id}:`, error)
        }
      } catch (err) {
        console.error(`[fix-listings] Erro ao processar ${listing.id}:`, err)
      }
    }

    return NextResponse.json({
      message: 'Listings corrigidas com sucesso',
      updated,
      total: listings.length
    })
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido'
    console.error('[fix-listings] Erro:', err)
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}
