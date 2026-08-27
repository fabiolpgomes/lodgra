import type { SupabaseClient } from '@supabase/supabase-js'

export interface TrafficEventRow {
  event_name: string
  path: string
  hostname: string
  referrer: string | null
  created_at: string
}

export interface TrafficSummary {
  totalEvents: number
  pageViews7d: number
  pageViews30d: number
  uniquePaths: number
  uniqueHostnames: number
  lastSeenAt: string | null
  topPaths: Array<{ path: string; views: number }>
  topHostnames: Array<{ hostname: string; views: number }>
  dailyViews: Array<{ date: string; views: number }>
}

function startOfDayIso(date: Date) {
  const copy = new Date(date)
  copy.setHours(0, 0, 0, 0)
  return copy.toISOString()
}

function daysAgoIso(days: number) {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return date.toISOString()
}

function buildDailyViews(events: TrafficEventRow[], days: number) {
  const base = new Map<string, number>()
  for (let index = days - 1; index >= 0; index -= 1) {
    const day = new Date()
    day.setDate(day.getDate() - index)
    base.set(startOfDayIso(day).slice(0, 10), 0)
  }

  for (const event of events) {
    const day = event.created_at.slice(0, 10)
    if (base.has(day)) {
      base.set(day, (base.get(day) || 0) + 1)
    }
  }

  return Array.from(base.entries()).map(([date, views]) => ({ date, views }))
}

function buildCounts<T extends string>(events: TrafficEventRow[], extractor: (event: TrafficEventRow) => T) {
  const counts = new Map<T, number>()
  for (const event of events) {
    const key = extractor(event)
    counts.set(key, (counts.get(key) || 0) + 1)
  }
  return Array.from(counts.entries())
    .map(([key, views]) => ({ key, views }))
    .sort((a, b) => b.views - a.views)
}

export async function getTrafficSummary(
  supabase: SupabaseClient,
  organizationId: string,
  days = 30,
): Promise<TrafficSummary> {
  const since = daysAgoIso(days)
  const { data, error } = await supabase
    .from('organization_traffic_events')
    .select('event_name, path, hostname, referrer, created_at')
    .eq('organization_id', organizationId)
    .gte('created_at', since)
    .order('created_at', { ascending: false })

  if (error) {
    throw error
  }

  const events = (data ?? []) as TrafficEventRow[]
  const totalEvents = events.length
  const pageViews7d = events.filter((event) => event.created_at >= daysAgoIso(7)).length
  const pageViews30d = totalEvents
  const uniquePaths = new Set(events.map((event) => event.path)).size
  const uniqueHostnames = new Set(events.map((event) => event.hostname)).size
  const lastSeenAt = events[0]?.created_at ?? null

  return {
    totalEvents,
    pageViews7d,
    pageViews30d,
    uniquePaths,
    uniqueHostnames,
    lastSeenAt,
    topPaths: buildCounts(events, (event) => event.path)
      .slice(0, 5)
      .map(({ key, views }) => ({ path: key, views })),
    topHostnames: buildCounts(events, (event) => event.hostname)
      .slice(0, 5)
      .map(({ key, views }) => ({ hostname: key, views })),
    dailyViews: buildDailyViews(events, days),
  }
}

