import { useCallback, useSyncExternalStore } from 'react'

interface UseFullscreenReturn {
  isFullscreen: boolean
  toggleFullscreen: () => void
  enterFullscreen: () => void
  exitFullscreen: () => void
}

function subscribeToFullscreen(onChange: () => void): () => void {
  document.addEventListener('fullscreenchange', onChange)
  document.addEventListener('webkitfullscreenchange', onChange)
  return () => {
    document.removeEventListener('fullscreenchange', onChange)
    document.removeEventListener('webkitfullscreenchange', onChange)
  }
}

function readFullscreenState(): boolean {
  return !!(
    document.fullscreenElement ??
    (document as Document & { webkitFullscreenElement?: Element }).webkitFullscreenElement
  )
}

const serverFullscreenState = () => false

export function useFullscreen(
  elementRef?: React.RefObject<HTMLElement | null>
): UseFullscreenReturn {
  // An external store read means a deck mounted while already fullscreen
  // (HMR remount, embedded host) reports the real state from the start.
  const isFullscreen = useSyncExternalStore(
    subscribeToFullscreen,
    readFullscreenState,
    serverFullscreenState
  )

  const getElement = useCallback((): HTMLElement => {
    return elementRef?.current ?? document.documentElement
  }, [elementRef])

  const enterFullscreen = useCallback(async () => {
    const element = getElement()

    try {
      if (element.requestFullscreen) {
        await element.requestFullscreen()
      } else if (
        (element as HTMLElement & { webkitRequestFullscreen?: () => Promise<void> })
          .webkitRequestFullscreen
      ) {
        // Safari
        await (
          element as HTMLElement & { webkitRequestFullscreen: () => Promise<void> }
        ).webkitRequestFullscreen()
      }
    } catch (error) {
      console.warn('Fullscreen request failed:', error)
    }
  }, [getElement])

  const exitFullscreen = useCallback(async () => {
    try {
      if (document.exitFullscreen) {
        await document.exitFullscreen()
      } else if (
        (document as Document & { webkitExitFullscreen?: () => Promise<void> }).webkitExitFullscreen
      ) {
        // Safari
        await (
          document as Document & { webkitExitFullscreen: () => Promise<void> }
        ).webkitExitFullscreen()
      }
    } catch (error) {
      console.warn('Exit fullscreen failed:', error)
    }
  }, [])

  const toggleFullscreen = useCallback(() => {
    if (readFullscreenState()) {
      exitFullscreen()
    } else {
      enterFullscreen()
    }
  }, [enterFullscreen, exitFullscreen])

  return {
    isFullscreen,
    toggleFullscreen,
    enterFullscreen,
    exitFullscreen,
  }
}
