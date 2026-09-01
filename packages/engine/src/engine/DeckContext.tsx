import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { silkCircuit, type Theme } from '../theme/tokens'
import { type ActDef, type ResolvedSlideDef, resolveSlide, type SlideDef } from '../types'

interface NavState {
  slideIndex: number
  beat: number
  direction: number
}

export interface DeckContextValue extends NavState {
  slides: readonly ResolvedSlideDef[]
  acts: readonly ActDef[]
  theme: Theme
  totalSlides: number
  denyMode: boolean
  autoplaySignal: number
  next: () => void
  prev: () => void
  nextSlide: () => void
  prevSlide: () => void
  goToSlide: (index: number) => void
  toggleDeny: () => void
  fireAutoplay: () => void
}

const DeckContext = createContext<DeckContextValue | null>(null)

/**
 * Internal composition surface for engine shells that source their state
 * from somewhere other than DeckProvider (the presenter window, print
 * rendering). Deck authors use DeckProvider.
 */
export { DeckContext }

const noop = () => {}

export interface StaticDeckProviderProps {
  slides: readonly SlideDef[]
  acts?: readonly ActDef[] | undefined
  theme?: Theme | undefined
  slideIndex: number
  beat: number
  denyMode?: boolean | undefined
  children: ReactNode
}

/**
 * A frozen deck context: fixed position, inert actions. Backs previews and
 * print rendering, where slides must render at a position without owning
 * navigation.
 */
export function StaticDeckProvider({
  slides: defs,
  acts,
  theme = silkCircuit,
  slideIndex,
  beat,
  denyMode = false,
  children,
}: StaticDeckProviderProps) {
  const slides = useMemo(() => defs.map(resolveSlide), [defs])
  const resolvedActs = useMemo(() => acts ?? deriveActs(slides, theme), [acts, slides, theme])
  const value = useMemo<DeckContextValue>(
    () => ({
      slideIndex,
      beat,
      direction: 0,
      slides,
      acts: resolvedActs,
      theme,
      totalSlides: slides.length,
      denyMode,
      autoplaySignal: 0,
      next: noop,
      prev: noop,
      nextSlide: noop,
      prevSlide: noop,
      goToSlide: noop,
      toggleDeny: noop,
      fireAutoplay: noop,
    }),
    [slideIndex, beat, slides, resolvedActs, theme, denyMode]
  )
  return <DeckContext.Provider value={value}>{children}</DeckContext.Provider>
}

function parseHash(slides: readonly ResolvedSlideDef[]): NavState {
  if (typeof window === 'undefined' || slides.length === 0) {
    return { slideIndex: 0, beat: 0, direction: 0 }
  }
  const match = /^(\d+)(?:\.(\d+))?$/.exec(window.location.hash.slice(1))
  if (!match?.[1]) return { slideIndex: 0, beat: 0, direction: 0 }
  const slideIndex = Math.min(Math.max(Number.parseInt(match[1], 10) - 1, 0), slides.length - 1)
  const maxBeat = (slides[slideIndex]?.beats ?? 1) - 1
  const beat = match[2] ? Math.min(Number.parseInt(match[2], 10), maxBeat) : 0
  return { slideIndex, beat, direction: 0 }
}

function formatHash({ slideIndex, beat }: NavState): string {
  return beat > 0 ? `${slideIndex + 1}.${beat}` : `${slideIndex + 1}`
}

function deriveActs(slides: readonly ResolvedSlideDef[], theme: Theme): ActDef[] {
  const palette = [
    theme.colors.electricPurple,
    theme.colors.neonCyan,
    theme.colors.coral,
    theme.colors.electricYellow,
    theme.colors.successGreen,
    theme.colors.errorRed,
  ]
  const numbers = [...new Set(slides.map((slide) => slide.act))].sort((a, b) => a - b)
  return numbers.map((number, index) => ({
    number,
    title: `act ${number}`,
    color: palette[index % palette.length] ?? theme.colors.electricPurple,
  }))
}

export interface DeckProviderProps {
  slides: readonly SlideDef[]
  /** Act labels/colors for the rail and grid; derived from slides when omitted */
  acts?: readonly ActDef[] | undefined
  theme?: Theme | undefined
  /** Mirror position into location.hash; disable when embedding the deck in a host page */
  hashSync?: boolean | undefined
  children: ReactNode
}

