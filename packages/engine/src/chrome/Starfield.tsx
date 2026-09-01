import { motion, useReducedMotion } from 'motion/react'
import { useMemo } from 'react'
import { useDeckTheme } from '../engine/DeckContext'

type Star = {
  x: number
  y: number
  size: number
  opacity: number
  duration: number
  delay: number
  driftX: number
  driftY: number
  color: string
}

interface StarfieldProps {
  count?: number
  className?: string
  palette?: string[]
}

function randomFraction(seed: number): number {
  const value = Math.sin(seed * 12.9898) * 43758.5453
  return value - Math.floor(value)
}

export function Starfield({ count = 32, className = '', palette }: StarfieldProps) {
  const theme = useDeckTheme()
  // MotionConfig only silences transform animation; the opacity pulse
  // and infinite drift need an explicit gate to actually go still.
  const reduceMotion = useReducedMotion()
  const colors = useMemo(
    () => palette ?? [theme.colors.neonCyan, theme.colors.electricPurple, theme.colors.coral],
    [palette, theme]
  )

  const stars = useMemo<Star[]>(() => {
    return Array.from({ length: count }).map((_, index) => ({
      x: randomFraction(index * 7 + 1) * 100,
      y: randomFraction(index * 7 + 2) * 100,
      size: 2 + (index % 3),
      opacity: 0.18 + randomFraction(index * 7 + 3) * 0.4,
      duration: 8 + randomFraction(index * 7 + 4) * 10,
      delay: randomFraction(index * 7 + 5) * 3,
      driftX: (randomFraction(index * 7 + 6) - 0.5) * 60,
      driftY: (randomFraction(index * 7 + 7) - 0.5) * 80,
      color: colors[index % colors.length] ?? theme.colors.neonCyan,
    }))
  }, [count, colors, theme.colors.neonCyan])

  return (
    <div aria-hidden="true" className={`prezzer-starfield ${className}`}>
      {stars.map((star, index) => (
        <motion.div
          // biome-ignore lint/suspicious/noArrayIndexKey: stars are positional and never reorder
          key={`star-${index}`}
          className="prezzer-star"
          style={{
            left: `${star.x}%`,
            top: `${star.y}%`,
            width: `${star.size}px`,
            height: `${star.size}px`,
            backgroundColor: star.color,
            opacity: star.opacity,
          }}
          {...(reduceMotion
            ? {}
            : {
                animate: {
                  x: [0, star.driftX, 0],
                  y: [0, star.driftY, 0],
                  opacity: [star.opacity * 0.6, star.opacity, star.opacity * 0.6],
                },
                transition: {
                  duration: star.duration,
                  repeat: Number.POSITIVE_INFINITY,
                  delay: star.delay,
                  ease: 'easeInOut' as const,
                },
              })}
        />
      ))}
    </div>
  )
}
