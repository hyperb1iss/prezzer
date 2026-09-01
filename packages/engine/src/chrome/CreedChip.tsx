import { useDeckTheme } from '../engine/DeckContext'
import { withAlpha } from '../theme/tokens'

interface CreedChipProps {
  label: string
  color?: string
}

/** Neon pill for a design creed, shown on slides where the creed is load-bearing. */
export function CreedChip({ label, color }: CreedChipProps) {
  const theme = useDeckTheme()
  const chipColor = color ?? theme.colors.electricPurple
  return (
    <span
      className="prezzer-creed-chip"
      style={{
        color: chipColor,
        borderColor: withAlpha(chipColor, 0.4),
        backgroundColor: withAlpha(chipColor, 0.08),
        boxShadow: `0 0 12px ${withAlpha(chipColor, 0.2)}`,
      }}
    >
      {label}
    </span>
  )
}
