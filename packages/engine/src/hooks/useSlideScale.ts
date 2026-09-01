import { useLayoutEffect, useState } from 'react'

interface SlideScaleConfig {
  /** Design canvas width in pixels */
  designWidth?: number | undefined
  /** Design canvas height in pixels */
  designHeight?: number | undefined
  /** Margin around the scaled content (0-1) */
  margin?: number | undefined
  /** Minimum allowed scale */
  minScale?: number | undefined
  /** Maximum allowed scale */
  maxScale?: number | undefined
  /** Scale mode: 'contain' (letterbox) or 'cover' (fill, may crop) */
  mode?: 'contain' | 'cover' | undefined
}

interface SlideScaleResult {
  scale: number
  width: number
  height: number
}

/**
 * Calculates uniform scale factor to fit a fixed-size canvas within the viewport.
 * Based on reveal.js presentation scaling technique.
 */
export function useSlideScale({
  designWidth = 1920,
  designHeight = 1080,
  margin = 0,
  minScale = 0.2,
  maxScale = 2.0,
  mode = 'contain',
}: SlideScaleConfig = {}): SlideScaleResult {
  const [scale, setScale] = useState(1)

  useLayoutEffect(() => {
    const calculateScale = () => {
      const availableWidth = window.innerWidth * (1 - margin * 2)
      const availableHeight = window.innerHeight * (1 - margin * 2)

      const scaleX = availableWidth / designWidth
      const scaleY = availableHeight / designHeight

      // 'contain' = fit inside (letterbox), 'cover' = fill completely (may crop)
      const newScale = mode === 'cover' ? Math.max(scaleX, scaleY) : Math.min(scaleX, scaleY)

      // Clamp to min/max bounds
      setScale(Math.max(minScale, Math.min(maxScale, newScale)))
    }

    calculateScale()

    window.addEventListener('resize', calculateScale)
    return () => window.removeEventListener('resize', calculateScale)
  }, [designWidth, designHeight, margin, minScale, maxScale, mode])

  return {
    scale,
    width: designWidth,
    height: designHeight,
  }
}
