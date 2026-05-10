import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type RouteParams = { params: Promise<{ id: string; reviewId: string }> }

async function getAuthContext(userId: string, propertyId: string, orgId: string) {
  const supabase = await createClient()
  const { data: property } = await supabase
    .from('properties')
    .select('id, organization_id')
    .eq('id', propertyId)
    .eq('organization_id', orgId)
    .maybeSingle()
  return { supabase, property }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('organization_id, role')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile?.organization_id || !['admin', 'manager'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id: propertyId, reviewId } = await params
  const { supabase: sb, property } = await getAuthContext(user.id, propertyId, profile.organization_id)

  if (!property) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: review } = await sb
    .from('property_reviews')
    .select('id, organization_id')
    .eq('id', reviewId)
    .eq('property_id', propertyId)
    .eq('organization_id', profile.organization_id)
    .maybeSingle()

  if (!review) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await request.json()
  const { source, rating, reviewer_name, review_date, review_text, is_featured } = body

  if (source !== undefined && !source) {
    return NextResponse.json({ error: 'source é obrigatório' }, { status: 400 })
  }

  if (rating !== undefined) {
    const ratingNum = Number(rating)
    if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 10) {
      return NextResponse.json({ error: 'Nota deve estar entre 1 e 10' }, { status: 400 })
    }
  }

  if (review_text && review_text.length > 500) {
    return NextResponse.json({ error: 'Texto da review não pode exceder 500 caracteres' }, { status: 400 })
  }

  if (is_featured === true) {
    const { count } = await sb
      .from('property_reviews')
      .select('id', { count: 'exact', head: true })
      .eq('property_id', propertyId)
      .eq('is_featured', true)
      .neq('id', reviewId)

    if ((count ?? 0) >= 6) {
      return NextResponse.json(
        { error: 'Máximo de 6 reviews em destaque atingido.' },
        { status: 422 }
      )
    }
  }

  const updateData: Record<string, unknown> = {}
  if (source !== undefined) updateData.source = source
  if (rating !== undefined) updateData.rating = Number(rating)
  if (reviewer_name !== undefined) updateData.reviewer_name = reviewer_name
  if (review_date !== undefined) updateData.review_date = review_date
  if (review_text !== undefined) updateData.review_text = review_text || null
  if (is_featured !== undefined) updateData.is_featured = is_featured

  const { data, error } = await sb
    .from('property_reviews')
    .update(updateData)
    .eq('id', reviewId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data)
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('organization_id, role')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile?.organization_id || !['admin', 'manager'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id: propertyId, reviewId } = await params

  const { data: property } = await supabase
    .from('properties')
    .select('id')
    .eq('id', propertyId)
    .eq('organization_id', profile.organization_id)
    .maybeSingle()

  if (!property) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { error } = await supabase
    .from('property_reviews')
    .delete()
    .eq('id', reviewId)
    .eq('property_id', propertyId)
    .eq('organization_id', profile.organization_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return new NextResponse(null, { status: 204 })
}
