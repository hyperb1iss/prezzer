import { useEffect, useMemo, useState } from 'react'
import { silkCircuit, type Theme, themeToCssVars, withAlpha } from '../theme/tokens'
import { type ActDef, resolveSlide, type SlideDef } from '../types'
import { SlideWidgetProvider } from '../widgets/registry'
import { DeckContext, type DeckContextValue, StaticDeckProvider } from './DeckContext'
import {
  isPresenterMessage,
  type PresenterMessage,
  type PresenterNavState,
} from './presenterBridge'
import { useKeyboardShortcuts } from './useKeyboardShortcuts'

export interface PresenterViewProps {
  slides: readonly SlideDef[]
  acts?: readonly ActDef[] | undefined
  theme?: Theme | undefined
}

const previewWidth = 480
const designWidth = 1920
const designHeight = 1080

function SlidePreview({
  slides,
  acts,
  theme,
  index,
  beat,
  denyMode,
  label,
}: {
  slides: readonly SlideDef[]
  acts: readonly ActDef[] | undefined
  theme: Theme
  index: number
  beat: number
  denyMode: boolean
  label: string
}) {
  const def = slides[index]
  const scale = previewWidth / designWidth

  return (
    <div className="prezzer-presenter-preview">
      <span className="prezzer-presenter-label" style={{ color: theme.colors.textMuted }}>
        {label}
      </span>
      <div
        className="prezzer-presenter-frame"
        aria-hidden="true"
        inert
        style={{
          width: `${previewWidth}px`,
          height: `${previewWidth * (designHeight / designWidth)}px`,
          borderColor: withAlpha(theme.colors.electricPurple, 0.27),
          backgroundColor: theme.colors.deepBlack,
        }}
      >
        {def ? (
          <div
            className="prezzer-presenter-frame-canvas"
            style={{
              width: `${designWidth}px`,
              height: `${designHeight}px`,
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
            }}
          >
            <StaticDeckProvider
              slides={slides}
              acts={acts}
              theme={theme}
              slideIndex={index}
              beat={beat}
              denyMode={denyMode}
            >
              <SlideWidgetProvider>
                <def.component />
              </SlideWidgetProvider>
            </StaticDeckProvider>
          </div>
        ) : (
          <div className="prezzer-presenter-frame-end" style={{ color: theme.colors.textMuted }}>
            end of deck
          </div>
        )}
      </div>
    </div>
  )
}

