import { useDeckTheme } from '../engine/DeckContext'
import type { Theme } from '../theme/tokens'

interface BadgeStyle {
  color: string
  filled: boolean
}

function styleFor(status: string, theme: Theme): BadgeStyle {
  const known: Record<string, BadgeStyle> = {
    GA: { color: theme.colors.successGreen, filled: true },
    'DEV ONLY': { color: theme.colors.electricYellow, filled: true },
    'NOT ROLLED OUT': { color: theme.colors.electricPurple, filled: false },
    'COMING SOON': { color: theme.colors.neonCyan, filled: false },
    'IN FLIGHT': { color: theme.colors.electricYellow, filled: false },
  }
  return known[status] ?? { color: theme.colors.electricPurple, filled: false }
}

interface RolloutBadgeProps {
  status: string
  /** Override the built-in color for statuses outside the known vocabulary */
  color?: string
  filled?: boolean
}

/** Honest status stamp, top-right of the canvas. */
export function RolloutBadge({ status, color, filled }: RolloutBadgeProps) {
  const theme = useDeckTheme()
  const base = styleFor(status, theme)
  const badgeColor = color ?? base.color
  const isFilled = filled ?? base.filled
  return (
    <div
      className="prezzer-rollout-badge"
      style={{
        color: badgeColor,
        borderColor: badgeColor,
        backgroundColor: isFilled ? `${badgeColor}1a` : 'transparent',
        boxShadow: `0 0 16px ${badgeColor}44`,
        textShadow: `0 0 10px ${badgeColor}66`,
      }}
    >
      {status}
    </div>
  )
}
