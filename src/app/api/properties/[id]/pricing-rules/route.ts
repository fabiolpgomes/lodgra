/**
 * Story 36.11b: Pricing Rules API
 * GET /api/properties/[id]/pricing-rules
 * POST /api/properties/[id]/pricing-rules
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const propertyId = (await params).id;

    // Fetch all rules for this property
    const { data: rules, error } = await supabase
      .from('pricing_rules')
      .select('*')
      .eq('property_id', propertyId)
      .order('priority', { ascending: true });

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch pricing rules' },
        { status: 500 }
      );
    }

    return NextResponse.json({ rules });
  } catch (error) {
    console.error('Pricing rules GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pricing rules' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const propertyId = (await params).id;
    const body = await request.json();

    const { name, priority, enabled, condition, action } = body;

    if (!name || priority === undefined || !condition || !action) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const { data: newRule, error } = await supabase
      .from('pricing_rules')
      .insert({
        property_id: propertyId,
        name,
        priority,
        enabled,
        condition,
        action,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: 'Failed to create rule' },
        { status: 500 }
      );
    }

    return NextResponse.json(newRule, { status: 201 });
  } catch (error) {
    console.error('Pricing rules POST error:', error);
    return NextResponse.json(
      { error: 'Failed to create rule' },
      { status: 500 }
    );
  }
}