function formatElapsed(ms: number): string {
  const total = Math.floor(ms / 1000)
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const seconds = total % 60
  const mm = String(minutes).padStart(2, '0')
  const ss = String(seconds).padStart(2, '0')
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`
}

/**
 * The second-window presenter console: the same artifact opened with
 * `?presenter` renders this instead of the deck shell. Navigation state
 * streams in from the audience window; every key a presenter presses is
 * forwarded there as a command, so both windows stay in lockstep with the
 * audience window owning the truth.
 */
export function PresenterView({ slides: defs, acts, theme = silkCircuit }: PresenterViewProps) {
  const slides = useMemo(() => defs.map(resolveSlide), [defs])
  const [nav, setNav] = useState<PresenterNavState>({ slideIndex: 0, beat: 0, direction: 0 })
  const [denyMode, setDenyMode] = useState(false)
  const [connected, setConnected] = useState(false)
  const [startedAt, setStartedAt] = useState(() => Date.now())
  const [now, setNow] = useState(() => Date.now())

  const audience = typeof window !== 'undefined' ? window.opener : null

  // Introduce this window on a steady heartbeat, not just until first
  // sync: a reloaded audience window forgets its adopted presenter, and
  // the next hello re-adopts this one within two seconds.
  useEffect(() => {
    if (!audience) return
    const hello = () => {
      if (!audience.closed) audience.postMessage({ prezzer: 'hello' }, '*')
    }
    hello()
    const interval = setInterval(hello, 2000)
    return () => clearInterval(interval)
  }, [audience])

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.source !== audience || !isPresenterMessage(event.data)) return
      const message = event.data
      if (message.prezzer === 'state') {
        setNav(message.nav)
        setDenyMode(message.denyMode)
        setConnected(true)
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [audience])

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])

  const post = useMemo(() => {
    return (message: PresenterMessage) => {
      if (audience && !audience.closed) audience.postMessage(message, '*')
    }
  }, [audience])

  // A deck context whose actions dispatch to the audience window, so the
  // standard keyboard hook drives the remote deck unchanged.
  const value = useMemo<DeckContextValue>(
    () => ({
      ...nav,
      slides,
      acts: acts ?? [],
      theme,
      totalSlides: slides.length,
      denyMode,
      autoplaySignal: 0,
      next: () => post({ prezzer: 'command', action: 'next' }),
      prev: () => post({ prezzer: 'command', action: 'prev' }),
      nextSlide: () => post({ prezzer: 'command', action: 'nextSlide' }),
      prevSlide: () => post({ prezzer: 'command', action: 'prevSlide' }),
      goToSlide: (index: number) => post({ prezzer: 'command', action: 'goToSlide', index }),
      toggleDeny: () => post({ prezzer: 'command', action: 'toggleDeny' }),
      fireAutoplay: () => post({ prezzer: 'command', action: 'fireAutoplay' }),
    }),
    [nav, slides, acts, theme, denyMode, post]
  )

  const current = slides[nav.slideIndex]
  const upcoming = slides[nav.slideIndex + 1]

  return (
    <DeckContext.Provider value={value}>
      <PresenterKeys />
      <div className="prezzer-presenter" style={themeToCssVars(theme)}>
        <header className="prezzer-presenter-header">
          <span style={{ color: theme.colors.electricPurple }}>presenter</span>
          <span
            className="prezzer-presenter-connection"
            style={{ color: connected ? theme.colors.successGreen : theme.colors.errorRed }}
          >
            {connected ? '● synced' : '○ waiting for the deck window'}
          </span>
          <span style={{ color: theme.colors.textPrimary }}>
            {slides.length === 0 ? 'empty deck' : `slide ${nav.slideIndex + 1}/${slides.length}`}
            {current && current.beats > 1 && ` · beat ${nav.beat + 1}/${current.beats}`}
            {denyMode && ' · DENY'}
          </span>
          <button
            type="button"
            className="prezzer-presenter-timer"
            style={{ color: theme.colors.coral }}
            onClick={(event) => {
              setStartedAt(Date.now())
              // Keep the spacebar with the deck, not the focused button.
              event.currentTarget.blur()
            }}
            title="click to reset"
          >
            {formatElapsed(now - startedAt)}
          </button>
          <span style={{ color: theme.colors.textMuted }}>
            {new Date(now).toLocaleTimeString()}
          </span>
        </header>

        <div className="prezzer-presenter-body">
          <section className="prezzer-presenter-notes" aria-label="Speaker notes">
            <h1 style={{ color: theme.colors.textPrimary }}>
              {current ? current.title : 'end of deck'}
              {current?.deep && ' ▽'}
            </h1>
            <ul>
              {(current?.notes ?? []).map((note) => (
                <li key={note} style={{ color: withAlpha(theme.colors.textPrimary, 0.85) }}>
                  <span style={{ color: theme.colors.neonCyan }}>▸ </span>
                  {note}
                </li>
              ))}
              {current && current.notes.length === 0 && (
                <li style={{ color: theme.colors.textMuted }}>no notes for this slide</li>
              )}
            </ul>
            {upcoming && (
              <p className="prezzer-presenter-next-title" style={{ color: theme.colors.textMuted }}>
                next: <span style={{ color: theme.colors.neonCyan }}>{upcoming.title}</span>
              </p>
            )}
          </section>

          <aside className="prezzer-presenter-previews">
            <SlidePreview
              slides={slides}
              acts={acts}
              theme={theme}
              index={nav.slideIndex}
              beat={nav.beat}
              denyMode={denyMode}
              label="current"
            />
            <SlidePreview
              slides={slides}
              acts={acts}
              theme={theme}
              index={nav.slideIndex + 1}
              beat={0}
              denyMode={false}
              label="next"
            />
          </aside>
        </div>

        <footer className="prezzer-presenter-footer" style={{ color: theme.colors.textMuted }}>
          space advances the deck · arrows step · shift skips slides · d deny · click the timer to
          reset it
        </footer>
      </div>
    </DeckContext.Provider>
  )
}

/** Forwards the standard deck keys as remote commands via the context. */
function PresenterKeys() {
  useKeyboardShortcuts({})
  return null
}
