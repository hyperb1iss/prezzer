import { motion } from 'motion/react'
import { type KeyboardEvent as ReactKeyboardEvent, useEffect, useRef, useState } from 'react'
import { useDeck } from '../engine/DeckContext'
import { withAlpha } from '../theme/tokens'

interface GridOverviewProps {
  onClose: () => void
}

/** `g` overlay for a bird's-eye view of the deck. */
export function GridOverview({ onClose }: GridOverviewProps) {
  const { slideIndex, goToSlide, slides, acts, theme } = useDeck()
  const dialogRef = useRef<HTMLDivElement>(null)
  const cardRefs = useRef<(HTMLButtonElement | null)[]>([])
  const [typeahead, setTypeahead] = useState('')
  const typeaheadTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    const previous = document.activeElement
    dialogRef.current?.focus()
    return () => {
      clearTimeout(typeaheadTimer.current)
      // Hand focus back to wherever the presenter was before the overlay.
      if (previous instanceof HTMLElement) previous.focus()
    }
  }, [])

  const focusCard = (index: number) => {
    const clamped = Math.max(0, Math.min(index, slides.length - 1))
    cardRefs.current[clamped]?.focus()
  }

  // The grid is auto-fit CSS; the row length only exists in layout, so
  // count how many cards share the first card's top edge.
  const columnCount = () => {
    const cards = cardRefs.current.filter((card): card is HTMLButtonElement => card !== null)
    const first = cards[0]
    if (!first) return 1
    let count = 0
    for (const card of cards) {
      if (card.offsetTop !== first.offsetTop) break
      count += 1
    }
    return Math.max(1, count)
  }

  const focusedIndex = () => {
    const active = cardRefs.current.findIndex((card) => card === document.activeElement)
    return active === -1 ? slideIndex : active
  }

  const jumpTo = (index: number) => {
    goToSlide(index)
    onClose()
  }

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (/^[0-9]$/.test(event.key)) {
      event.preventDefault()
      const buffer = `${typeahead}${event.key}`.slice(0, 3)
      setTypeahead(buffer)
      focusCard(Number.parseInt(buffer, 10) - 1)
      clearTimeout(typeaheadTimer.current)
      typeaheadTimer.current = setTimeout(() => setTypeahead(''), 1500)
      return
    }
    if (event.key === 'Enter' && typeahead) {
      event.preventDefault()
      const target = Number.parseInt(typeahead, 10) - 1
      setTypeahead('')
      clearTimeout(typeaheadTimer.current)
      if (target >= 0 && target < slides.length) jumpTo(target)
      return
    }

    const moves: Record<string, () => number> = {
      ArrowRight: () => focusedIndex() + 1,
      ArrowLeft: () => focusedIndex() - 1,
      ArrowDown: () => focusedIndex() + columnCount(),
      ArrowUp: () => focusedIndex() - columnCount(),
      Home: () => 0,
      End: () => slides.length - 1,
    }
    const move = moves[event.key]
    if (move) {
      event.preventDefault()
      focusCard(move())
    }
  }

  return (
    <motion.div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="prezzer-grid-title"
      tabIndex={-1}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="prezzer-grid-overview"
      style={{ backgroundColor: withAlpha(theme.colors.deepBlack, 0.92) }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
      onKeyDown={handleKeyDown}
    >
      <div className="prezzer-grid-panel">
        <h2 id="prezzer-grid-title" className="prezzer-sr-only">
          Slide overview
        </h2>
        <div className="prezzer-grid-legend">
          {acts.map((act) => (
            <span
              key={act.number}
              className="prezzer-grid-legend-item"
              style={{ color: act.color }}
            >
              {act.number} · {act.title}
            </span>
          ))}
          <span className="prezzer-grid-hint" style={{ color: theme.colors.textMuted }}>
            {typeahead ? (
              <span style={{ color: theme.colors.neonCyan }}>→ slide {typeahead}</span>
            ) : (
              'arrows move · type a number · g or esc to close'
            )}
          </span>
        </div>

        <div className="prezzer-grid-list">
          {slides.map((slide, index) => {
            const act = acts.find((candidate) => candidate.number === slide.act)
            const color = act?.color ?? theme.colors.electricPurple
            const isCurrent = index === slideIndex

            return (
              <motion.button
                key={slide.id}
                ref={(element) => {
                  cardRefs.current[index] = element
                }}
                type="button"
                aria-current={isCurrent ? 'page' : undefined}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.02, type: 'spring', stiffness: 300, damping: 26 }}
                onClick={() => jumpTo(index)}
                className="prezzer-grid-card"
                style={{
                  borderLeftColor: color,
                  backgroundColor: isCurrent ? theme.colors.surfaceElevated : theme.colors.surface,
                  outlineColor: isCurrent ? withAlpha(color, 0.53) : 'transparent',
                  boxShadow: isCurrent ? `0 0 24px ${withAlpha(color, 0.2)}` : 'none',
                }}
              >
                <span className="prezzer-grid-card-meta">
                  <span style={{ color }}>{slide.id}</span>
                  {slide.deep && <span style={{ color: theme.colors.textMuted }}>▽</span>}
                  {slide.beats > 1 && (
                    <span style={{ color: theme.colors.textMuted }}>{slide.beats} beats</span>
                  )}
                  {slide.badge && (
                    <span
                      className="prezzer-grid-card-badge"
                      style={{ color: theme.colors.textMuted }}
                    >
                      {slide.badge}
                    </span>
                  )}
                </span>
                <span
                  className="prezzer-grid-card-title"
                  style={{ color: theme.colors.textPrimary }}
                >
                  {slide.title}
                </span>
              </motion.button>
            )
          })}
        </div>
      </div>
    </motion.div>
  )
}
