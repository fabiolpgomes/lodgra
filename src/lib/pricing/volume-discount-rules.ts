import type { PropertyDiscount } from '@/types/pricing.types'

export type VolumeDiscountType = 'weekly' | 'monthly'

type DiscountRow = Pick<PropertyDiscount, 'discount_type' | 'percentage'> & {
  min_nights?: number | null
}

export const DEFAULT_VOLUME_DISCOUNT_RULES: Record<
  VolumeDiscountType,
  { percentage: number; min_nights: number }
> = {
  weekly: { percentage: 10, min_nights: 7 },
  monthly: { percentage: 20, min_nights: 28 },
}

export const DEFAULT_LOYALTY_DISCOUNT = {
  discount_type: 'excellent_guest' as const,
  percentage: 0,
}

export function getExpectedVolumeDiscountType(nights: number): VolumeDiscountType | null {
  if (nights >= DEFAULT_VOLUME_DISCOUNT_RULES.monthly.min_nights) {
    return 'monthly'
  }

  if (nights >= DEFAULT_VOLUME_DISCOUNT_RULES.weekly.min_nights) {
    return 'weekly'
  }

  return null
}

export function resolveVolumeDiscountRule(
  discounts: DiscountRow[],
  nights: number
): { discount: DiscountRow; isDefault: boolean } | null {
  const expectedType = getExpectedVolumeDiscountType(nights)
  if (!expectedType) {
    return null
  }

  const matchingDiscount = discounts
    .filter((discount) => discount.discount_type === expectedType)
    .filter((discount) => nights >= (discount.min_nights ?? DEFAULT_VOLUME_DISCOUNT_RULES[expectedType].min_nights))
    .sort((a, b) => (b.min_nights ?? 0) - (a.min_nights ?? 0))[0]

  if (matchingDiscount) {
    return { discount: matchingDiscount, isDefault: false }
  }

  const hasConfiguredType = discounts.some((discount) => discount.discount_type === expectedType)
  if (hasConfiguredType) {
    return null
  }

  return {
    discount: {
      discount_type: expectedType,
      percentage: DEFAULT_VOLUME_DISCOUNT_RULES[expectedType].percentage,
      min_nights: DEFAULT_VOLUME_DISCOUNT_RULES[expectedType].min_nights,
    },
    isDefault: true,
  }
}

export function hydratePropertyDiscounts(
  propertyId: string,
  discounts: Array<
    Partial<PropertyDiscount> & {
      discount_type: PropertyDiscount['discount_type']
      percentage: number
      min_nights?: number | null
    }
  >
): Array<
  Partial<PropertyDiscount> & {
    discount_type: PropertyDiscount['discount_type']
    percentage: number
    min_nights?: number | null
  }
> {
  const normalized = new Map<string, (typeof discounts)[number]>()

  for (const discount of discounts) {
    normalized.set(discount.discount_type, {
      id: discount.id ?? `${propertyId}-${discount.discount_type}`,
      property_id: discount.property_id ?? propertyId,
      discount_type: discount.discount_type,
      percentage: discount.percentage,
      min_nights: discount.min_nights,
      created_at: discount.created_at ?? new Date().toISOString(),
      updated_at: discount.updated_at ?? new Date().toISOString(),
    })
  }

  if (!normalized.has('weekly')) {
    normalized.set('weekly', {
      id: `${propertyId}-default-weekly`,
      property_id: propertyId,
      discount_type: 'weekly',
      percentage: DEFAULT_VOLUME_DISCOUNT_RULES.weekly.percentage,
      min_nights: DEFAULT_VOLUME_DISCOUNT_RULES.weekly.min_nights,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
  }

  if (!normalized.has('monthly')) {
    normalized.set('monthly', {
      id: `${propertyId}-default-monthly`,
      property_id: propertyId,
      discount_type: 'monthly',
      percentage: DEFAULT_VOLUME_DISCOUNT_RULES.monthly.percentage,
      min_nights: DEFAULT_VOLUME_DISCOUNT_RULES.monthly.min_nights,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
  }

  if (!normalized.has('excellent_guest')) {
    normalized.set('excellent_guest', {
      id: `${propertyId}-default-excellent_guest`,
      property_id: propertyId,
      discount_type: 'excellent_guest',
      percentage: DEFAULT_LOYALTY_DISCOUNT.percentage,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
  }

  return Array.from(normalized.values())
}
