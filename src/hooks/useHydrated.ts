'use client'

import { useSyncExternalStore } from 'react'

const subscribe = () => () => undefined
const getClientSnapshot = () => true
const getServerSnapshot = () => false

/** Keeps controls that require client handlers disabled through SSR/hydration. */
export function useHydrated(): boolean {
  return useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot)
}
