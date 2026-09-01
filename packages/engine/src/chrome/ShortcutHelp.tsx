import { motion } from 'motion/react'
import { useEffect, useRef } from 'react'
import { useDeck } from '../engine/DeckContext'
import { withAlpha } from '../theme/tokens'

interface ShortcutHelpProps {
  onClose: () => void
}

const shortcuts: readonly [string, string][] = [
  ['space · → · pgdn', 'next widget, beat, or slide'],
  ['← · pgup', 'previous beat or slide'],
  ['shift + advance', 'whole slide, skipping beats'],
  ['1–9', 'jump straight to a slide'],
  ['home · end', 'first or last slide'],
  ['g', 'grid overview'],
  ['n', 'speaker notes'],
  ['f', 'fullscreen'],
  ['d', 'deny mode'],
  ['a', 'autoplay signal'],
  ['p', 'presenter window'],
  ['?', 'this overlay'],
  ['esc', 'close overlays, exit fullscreen'],
]

/** `?` overlay listing the deck's keyboard vocabulary. */
export function ShortcutHelp({ onClose }: ShortcutHelpProps) {
  const { theme } = useDeck()
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const previous = document.activeElement
    dialogRef.current?.focus()
    return () => {
      if (previous instanceof HTMLElement) previous.focus()
    }
  }, [])

  return (
    <motion.div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="prezzer-help-title"
      tabIndex={-1}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="prezzer-help-overlay"
      style={{ backgroundColor: withAlpha(theme.colors.deepBlack, 0.92) }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        className="prezzer-help-panel"
        style={{
          backgroundColor: theme.colors.surface,
          borderColor: withAlpha(theme.colors.electricPurple, 0.27),
        }}
      >
        <h2
          id="prezzer-help-title"
          className="prezzer-help-title"
          style={{ color: theme.colors.electricPurple }}
        >
          keyboard
        </h2>
        <dl className="prezzer-help-list">
          {shortcuts.map(([keys, action]) => (
            <div key={keys} className="prezzer-help-row">
              <dt style={{ color: theme.colors.neonCyan }}>{keys}</dt>
              <dd style={{ color: theme.colors.textPrimary }}>{action}</dd>
            </div>
          ))}
        </dl>
        <p className="prezzer-help-hint" style={{ color: theme.colors.textMuted }}>
          ? or esc to close · swipe and tap work everywhere the keys do
        </p>
      </div>
    </motion.div>
  )
}
