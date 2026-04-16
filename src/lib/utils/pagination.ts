export const PAGE_SIZE = 100

export function parsePage(sp: Record<string, string | string[] | undefined> | undefined): number {
  const raw = typeof sp?.page === 'string' ? sp.page : '1'
  const n = parseInt(raw, 10)
  return Number.isFinite(n) && n >= 1 ? n : 1
}

export function getRange(page: number, size = PAGE_SIZE) {
  return { from: (page - 1) * size, to: page * size - 1 }
}
