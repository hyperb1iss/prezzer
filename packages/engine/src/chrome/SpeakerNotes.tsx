import { motion } from 'motion/react'
import { useDeck } from '../engine/DeckContext'

/** `n` overlay for speaker notes. Unscaled for readability. */
export function SpeakerNotes() {
  const { slideIndex, beat, slides, theme } = useDeck()
  const def = slides[slideIndex]
  if (!def) return null

  return (
    <motion.aside
      aria-label="Speaker notes"
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', stiffness: 300, damping: 32 }}
      className="prezzer-speaker-notes"
      style={{
        backgroundColor: `${theme.colors.terminalBlack}f0`,
        borderColor: `${theme.colors.electricPurple}44`,
      }}
    >
      <div className="prezzer-speaker-notes-header">
        <span style={{ color: theme.colors.electricPurple }}>
          {def.id}
          {def.deep && ' ▽'}
        </span>
        <span style={{ color: theme.colors.textPrimary }}>{def.title}</span>
        {def.beats > 1 && (
          <span style={{ color: theme.colors.textMuted }}>
            beat {beat + 1}/{def.beats}
          </span>
        )}
        <span className="prezzer-speaker-notes-hint" style={{ color: theme.colors.textMuted }}>
          n to close
        </span>
      </div>
      <ul className="prezzer-speaker-notes-list">
        {def.notes.map((note) => (
          <li
            key={note}
            className="prezzer-speaker-note"
            style={{ color: `${theme.colors.textPrimary}d9` }}
          >
            <span style={{ color: theme.colors.neonCyan }}>▸ </span>
            {note}
          </li>
        ))}
        {def.notes.length === 0 && (
          <li className="prezzer-speaker-note" style={{ color: theme.colors.textMuted }}>
            no notes for this slide
          </li>
        )}
      </ul>
    </motion.aside>
  )
}
