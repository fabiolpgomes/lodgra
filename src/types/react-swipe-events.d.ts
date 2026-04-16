declare module 'react-swipe-events' {
  import { RefObject } from 'react'

  export interface SwipeOptions {
    onSwipedLeft?: () => void
    onSwipedRight?: () => void
    onSwipedUp?: () => void
    onSwipedDown?: () => void
    preventDefaultTouchmoveEvent?: boolean
    trackTouch?: boolean
    trackMouse?: boolean
    rotationAngle?: number
    delta?: number
  }

  export function useSwipe(
    ref: RefObject<HTMLElement | null>,
    options: SwipeOptions,
    threshold?: number
  ): void
}
