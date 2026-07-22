/**
 * Story 36.11b: Dry-Run Preview Endpoint
 * POST /api/properties/[id]/pricing-rules/preview
 * Calculates simulated prices without persisting
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface PriceChange {
  date: string;
  currentPrice: number;
  simulatedPrice: number;
  change: number;
  percentChange: number;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const propertyId = (await params).id;
    const body = await request.json();

    // Fetch property base price
    const { data: property, error: propertyError } = await supabase
      .from('properties')
      .select('id, base_price')
      .eq('id', propertyId)
      .single();

    if (propertyError || !property) {
      return NextResponse.json(
        { error: 'Property not found' },
        { status: 404 }
      );
    }

    // Fetch enabled pricing rules
    const { data: rules, error: rulesError } = await supabase
      .from('pricing_rules')
      .select('*')
      .eq('property_id', propertyId)
      .eq('enabled', true)
      .order('priority', { ascending: true });

    if (rulesError) {
      return NextResponse.json(
        { error: 'Failed to fetch rules' },
        { status: 500 }
      );
    }

    // Simulate prices for next 30 days
    const priceChanges: PriceChange[] = [];
    const basePrice = property.base_price;
    let totalRevenueDifference = 0;

    for (let i = 0; i < 30; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];

      // In a real implementation, would evaluate rules with context
      // For now, return base price (simulation logic would go here)
      const simulatedPrice = basePrice;
      const change = simulatedPrice - basePrice;
      const percentChange = (change / basePrice) * 100;

      priceChanges.push({
        date: dateStr,
        currentPrice: basePrice,
        simulatedPrice,
        change,
        percentChange,
      });

      totalRevenueDifference += change;
    }

    return NextResponse.json({
      priceChanges,
      totalRevenueDifference,
      summary: {
        daysAffected: priceChanges.filter((p) => p.change !== 0).length,
        averageChange: priceChanges.length > 0
          ? priceChanges.reduce((sum, p) => sum + p.change, 0) / priceChanges.length
          : 0,
      },
    });
  } catch (error) {
    console.error('Pricing preview error:', error);
    return NextResponse.json(
      { error: 'Failed to generate preview' },
      { status: 500 }
    );
  }
}
