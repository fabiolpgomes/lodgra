export interface SplitBreakdown {
  totalAmount: number // EUR in cents
  lodgraFee: number // Lodgra commission (15%) in cents
  ownerAmount: number // Owner payout (85%) in cents
}

export function calculateSplit(totalAmountInCents: number, managementPercentage = 15): SplitBreakdown {
  const lodgraCommissionPercentage = Math.max(0, Math.min(100, managementPercentage)) / 100

  const lodgraFee = Math.round(totalAmountInCents * lodgraCommissionPercentage)
  const ownerAmount = totalAmountInCents - lodgraFee

  return {
    totalAmount: totalAmountInCents,
    lodgraFee,
    ownerAmount,
  }
}

export function validateSplit(breakdown: SplitBreakdown): boolean {
  const { totalAmount, lodgraFee, ownerAmount } = breakdown

  if (totalAmount <= 0) return false
  if (lodgraFee < 0) return false
  if (ownerAmount < 0) return false

  return lodgraFee + ownerAmount === totalAmount
}
