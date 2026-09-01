import { motion } from 'motion/react'
import { useDeck } from '../engine/DeckContext'
import { withAlpha } from '../theme/tokens'

/** Act-grouped slide dots along the bottom rail + position readout bottom-right. */
export function ProgressRail() {
  const { slideIndex, beat, denyMode, goToSlide, slides, acts, theme } = useDeck()
  const current = slides[slideIndex]

  return (
    <>
      <nav aria-label="Slides" className="prezzer-progress">
        {acts.map((act) => {
          const actSlides = slides
            .map((slide, index) => ({ slide, index }))
            .filter(({ slide }) => slide.act === act.number)
          if (actSlides.length === 0) return null
          const isCurrentAct = current?.act === act.number

          return (
            <div key={act.number} className="prezzer-progress-act">
              <div className="prezzer-progress-dots">
                {actSlides.map(({ slide, index }) => {
                  const isCurrent = index === slideIndex
                  const isPast = index < slideIndex
                  return (
                    <motion.button
                      key={slide.id}
                      type="button"
                      aria-label={`Go to ${slide.id}: ${slide.title}`}
                      aria-current={isCurrent ? 'page' : undefined}
                      onClick={() => goToSlide(index)}
                      className="prezzer-progress-dot"
                    >
                      <motion.span
                        aria-hidden="true"
                        animate={{
                          scale: isCurrent ? 1.6 : 1,
                          backgroundColor: isCurrent
                            ? act.color
                            : isPast
                              ? withAlpha(act.color, 0.33)
                              : theme.colors.gridLine,
                          boxShadow: isCurrent
                            ? `0 0 10px ${withAlpha(act.color, 0.67)}`
                            : '0 0 0 transparent',
                        }}
                        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                      />
                    </motion.button>
                  )
                })}
              </div>
              <span
                className="prezzer-progress-label"
                style={{
                  color: isCurrentAct ? act.color : theme.colors.textMuted,
                  opacity: isCurrentAct ? 0.9 : 0.35,
                }}
              >
                {act.number}
              </span>
            </div>
          )
        })}
      </nav>

      <div className="prezzer-progress-readout">
        {denyMode && (
          <motion.span
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="prezzer-deny-badge"
            style={{
              color: theme.colors.errorRed,
              borderColor: withAlpha(theme.colors.errorRed, 0.53),
              textShadow: `0 0 8px ${withAlpha(theme.colors.errorRed, 0.4)}`,
            }}
          >
            DENY
          </motion.span>
        )}
        {current && (
          <span style={{ color: theme.colors.textMuted, opacity: 0.6 }}>
            {current.id}
            {current.deep && ' ▽'}
            {current.beats > 1 && ` · ${beat + 1}/${current.beats}`}
          </span>
        )}
      </div>
    </>
  )
}
