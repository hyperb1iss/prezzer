import { useCallback, useEffect } from 'react'
import { useDeck } from './DeckContext'

/**
 * Interaction starting inside these elements belongs to the content, not
 * deck navigation. Mark any other embedded demo surface with
 * `data-prezzer-interactive` to keep the deck's hands off it.
 */
export const interactiveElementSelector =
  'a, button, input, select, textarea, [contenteditable]:not([contenteditable="false"]), [data-prezzer-interactive]'

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

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return

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
    },
    [
      next,
      prev,
      nextSlide,
      prevSlide,
      goToSlide,
      totalSlides,
      toggleDeny,
      fireAutoplay,
      onToggleFullscreen,
      onToggleNotes,
      onToggleGrid,
      onEscape,
      onAdvanceIntercept,
    ]
  )

  useEffect(() => {
    if (!enabled) return
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [enabled, handleKeyDown])
}
