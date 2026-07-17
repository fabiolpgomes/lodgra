import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { getAuth } from '@clerk/nextjs/server'
import { rankingAnalyzer } from '@/lib/google/ranking-analysis'
import { recommendationEngine } from '@/lib/google/recommendation-engine'

export async function GET(request: NextRequest) {
  try {
    const { userId } = await getAuth(request)

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || '',
      {
        auth: { persistSession: false },
      }
    )

    // Get user's organization
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('id', userId)
      .single()

    if (!userProfile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const searchParams = request.nextUrl.searchParams
    const propertyId = searchParams.get('propertyId')

    if (!propertyId) {
      return NextResponse.json({ error: 'Property ID is required' }, { status: 400 })
    }

    // Fetch property data
    const { data: property } = await supabase
      .from('properties')
      .select('*')
      .eq('id', propertyId)
      .eq('organization_id', userProfile.organization_id)
      .single()

    if (!property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 })
    }

    // Analyze ranking
    const analysis = await rankingAnalyzer.analyzeRanking(propertyId, property)

    // Generate recommendations
    const recommendationResult = recommendationEngine.generateRecommendations(
      propertyId,
      analysis.factors,
      property
    )

    return NextResponse.json({
      overallScore: analysis.overallScore,
      factors: analysis.factors,
      competitivePosition: analysis.competitivePosition,
      improvementPotential: analysis.improvementPotential,
      recommendations: recommendationResult.recommendations,
      topRecommendation: recommendationResult.topRecommendation,
      quickWins: recommendationResult.quickWins,
      totalPotentialImpact: recommendationResult.totalPotentialImpact,
    })
  } catch (error) {
    console.error('[API] Analysis error:', error)
    return NextResponse.json({ error: 'Analysis failed' }, { status: 500 })
  }
}
