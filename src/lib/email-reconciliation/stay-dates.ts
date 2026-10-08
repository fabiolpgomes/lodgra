const DAY_MS = 86_400_000

const shiftYears = (date: string, years: number) => `${Number(date.slice(0, 4)) + years}${date.slice(4)}`
const isRealDate = (date: string) => {
  const parsed = new Date(`${date}T00:00:00.000Z`)
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date
}

/**
 * Platform e-mails often print stay dates without a year ("chega em 11 de out."), and the model then
 * guesses one. A confirmation is sent when the stay is booked, so the stay cannot start before the
 * e-mail arrived: dates are moved forward by whole years until they are on/after the receipt date.
 * Returns null dates when they cannot be made consistent, sending the extraction to review.
 */
export function resolveStayYear(
  checkIn: string | null,
  checkOut: string | null,
  receivedAt: string | Date | null
): { check_in: string | null; check_out: string | null; adjusted: boolean } {
  if (!checkIn || !receivedAt) return { check_in: checkIn, check_out: checkOut, adjusted: false }
  const received = new Date(receivedAt)
  if (Number.isNaN(received.getTime())) return { check_in: checkIn, check_out: checkOut, adjusted: false }
  // One day of slack for same-day bookings across time zones.
  const earliest = new Date(received.getTime() - DAY_MS).toISOString().slice(0, 10)

  let years = 0
  while (shiftYears(checkIn, years) < earliest && years < 3) years++
  if (years === 0) return { check_in: checkIn, check_out: checkOut, adjusted: false }

  const nextIn = shiftYears(checkIn, years)
  let nextOut = checkOut ? shiftYears(checkOut, years) : null
  // A stay that crosses New Year keeps check-out after check-in.
  if (nextOut && nextOut <= nextIn) nextOut = shiftYears(nextOut, 1)
  if (!isRealDate(nextIn) || (nextOut && !isRealDate(nextOut)) || shiftYears(checkIn, years) < earliest) {
    return { check_in: null, check_out: null, adjusted: true }
  }
  return { check_in: nextIn, check_out: nextOut, adjusted: true }
}
