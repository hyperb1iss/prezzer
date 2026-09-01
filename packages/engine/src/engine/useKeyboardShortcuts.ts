import { useEffect, useRef } from 'react'
import { useDeck } from './DeckContext'

/**
 * Interaction starting inside these elements belongs to the content, not
 * deck navigation. Mark any other embedded demo surface with
 * `data-prezzer-interactive` to keep the deck's hands off it.
 */
export const interactiveElementSelector =
  'a, button, input, select, textarea, video, audio, summary, [role="button"], [contenteditable]:not([contenteditable="false"]), [data-prezzer-interactive]'

export interface UseKeyboardShortcutsOptions {
  onToggleFullscreen?: () => void
  onToggleNotes?: () => void
  onToggleGrid?: () => void
  /** Returns true if an overlay consumed the Escape */
  onEscape?: () => boolean
  /**
   * Pre-advance interceptor for space/right: return true to consume the
   * press instead of advancing. This is how imperative widgets claim the
   * spacebar (see the widgets module).
   */
  onAdvanceIntercept?: () => boolean
  enabled?: boolean
}

export function useKeyboardShortcuts({
  onToggleFullscreen,
  onToggleNotes,
  onToggleGrid,
  onEscape,
  onAdvanceIntercept,
  enabled = true,
}: UseKeyboardShortcutsOptions = {}): void {
  const { next, prev, nextSlide, prevSlide, goToSlide, totalSlides, toggleDeny, fireAutoplay } =
    useDeck()

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return

    // A held toggle key must not strobe fullscreen/notes/grid/deny/autoplay.
    if (event.repeat && /^[fngda]$/i.test(event.key)) return

    const target = event.target
    if (target instanceof Element && target.closest(interactiveElementSelector)) {
      return
    }

    switch (event.key) {
      case 'ArrowRight':
      case ' ':
      case 'PageDown':
        event.preventDefault()
        if (event.shiftKey) {
          nextSlide()
        } else if (!onAdvanceIntercept?.()) {
          next()
        }
        break

      case 'ArrowLeft':
      case 'PageUp':
        event.preventDefault()
        if (event.shiftKey) {
          prevSlide()
        } else {
          prev()
        }
        break

      case 'Home':
        event.preventDefault()
        goToSlide(0)
        break

      case 'End':
        event.preventDefault()
        goToSlide(totalSlides - 1)
        break

      case 'f':
      case 'F':
        if (onToggleFullscreen) {
          event.preventDefault()
          onToggleFullscreen()
        }
        break

      case 'n':
      case 'N':
        if (onToggleNotes) {
          event.preventDefault()
          onToggleNotes()
        }
        break

      case 'g':
      case 'G':
        if (onToggleGrid) {
          event.preventDefault()
          onToggleGrid()
        }
        break

      case 'd':
      case 'D':
        event.preventDefault()
        toggleDeny()
        break

      case 'a':
      case 'A':
        event.preventDefault()
        fireAutoplay()
        break

      case 'Escape':
        if (onEscape?.()) event.preventDefault()
        break

      default:
        if (/^[1-9]$/.test(event.key)) {
          const index = Number.parseInt(event.key, 10) - 1
          if (index < totalSlides) {
            event.preventDefault()
            goToSlide(index)
          }
        }
        break
    }
  }

  // The window listener latches the latest handler through a ref so the
  // subscription itself attaches once, instead of detaching and
  // reattaching on every render of the deck shell.
  const latestHandler = useRef(handleKeyDown)
  useEffect(() => {
    latestHandler.current = handleKeyDown
  })

  useEffect(() => {
    if (!enabled) return
    const listener = (event: KeyboardEvent) => latestHandler.current(event)
    window.addEventListener('keydown', listener)
    return () => window.removeEventListener('keydown', listener)
  }, [enabled])
}
