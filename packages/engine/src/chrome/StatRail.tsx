import { motion } from 'motion/react'
import { useDeckTheme } from '../engine/DeckContext'
import { springs } from '../motion/animations'
import { withAlpha } from '../theme/tokens'

export interface Stat {
  value: string
  label: string
}

/** Coral stat callouts stacked along the right edge. */
export function StatRail({ stats }: { stats: Stat[] }) {
  const theme = useDeckTheme()
  return (
    <aside aria-label="Key statistics" className="prezzer-stat-rail">
      {stats.map((stat, index) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ ...springs.smooth, delay: 0.4 + index * 0.12 }}
          className="prezzer-stat"
        >
          <div
            className="prezzer-stat-value"
            style={{
              color: theme.colors.coral,
              textShadow: `0 0 24px ${withAlpha(theme.colors.coral, 0.27)}`,
            }}
          >
            {stat.value}
          </div>
          <div className="prezzer-stat-label" style={{ color: theme.colors.textPrimary }}>
            {stat.label}
          </div>
        </motion.div>
      ))}
    </aside>
  )
}
