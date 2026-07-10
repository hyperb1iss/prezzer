import type { Variants } from 'motion/react'

/**
 * Spring presets - physics-based, no durations
 */
export const springs = {
  snappy: { type: 'spring', stiffness: 400, damping: 30 },
  smooth: { type: 'spring', stiffness: 200, damping: 25 },
  bouncy: { type: 'spring', stiffness: 300, damping: 20 },
  gentle: { type: 'spring', stiffness: 100, damping: 20 },
} as const

/**
 * Slide transition types - each with distinct personality
 */
export type TransitionType =
  | 'slide' // Standard horizontal
  | 'zoom' // Scale up from center (big reveals)
  | 'portal' // Scale down + blur (traveling through)
  | 'glitch' // Instant cut with offset flash
  | 'rise' // Vertical from bottom (new sections)
  | 'spiral' // Rotation + scale (playful)
  | 'morph' // Pure crossfade (elegant)
  | 'split' // Centered horizontal compress/stretch (dramatic)

/**
 * Transition variant factories
 */
const createSlideVariants = (): Variants => ({
  enter: (direction: number) => ({
    x: direction > 0 ? '100%' : '-100%',
    opacity: 0,
    filter: 'blur(8px)',
  }),
  center: {
    x: 0,
    opacity: 1,
    filter: 'blur(0px)',
  },
  exit: (direction: number) => ({
    x: direction < 0 ? '100%' : '-100%',
    opacity: 0,
    filter: 'blur(8px)',
  }),
})

const createZoomVariants = (): Variants => ({
  enter: () => ({
    scale: 0.85,
    opacity: 0,
    filter: 'blur(20px) brightness(1.5)',
  }),
  center: {
    scale: 1,
    opacity: 1,
    filter: 'blur(0px) brightness(1)',
  },
  exit: () => ({
    scale: 1.1,
    opacity: 0,
    filter: 'blur(15px) brightness(0.8)',
  }),
})

const createPortalVariants = (): Variants => ({
  enter: () => ({
    scale: 1.3,
    opacity: 0,
    filter: 'blur(30px) saturate(2)',
    rotateX: 15,
  }),
  center: {
    scale: 1,
    opacity: 1,
    filter: 'blur(0px) saturate(1)',
    rotateX: 0,
  },
  exit: () => ({
    scale: 0.7,
    opacity: 0,
    filter: 'blur(25px) saturate(0.5)',
    rotateX: -10,
  }),
})

const createGlitchVariants = (): Variants => ({
  enter: () => ({
    opacity: 0,
    x: 0,
    filter: 'blur(0px)',
    clipPath: 'inset(0 0 100% 0)',
  }),
  center: {
    opacity: 1,
    x: 0,
    filter: 'blur(0px)',
    clipPath: 'inset(0 0 0% 0)',
  },
  exit: () => ({
    opacity: 0,
    x: [0, -8, 5, -3, 0],
    filter: [
      'blur(0px) hue-rotate(0deg)',
      'blur(2px) hue-rotate(90deg)',
      'blur(0px) hue-rotate(-60deg)',
      'blur(1px) hue-rotate(30deg)',
      'blur(0px) hue-rotate(0deg)',
    ],
    clipPath: 'inset(100% 0 0 0)',
  }),
})

const createRiseVariants = (): Variants => ({
  enter: () => ({
    y: '80%',
    opacity: 0,
    scale: 0.95,
    filter: 'blur(10px)',
  }),
  center: {
    y: 0,
    opacity: 1,
    scale: 1,
    filter: 'blur(0px)',
  },
  exit: () => ({
    y: '-60%',
    opacity: 0,
    scale: 0.98,
    filter: 'blur(8px)',
  }),
})

const createSpiralVariants = (): Variants => ({
  enter: (direction: number) => ({
    scale: 0.9,
    rotate: direction > 0 ? -8 : 8,
    opacity: 0,
    filter: 'blur(12px)',
  }),
  center: {
    scale: 1,
    rotate: 0,
    opacity: 1,
    filter: 'blur(0px)',
  },
  exit: (direction: number) => ({
    scale: 0.85,
    rotate: direction > 0 ? 8 : -8,
    opacity: 0,
    filter: 'blur(12px)',
  }),
})

const createMorphVariants = (): Variants => ({
  enter: () => ({
    opacity: 0,
    scale: 1.02,
    filter: 'blur(6px) brightness(1.1)',
  }),
  center: {
    opacity: 1,
    scale: 1,
    filter: 'blur(0px) brightness(1)',
  },
  exit: () => ({
    opacity: 0,
    scale: 0.98,
    filter: 'blur(6px) brightness(0.9)',
  }),
})

const createSplitVariants = (): Variants => ({
  enter: () => ({
    opacity: 0,
    scaleX: 0.8,
    filter: 'blur(15px)',
    transformOrigin: 'center',
  }),
  center: {
    opacity: 1,
    scaleX: 1,
    filter: 'blur(0px)',
  },
  exit: () => ({
    opacity: 0,
    scaleX: 1.2,
    filter: 'blur(15px)',
  }),
})

/**
 * Get variants for a specific transition type
 */
