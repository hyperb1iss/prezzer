import { useCallback, useEffect, useRef } from 'react'
import { interactiveElementSelector } from '../engine/useKeyboardShortcuts'

interface UseTouchNavigationOptions {
  onNext: () => void
  onPrev: () => void
  /** Called on center tap - return true if handled (e.g., widget started) */
  onTapCenter?: () => boolean
  /** Minimum swipe distance in pixels to trigger navigation */
  swipeThreshold?: number
  /** Enable tap zones for navigation */
  enableTapZones?: boolean
  /** Edge tap zone width as percentage of screen (0-0.5) */
  edgeTapZone?: number
  enabled?: boolean
}

export function useTouchNavigation({
  onNext,
  onPrev,
  onTapCenter,
  swipeThreshold = 50,
  enableTapZones = true,
  edgeTapZone = 0.2,
  enabled = true,
}: UseTouchNavigationOptions): void {
  const touchStartX = useRef<number | null>(null)
  const touchStartY = useRef<number | null>(null)
  const touchStartTime = useRef<number>(0)
  const startedOnInteractiveElement = useRef(false)

  const handleTouchStart = useCallback((event: TouchEvent) => {
    const touch = event.touches[0]
    if (!touch) return
    touchStartX.current = touch.clientX
    touchStartY.current = touch.clientY
    touchStartTime.current = Date.now()
    startedOnInteractiveElement.current =
      event.target instanceof Element && event.target.closest(interactiveElementSelector) !== null
  }, [])

  const handleTouchEnd = useCallback(
    (event: TouchEvent) => {
      if (touchStartX.current === null || touchStartY.current === null) return

      if (startedOnInteractiveElement.current) {
        startedOnInteractiveElement.current = false
        touchStartX.current = null
        touchStartY.current = null
        return
      }

      const touch = event.changedTouches[0]
      if (!touch) return
      const deltaX = touch.clientX - touchStartX.current
      const deltaY = touch.clientY - touchStartY.current
      const deltaTime = Date.now() - touchStartTime.current

      const startX = touchStartX.current
      touchStartX.current = null
      touchStartY.current = null

      const isHorizontalSwipe = Math.abs(deltaX) > Math.abs(deltaY)

      if (isHorizontalSwipe && Math.abs(deltaX) > swipeThreshold) {
        if (deltaX < 0) {
          onNext()
        } else {
          onPrev()
        }
        return
      }

      if (enableTapZones && deltaTime < 300 && Math.abs(deltaX) < 10 && Math.abs(deltaY) < 10) {
        const screenWidth = window.innerWidth
        const tapZoneWidth = screenWidth * edgeTapZone

        if (startX < tapZoneWidth) {
          onPrev()
        } else if (startX > screenWidth - tapZoneWidth) {
          onNext()
        } else {
          if (onTapCenter) {
            const handled = onTapCenter()
            if (!handled) {
              onNext()
            }
          } else {
            onNext()
          }
        }
      }
    },
    [onNext, onPrev, onTapCenter, swipeThreshold, enableTapZones, edgeTapZone]
  )

  useEffect(() => {
    if (!enabled) return

    window.addEventListener('touchstart', handleTouchStart, { passive: true })
    window.addEventListener('touchend', handleTouchEnd, { passive: true })

    return () => {
      window.removeEventListener('touchstart', handleTouchStart)
      window.removeEventListener('touchend', handleTouchEnd)
    }
  }, [enabled, handleTouchStart, handleTouchEnd])
}
