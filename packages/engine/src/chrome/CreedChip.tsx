import { useDeckTheme } from '../engine/DeckContext'

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
        borderColor: `${chipColor}66`,
        backgroundColor: `${chipColor}14`,
        boxShadow: `0 0 12px ${chipColor}33`,
      }}
    >
      {label}
    </span>
  )
}