export function getTransitionVariants(type: TransitionType): Variants {
  switch (type) {
    case 'zoom':
      return createZoomVariants()
    case 'portal':
      return createPortalVariants()
    case 'glitch':
      return createGlitchVariants()
    case 'rise':
      return createRiseVariants()
    case 'spiral':
      return createSpiralVariants()
    case 'morph':
      return createMorphVariants()
    case 'split':
      return createSplitVariants()
    default:
      return createSlideVariants()
  }
}

/**
 * Get spring config for a transition type
 */
export function getTransitionSpring(type: TransitionType) {
  switch (type) {
    case 'zoom':
      return { type: 'spring' as const, stiffness: 280, damping: 28 }
    case 'portal':
      return { type: 'spring' as const, stiffness: 150, damping: 22 }
    case 'glitch':
      return { type: 'tween' as const, duration: 0.25, ease: [0.85, 0, 0.15, 1] as const }
    case 'rise':
      return { type: 'spring' as const, stiffness: 180, damping: 24 }
    case 'spiral':
      return { type: 'spring' as const, stiffness: 200, damping: 20 }
    case 'morph':
      return { type: 'tween' as const, duration: 0.5, ease: [0.4, 0, 0.2, 1] as const }
    case 'split':
      return { type: 'spring' as const, stiffness: 220, damping: 26 }
    default:
      return springs.smooth
  }
}

/**
 * Staggered reveal for lists
 */
export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.2 },
  },
}

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 20, filter: 'blur(4px)' },
  visible: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: springs.smooth,
  },
}

/**
 * Counter animation for stats
 */
export const counterVariants: Variants = {
  hidden: { scale: 0.8, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: { ...springs.bouncy, delay: 0.3 },
  },
}

/**
 * Glow pulse for emphasis
 */
export const glowPulse: Variants = {
  idle: {
    boxShadow: '0 0 20px rgba(128, 255, 234, 0.2)',
  },
  pulse: {
    boxShadow: [
      '0 0 20px rgba(128, 255, 234, 0.2)',
      '0 0 40px rgba(128, 255, 234, 0.4)',
      '0 0 20px rgba(128, 255, 234, 0.2)',
    ],
    transition: { duration: 2, repeat: Number.POSITIVE_INFINITY },
  },
}

/**
 * Fade in up animation
 */
export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: springs.smooth,
  },
}

/**
 * Scale in animation
 */
export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: springs.bouncy,
  },
}

/**
 * Progress bar fill animation
 */
export const progressFill: Variants = {
  hidden: { scaleX: 0 },
  visible: (progress: number) => ({
    scaleX: progress,
    transition: { duration: 1, ease: [0.25, 0.46, 0.45, 0.94] },
  }),
}

/**
 * Checkmark pop animation
 */
export const checkmarkPop: Variants = {
  hidden: { scale: 0, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: { ...springs.bouncy, delay: 0.5 },
  },
}

/**
 * Line draw animation for SVG paths
 */
export const drawLine: Variants = {
  hidden: { pathLength: 0, opacity: 0 },
  visible: {
    pathLength: 1,
    opacity: 1,
    transition: { duration: 1.5, ease: 'easeInOut' },
  },
}

/**
 * Snap scale entrance - lands with impact (for hero moments)
 */
export const snapIn: Variants = {
  hidden: { opacity: 0, scale: 1.08, filter: 'blur(6px)' },
  visible: {
    opacity: 1,
    scale: 1,
    filter: 'blur(0px)',
    transition: springs.snappy,
  },
}

/**
 * Draw from center - for accent lines
 */
export const drawFromCenter: Variants = {
  hidden: { scaleX: 0, opacity: 0 },
  visible: {
    scaleX: 1,
    opacity: 1,
    transition: { ...springs.smooth, delay: 0.3 },
  },
}

/**
 * Glow bloom - subtle glow that appears after element lands
 */
export const glowBloom = (color: string, delay = 0.4): Variants => ({
  hidden: { boxShadow: '0 0 0 rgba(0,0,0,0)' },
  visible: {
    boxShadow: `0 0 30px ${color}40, 0 0 60px ${color}20`,
    transition: { duration: 0.6, delay },
  },
})

/**
 * Hover lift - subtle raise on hover for interactive cards
 */
export const hoverLift = {
  y: -3,
  boxShadow: '0 12px 40px rgba(0,0,0,0.4)',
  transition: springs.snappy,
}

/**
 * Typing animation config
 */
export const typing = {
  charDelay: 0.025, // 25ms per character
  wordDelay: 0.08, // slight pause between words
  cursorBlinkRate: 800, // ms
}

/**
 * Scan line sweep (single pass on slide enter)
 */
export const scanSweep: Variants = {
  hidden: { y: '-100%', opacity: 0 },
  visible: {
    y: '200%',
    opacity: [0, 0.6, 0.6, 0],
    transition: { duration: 1.5, ease: 'easeInOut' },
  },
}

/**
 * CRT flicker for terminal elements (subtle)
 */
export const crtFlicker: Variants = {
  idle: { opacity: 1 },
  flicker: {
    opacity: [1, 0.97, 1, 0.98, 1],
    transition: { duration: 0.15, repeat: Infinity, repeatDelay: 3 },
  },
}
