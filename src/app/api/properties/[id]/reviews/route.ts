import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(_request: NextRequest, > }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('organization_id, role')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile?.organization_id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id: propertyId } = await params

  const { data: property } = await supabase
    .from('properties')
    .select('id, organization_id')
    .eq('id', propertyId)
    .eq('organization_id', profile.organization_id)
    .maybeSingle()

  if (!property) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data, error } = await supabase
    .from('property_reviews')
    .select('*')
    .eq('property_id', propertyId)
    .order('review_date', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data)
}

export async function POST(request: NextRequest, > }) {
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

  const { id: propertyId } = await params

  const { data: property } = await supabase
    .from('properties')
    .select('id, organization_id')
    .eq('id', propertyId)
    .eq('organization_id', profile.organization_id)
    .maybeSingle()

  if (!property) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await request.json()
  const { source, rating, reviewer_name, review_date, review_text } = body

  if (!source || !rating || !reviewer_name || !review_date) {
    return NextResponse.json(
      { error: 'source, rating, reviewer_name e review_date são obrigatórios' },
      { status: 400 }
    )
  }

  const ratingNum = Number(rating)
  if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 10) {
    return NextResponse.json({ error: 'Nota deve estar entre 1 e 10' }, { status: 400 })
  }

  if (review_text && review_text.length > 500) {
    return NextResponse.json({ error: 'Texto da review não pode exceder 500 caracteres' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('property_reviews')
    .insert({
      organization_id: profile.organization_id,
      property_id: propertyId,
      source,
      rating: ratingNum,
      reviewer_name,
      review_date,
      review_text: review_text || null,
      is_featured: false,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data, { status: 201 })
}
