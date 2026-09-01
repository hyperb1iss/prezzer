import { motion } from 'motion/react'

type Scrim = 'left' | 'right' | 'bottom' | 'none'

interface SlideArtProps {
  src: string
  /** CSS object-position for the cover image */
  position?: string
  opacity?: number
  /** Dark gradient over one edge so slide text stays readable */
  scrim?: Scrim
  /** contain keeps the whole illustration; cover fills the canvas */
  fit?: 'cover' | 'contain'
}

// Stops derive from the theme so a themed deck never gets a half-themed
// scrim; the literal fallback keeps SlideArt context-free outside a Deck.
const scrimBase = 'var(--prezzer-color-deep-black, #0a0a12)'
const scrimMid = (alpha: number) => `color-mix(in srgb, ${scrimBase} ${alpha}%, transparent)`

const scrimGradient: Record<Scrim, string> = {
  left: `linear-gradient(90deg, ${scrimBase} 0%, ${scrimMid(70)} 30%, transparent 62%)`,
  right: `linear-gradient(270deg, ${scrimBase} 0%, ${scrimMid(70)} 30%, transparent 62%)`,
  bottom: `linear-gradient(0deg, ${scrimBase} 0%, ${scrimMid(60)} 25%, transparent 55%)`,
  none: 'transparent',
}

/** Generated art layer, behind slide content. Ken-Burns drift + edge scrim for legibility. */
export function SlideArt({
  src,
  position = 'center',
  opacity = 1,
  scrim = 'none',
  fit = 'cover',
}: SlideArtProps) {
  return (
    <div className="prezzer-slide-art">
      <motion.img
        src={src}
        alt=""
        aria-hidden="true"
        className="prezzer-slide-art-image"
        style={{ objectFit: fit, objectPosition: position, opacity }}
        initial={{ scale: 1.06 }}
        animate={{ scale: 1 }}
        transition={{ duration: 12, ease: 'easeOut' }}
      />
      {scrim !== 'none' && (
        <div className="prezzer-slide-art-scrim" style={{ background: scrimGradient[scrim] }} />
      )}
      {/* Always sink the very edges into the background so nothing floats */}
      <div
        className="prezzer-slide-art-edge"
        style={{
          background: `radial-gradient(130% 130% at 50% 50%, transparent 60%, ${scrimMid(55)} 100%)`,
        }}
      />
    </div>
  )
}
