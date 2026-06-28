import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { parseISO, differenceInDays } from 'date-fns'
import { calculatePrice, ruleForDate } from '@/lib/pricing/getPriceForRange'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { property_id, check_in, check_out } = body

    if (!property_id || !check_in || !check_out) {
      return NextResponse.json(
        { error: 'property_id, check_in e check_out são obrigatórios' },
        { status: 400 }
      )
    }

    const checkInDate = parseISO(check_in as string)
    const checkOutDate = parseISO(check_out as string)

    if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) {
      return NextResponse.json(
        { error: 'Datas inválidas' },
        { status: 400 }
      )
    }

    const nights = differenceInDays(checkOutDate, checkInDate)
    if (nights < 1) {
      return NextResponse.json(
        { error: 'Check-out deve ser depois do check-in' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Buscar propriedade e regras de preço
    const { data: property, error: propError } = await supabase
      .from('properties')
      .select('id, base_price, min_nights, cleaning_fee, cleaning_fee_type, pet_fee, pet_fee_type')
      .eq('id', property_id)
      .single()

    if (propError || !property) {
      console.warn(`[calculate-price] Propriedade não encontrada: ${property_id}`, propError)
      // Retornar preço 0 com mensagem de aviso (não bloquear)
      return NextResponse.json({
        success: true,
        price_per_night: 0,
        total_amount: 0,
        nights: differenceInDays(checkOutDate, checkInDate),
        cleaning_fee: 0,
        pet_fee: 0,
        base_total: 0,
        min_nights: 1,
        has_pricing_rules: false,
        warning: 'Propriedade não encontrada - preencha o valor manualmente'
      })
    }

    // Buscar regras de preço aplicáveis ao período
    const { data: rulesRaw } = await supabase
      .from('pricing_rules')
      .select('id, name, start_date, end_date, price_per_night, min_nights, created_at')
      .eq('property_id', property_id)
      .lte('start_date', check_out)
      .gte('end_date', check_in)
      .order('created_at', { ascending: false })

    const rules = (rulesRaw ?? []).map((r: any) => ({
      id: r.id,
      name: r.name,
      start_date: r.start_date,
      end_date: r.end_date,
      price_per_night: parseFloat(String(r.price_per_night)),
      min_nights: r.min_nights,
      created_at: r.created_at,
    }))

    const basePrice = property.base_price ? parseFloat(String(property.base_price)) : 0
    const propertyMinNights = property.min_nights ? parseInt(String(property.min_nights)) : 1

    // Calcular preço usando a função existente
    const pricing = {
      total: 0,
      breakdown: [],
      minNights: propertyMinNights,
    }

    // Cálculo simples: preço base * noites (ou preço da época se aplicável)
    let totalPrice = 0
    const eachDay = []
    for (let i = 0; i < nights; i++) {
      const currentDate = new Date(checkInDate)
      currentDate.setDate(currentDate.getDate() + i)
      eachDay.push(currentDate)
    }

    for (const date of eachDay) {
      const rule = ruleForDate(rules, date)
      const price = rule ? rule.price_per_night : basePrice
      totalPrice += price
    }

    // Adicionar taxas (cleaning, pet)
    const cleaningFee = property.cleaning_fee ?? 0
    const petFee = property.pet_fee ?? 0
    const cleaningFeeTotal = cleaningFee > 0
      ? (property.cleaning_fee_type === 'per_night' ? cleaningFee * nights : cleaningFee)
      : 0
    const petFeeTotal = petFee > 0
      ? (property.pet_fee_type === 'per_night' ? petFee * nights : petFee)
      : 0

    const finalTotal = totalPrice + cleaningFeeTotal + petFeeTotal

    return NextResponse.json({
      success: true,
      price_per_night: basePrice,
      total_amount: finalTotal,
      nights,
      cleaning_fee: cleaningFeeTotal,
      pet_fee: petFeeTotal,
      base_total: totalPrice,
      min_nights: propertyMinNights,
      has_pricing_rules: rules.length > 0,
    })
  } catch (error: unknown) {
    console.error('[calculate-price] Erro:', error)
    const msg = error instanceof Error ? error.message : 'Erro ao calcular preço'
    return NextResponse.json(
      { error: msg },
      { status: 500 }
    )
  }
}
