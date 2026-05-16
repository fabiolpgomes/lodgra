export interface SplitBreakdown {
  totalAmount: number // EUR in cents
  lodgraFee: number // Lodgra commission (15%) in cents
  ownerAmount: number // Owner payout (85%) in cents
}

export function calculateSplit(totalAmountInCents: number): SplitBreakdown {
  const lodgraCommissionPercentage = 0.15

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