export function DeckProvider({
  slides: defs,
  acts,
  theme = silkCircuit,
  hashSync = true,
  children,
}: DeckProviderProps) {
  const slides = useMemo(() => defs.map(resolveSlide), [defs])
  const resolvedActs = useMemo(() => acts ?? deriveActs(slides, theme), [acts, slides, theme])

  const [nav, setNav] = useState<NavState>(() =>
    hashSync ? parseHash(slides) : { slideIndex: 0, beat: 0, direction: 0 }
  )
  const [denyMode, setDenyMode] = useState(false)
  const [autoplaySignal, setAutoplaySignal] = useState(0)

  // URL hash mirrors position so refresh resumes mid-deck. replaceState
  // keeps that without pushing a history entry per beat — the browser
  // Back button must leave the page, not unwind the whole talk.
  useEffect(() => {
    if (!hashSync || slides.length === 0) return
    const hash = formatHash(nav)
    if (window.location.hash.slice(1) !== hash) {
      // Carry history.state so a host page's router/scroll state survives.
      history.replaceState(history.state, '', `#${hash}`)
    }
  }, [nav, slides.length, hashSync])

  useEffect(() => {
    setNav((current) => {
      if (slides.length === 0) {
        return current.slideIndex === 0 && current.beat === 0
          ? current
          : { slideIndex: 0, beat: 0, direction: -1 }
      }

      const slideIndex = Math.min(current.slideIndex, slides.length - 1)
      const beat = Math.min(current.beat, (slides[slideIndex]?.beats ?? 1) - 1)
      return slideIndex === current.slideIndex && beat === current.beat
        ? current
        : { slideIndex, beat, direction: -1 }
    })
  }, [slides])

  useEffect(() => {
    if (!hashSync) return
    const handleHashChange = () => {
      const parsed = parseHash(slides)
      // A hand-typed hash that parses beyond the deck clamps; rewrite the
      // URL to the position actually shown so refresh stays truthful.
      const canonical = formatHash(parsed)
      if (window.location.hash.slice(1) !== canonical) {
        history.replaceState(history.state, '', `#${canonical}`)
      }
      setNav((prev) => {
        if (parsed.slideIndex === prev.slideIndex && parsed.beat === prev.beat) return prev
        return { ...parsed, direction: parsed.slideIndex >= prev.slideIndex ? 1 : -1 }
      })
    }
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [slides, hashSync])

  // Deny-variant is a per-slide mode
  // biome-ignore lint/correctness/useExhaustiveDependencies: reset keyed on slide change
  useEffect(() => {
    setDenyMode(false)
  }, [nav.slideIndex])

  const next = useCallback(() => {
    setNav((prev) => {
      const def = slides[prev.slideIndex]
      if (def && prev.beat < def.beats - 1) {
        return { ...prev, beat: prev.beat + 1, direction: 1 }
      }
      if (prev.slideIndex < slides.length - 1) {
        return { slideIndex: prev.slideIndex + 1, beat: 0, direction: 1 }
      }
      return prev
    })
  }, [slides])

  const prev = useCallback(() => {
    setNav((current) => {
      if (current.beat > 0) {
        return { ...current, beat: current.beat - 1, direction: -1 }
      }
      if (current.slideIndex > 0) {
        const target = current.slideIndex - 1
        // Land on the previous slide fully revealed
        return { slideIndex: target, beat: (slides[target]?.beats ?? 1) - 1, direction: -1 }
      }
      return current
    })
  }, [slides])

  const goToSlide = useCallback(
    (index: number) => {
      if (slides.length === 0) return
      const clamped = Math.max(0, Math.min(index, slides.length - 1))
      setNav((current) => ({
        slideIndex: clamped,
        beat: 0,
        direction: clamped >= current.slideIndex ? 1 : -1,
      }))
    },
    [slides]
  )

  const nextSlide = useCallback(() => {
    setNav((current) =>
      current.slideIndex < slides.length - 1
        ? { slideIndex: current.slideIndex + 1, beat: 0, direction: 1 }
        : current
    )
  }, [slides])

  const prevSlide = useCallback(() => {
    setNav((current) =>
      current.slideIndex > 0
        ? { slideIndex: current.slideIndex - 1, beat: 0, direction: -1 }
        : current
    )
  }, [])

  const toggleDeny = useCallback(() => setDenyMode((current) => !current), [])
  const fireAutoplay = useCallback(() => setAutoplaySignal((current) => current + 1), [])

  const value = useMemo<DeckContextValue>(
    () => ({
      ...nav,
      slides,
      acts: resolvedActs,
      theme,
      totalSlides: slides.length,
      denyMode,
      autoplaySignal,
      next,
      prev,
      nextSlide,
      prevSlide,
      goToSlide,
      toggleDeny,
      fireAutoplay,
    }),
    [
      nav,
      slides,
      resolvedActs,
      theme,
      denyMode,
      autoplaySignal,
      next,
      prev,
      nextSlide,
      prevSlide,
      goToSlide,
      toggleDeny,
      fireAutoplay,
    ]
  )

  return <DeckContext.Provider value={value}>{children}</DeckContext.Provider>
}

export function useDeck(): DeckContextValue {
  const context = useContext(DeckContext)
  if (!context) {
    throw new Error('useDeck must be used within a DeckProvider')
  }
  return context
}

/** Current in-slide beat (0-indexed) */
export function useBeat(): number {
  return useDeck().beat
}

/** Whether the `d` deny-variant is active on the current slide */
export function useDenyMode(): boolean {
  return useDeck().denyMode
}

/** The active theme, as provided to DeckProvider */
export function useDeckTheme(): Theme {
  return useDeck().theme
}
