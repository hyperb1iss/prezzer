import { motion } from 'motion/react'
import type { ReactNode } from 'react'
import {
  getTransitionSpring,
  getTransitionVariants,
  type TransitionType,
} from '../motion/animations'

interface SlideContainerProps {
  children: ReactNode
  direction: number
  title: string
  transition: TransitionType
}

/** Enter/exit animation wrapper; transition personality comes from the slide def. */
export function SlideContainer({ children, direction, title, transition }: SlideContainerProps) {
  const variants = getTransitionVariants(transition)
  const spring = getTransitionSpring(transition)

  return (
    <motion.section
      aria-label={title}
      custom={direction}
      variants={variants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={spring}
      className="slide-container"
      style={{
        perspective: '1200px',
        transformStyle: 'preserve-3d',
      }}
    >
      {children}
    </motion.section>
  )
}
