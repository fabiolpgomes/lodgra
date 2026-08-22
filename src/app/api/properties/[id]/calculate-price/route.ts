import { NextRequest, NextResponse } from 'next/server'
import {
  calculatePropertyPrice,
  PropertyPriceCalculationError,
} from '@/lib/pricing/property-price-calculator'

export const dynamic = 'force-dynamic'

interface CalculatePriceBody {
  checkInDate?: string
  checkOutDate?: string
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: propertyId } = await params

  try {
    const body: CalculatePriceBody = await request.json()

    if (!body.checkInDate || !body.checkOutDate) {
      return NextResponse.json(
        { error: 'checkInDate and checkOutDate are required' },
        { status: 400 }
      )
    }

    const result = await calculatePropertyPrice(
      propertyId,
      body.checkInDate,
      body.checkOutDate
    )

    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof PropertyPriceCalculationError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      )
    }

    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[POST /api/properties/[id]/calculate-price]', message)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
