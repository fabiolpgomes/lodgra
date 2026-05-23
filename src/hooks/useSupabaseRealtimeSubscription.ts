import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { RealtimeChannel } from '@supabase/realtime-js'

interface SubscriptionPayload {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE'
  new?: Record<string, unknown>
  old?: Record<string, unknown>
}

interface SubscriptionOptions {
  table: string
  filter?: string
  onInsert?: (payload: Record<string, unknown>) => void
  onUpdate?: (payload: Record<string, unknown>) => void
  onDelete?: (payload: Record<string, unknown>) => void
  onError?: (error: Error) => void
  pollIntervalMs?: number
}

export function useSupabaseRealtimeSubscription({
  table,
  filter,
  onInsert,
  onUpdate,
  onDelete,
  onError,
  pollIntervalMs = 30000
}: SubscriptionOptions) {
  const [isConnected, setIsConnected] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    let channel: RealtimeChannel | null = null
    let isMounted = true

    const setupChannel = async () => {
      try {
        channel = supabase
          .channel(`${table}-changes${filter ? `-${filter}` : ''}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table,
              filter
            },
            (payload: SubscriptionPayload) => {
              if (isMounted) setIsConnected(true)
              if (payload.eventType === 'INSERT' && onInsert && payload.new) {
                onInsert(payload.new)
              }
              if (payload.eventType === 'UPDATE' && onUpdate && payload.new) {
                onUpdate(payload.new)
              }
              if (payload.eventType === 'DELETE' && onDelete && payload.old) {
                onDelete(payload.old)
              }
            }
          )
          .on('system', { event: 'close' }, () => {
            if (isMounted) setIsConnected(false)
          })
          .subscribe((status) => {
            if (isMounted) {
              if (status === 'CLOSED') {
                setIsConnected(false)
              } else if (status === 'SUBSCRIBED') {
                setIsConnected(true)
              }
            }
          })
      } catch (error) {
        if (isMounted && onError) onError(error as Error)
      }
    }

    void setupChannel()

    return () => {
      isMounted = false
      if (channel) {
        supabase.removeChannel(channel)
      }
    }
  }, [table, filter, onInsert, onUpdate, onDelete, onError, supabase, pollIntervalMs])

  return { isConnected }
}
