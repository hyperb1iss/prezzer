import { motion } from 'motion/react'
import type { ReactNode } from 'react'
import { useDeck } from '../engine/DeckContext'
import { springs } from '../motion/animations'
import { withAlpha } from '../theme/tokens'
import { CreedChip } from './CreedChip'

interface SlideHeaderProps {
  act: number
  title: ReactNode
  /** Small yellow tag before the act label, e.g. "⚡ war story" */
  tag?: string
  creeds?: string[]
}

/** Standard content-slide header: act eyebrow, display title, creed chips right. */
export function SlideHeader({ act, title, tag, creeds }: SlideHeaderProps) {
  const { acts, theme } = useDeck()
  const actDef = acts.find((a) => a.number === act)
  return (
    <header className="prezzer-slide-header">
      <div className="prezzer-slide-header-copy">
        <motion.div
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ ...springs.snappy, delay: 0.05 }}
          className="prezzer-slide-eyebrow"
        >
          {tag && (
            <span
              className="prezzer-slide-tag"
              style={{
                color: theme.colors.electricYellow,
                borderColor: withAlpha(theme.colors.electricYellow, 0.33),
                backgroundColor: withAlpha(theme.colors.electricYellow, 0.07),
              }}
            >
              {tag}
            </span>
          )}
          <span style={{ color: actDef?.color ?? theme.colors.textMuted }}>
            act {act} · {actDef?.title}
          </span>
        </motion.div>
        <motion.h2
          initial={{ opacity: 0, y: 18, filter: 'blur(6px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ ...springs.smooth, delay: 0.12 }}
          className="prezzer-slide-title"
          style={{ color: theme.colors.textPrimary }}
        >
          {title}
        </motion.h2>
      </div>
      {creeds && creeds.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springs.smooth, delay: 0.3 }}
          className="prezzer-slide-creeds"
        >
          {creeds.map((creed) => (
            <CreedChip key={creed} label={creed} />
          ))}
        </motion.div>
      )}
    </header>
  )
}
