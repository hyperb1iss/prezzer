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

const scrimGradient: Record<Scrim, string> = {
  left: 'linear-gradient(90deg, var(--prezzer-color-deep-black) 0%, rgba(10,10,18,0.7) 30%, transparent 62%)',
  right:
    'linear-gradient(270deg, var(--prezzer-color-deep-black) 0%, rgba(10,10,18,0.7) 30%, transparent 62%)',
  bottom:
    'linear-gradient(0deg, var(--prezzer-color-deep-black) 0%, rgba(10,10,18,0.6) 25%, transparent 55%)',
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
          background:
            'radial-gradient(130% 130% at 50% 50%, transparent 60%, rgba(10,10,18,0.55) 100%)',
        }}
      />
    </div>
  )
}
