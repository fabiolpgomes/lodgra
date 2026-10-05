// Reservas a mostrar num dia do calendário.
// A noite do dia D está ocupada por quem tem check-in <= D < check-out.
// O dia de check-out não está ocupado: aparece só como "saída" e pode ter uma nova entrada.

export interface DayRange {
  startDate: Date | string
  endDate: Date | string
}

function dayKey(value: Date | string): number {
  const d = new Date(value)
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate()
}

export function reservationsForDay<T extends DayRange>(
  reservations: T[],
  date: Date
): { staying: T | undefined; departing: T | undefined } {
  const key = dayKey(date)
  const staying = reservations.find((r) => dayKey(r.startDate) <= key && key < dayKey(r.endDate))
  const departing = reservations.find((r) => dayKey(r.endDate) === key && dayKey(r.startDate) < key)
  return { staying, departing }
}
