import { motion } from 'motion/react'
import { useEffect, useRef } from 'react'
import { useDeck } from '../engine/DeckContext'
import { withAlpha } from '../theme/tokens'

interface GridOverviewProps {
  onClose: () => void
}

/** `g` overlay for a bird's-eye view of the deck. */
export function GridOverview({ onClose }: GridOverviewProps) {
  const { slideIndex, goToSlide, slides, acts, theme } = useDeck()
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => dialogRef.current?.focus(), [])

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
            g or esc to close
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
                type="button"
                aria-current={isCurrent ? 'page' : undefined}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.02, type: 'spring', stiffness: 300, damping: 26 }}
                onClick={() => {
                  goToSlide(index)
                  onClose()
                }}
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
