import { motion, type Variants } from 'motion/react'
import type { ReactNode } from 'react'
import { springs } from '../motion/animations'
import { useBeatAudit } from './BeatAudit'
import { useBeat } from './DeckContext'

const defaultVariants: Variants = {
  hidden: { opacity: 0, y: 24, filter: 'blur(6px)' },
  visible: { opacity: 1, y: 0, filter: 'blur(0px)', transition: springs.smooth },
}

interface BeatProps {
  /** Visible once the slide's beat reaches this value */
  at: number
  children: ReactNode
  className?: string
  variants?: Variants
}

/** Beat-gated reveal. Backing up a beat re-hides it. */
export function Beat({ at, children, className, variants }: BeatProps) {
  const beat = useBeat()
  useBeatAudit(at)
  const hidden = beat < at
  return (
    <motion.div
      className={className}
      variants={variants ?? defaultVariants}
      initial="hidden"
      animate={hidden ? 'hidden' : 'visible'}
      aria-hidden={hidden}
      inert={hidden || undefined}
    >
      {children}
    </motion.div>
  )
}
