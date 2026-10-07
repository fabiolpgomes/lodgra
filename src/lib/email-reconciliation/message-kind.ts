/** Only explicit confirmation subjects can create reservations automatically. */
export function reservationMessageKind(subject: string): 'confirmation' | 'change' | 'other' {
  const text = subject.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  if (/cancel|modific|alterad|alteracao|changed|change to|updated|refund|reembols|declin|recus/.test(text)) return 'change'
  if (/nova reserva|new reservation|new booking|booking confirm|reservation confirm|reserva confirm|confirmed reservation|confirmed booking|reservierung bestatigt|nouvelle reservation|reservation confirmee|rezervace potvrzena/.test(text)) return 'confirmation'
  return 'other'
}
