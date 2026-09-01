import { AnimatePresence, MotionConfig } from 'motion/react'
import { type ReactNode, useCallback, useState } from 'react'
import { GridOverview } from '../chrome/GridOverview'
import { ProgressRail } from '../chrome/ProgressRail'
import { RolloutBadge } from '../chrome/RolloutBadge'
import { ShortcutHelp } from '../chrome/ShortcutHelp'
import { SpeakerNotes } from '../chrome/SpeakerNotes'
import { useFullscreen } from '../hooks/useFullscreen'
import { useSlideScale } from '../hooks/useSlideScale'
import { useTouchNavigation } from '../hooks/useTouchNavigation'
import type { Theme } from '../theme/tokens'
import { themeToCssVars } from '../theme/tokens'
import type { ActDef, SlideDef } from '../types'
import { SlideWidgetProvider, useSlideWidgets } from '../widgets/registry'
import { BeatAudit } from './BeatAudit'
import { DeckProvider, useDeck } from './DeckContext'
import { SlideContainer } from './SlideContainer'
import { useKeyboardShortcuts } from './useKeyboardShortcuts'

export interface DeckProps {
  slides: readonly SlideDef[]
  acts?: readonly ActDef[] | undefined
  theme?: Theme | undefined
  /** Mirror position into location.hash; disable when embedding the deck in a host page */
  hashSync?: boolean | undefined
  /** Design canvas dimensions; 16:9 projector default */
  designWidth?: number | undefined
  designHeight?: number | undefined
  /** Scale clamp for extreme viewports; defaults 0.2 and 2 */
  minScale?: number | undefined
  maxScale?: number | undefined
  /** Extra presenter chrome rendered outside the scaled canvas */
  extraChrome?: ReactNode | undefined
  showProgressRail?: boolean | undefined
  showScanlines?: boolean | undefined
}

function DeckShell({
  designWidth,
  designHeight,
  minScale,
  maxScale,
  extraChrome,
  showProgressRail,
  showScanlines,
}: Required<
  Pick<DeckProps, 'designWidth' | 'designHeight' | 'showProgressRail' | 'showScanlines'>
> &
  Pick<DeckProps, 'extraChrome' | 'minScale' | 'maxScale'>) {
  const { slideIndex, direction, next, prev, slides, theme } = useDeck()
  const { startNextWidget } = useSlideWidgets()
  // Grid and help are exclusive modals (one aria-modal surface at a time);
  // notes is a pinned panel a presenter keeps open across the whole talk.
  const [modal, setModal] = useState<'grid' | 'help' | null>(null)
  const [notesOpen, setNotesOpen] = useState(false)
  const { toggleFullscreen, exitFullscreen, isFullscreen } = useFullscreen()
  const { scale, width, height } = useSlideScale({ designWidth, designHeight, minScale, maxScale })

  const toggleModal = useCallback((which: 'grid' | 'help') => {
    setModal((current) => (current === which ? null : which))
  }, [])

  const handleEscape = useCallback((): boolean => {
    if (modal) {
      setModal(null)
      return true
    }
    if (notesOpen) {
      setNotesOpen(false)
      return true
    }
    if (isFullscreen) {
      exitFullscreen()
      return true
    }
    return false
  }, [modal, notesOpen, isFullscreen, exitFullscreen])

  useKeyboardShortcuts({
    onToggleFullscreen: toggleFullscreen,
    onToggleNotes: () => setNotesOpen((open) => !open),
    onToggleGrid: () => toggleModal('grid'),
    onToggleHelp: () => toggleModal('help'),
    onEscape: handleEscape,
    modalOpen: modal !== null,
    onAdvanceIntercept: startNextWidget,
  })

  const advance = useCallback(() => {
    if (!startNextWidget()) next()
  }, [next, startNextWidget])

  const overlayOpen = modal !== null || notesOpen

  // The overlays own the screen while open: a tap that closes the grid
  // must not also step the deck behind it.
  useTouchNavigation({
    onNext: advance,
    onPrev: prev,
    enabled: !overlayOpen,
  })

  const def = slides[slideIndex]
  if (!def) {
    return (
      <div className="slide-viewport prezzer-empty-deck" style={themeToCssVars(theme)}>
        add your first slide to begin
      </div>
    )
  }
  const SlideComponent = def.component

  return (
    <div className="slide-viewport" style={themeToCssVars(theme)}>
      <div
        className="slide-canvas-wrapper"
        aria-hidden={overlayOpen}
        inert={overlayOpen || undefined}
        style={{
          width: `${width * scale}px`,
          height: `${height * scale}px`,
        }}
      >
        <div
          className="slide-canvas"
          style={{
            width: `${width}px`,
            height: `${height}px`,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
          }}
        >
          {showScanlines && <div className="scanlines" />}

          <AnimatePresence mode="wait" custom={direction}>
            <SlideContainer
              key={slideIndex}
              direction={direction}
              title={def.title}
              transition={def.transition}
            >
              <BeatAudit key={def.id} id={def.id} beats={def.beats}>
                <SlideComponent />
              </BeatAudit>
            </SlideContainer>
          </AnimatePresence>

          {def.badge && <RolloutBadge status={def.badge} />}
          {showProgressRail && <ProgressRail />}
        </div>
      </div>

      <AnimatePresence>{notesOpen && <SpeakerNotes />}</AnimatePresence>
      {/* One AnimatePresence with mode="wait" so a modal swap finishes the
          old dialog's exit before the replacement mounts — two aria-modal
          surfaces must never coexist. */}
      <AnimatePresence mode="wait">
        {modal === 'grid' && <GridOverview key="grid" onClose={() => setModal(null)} />}
        {modal === 'help' && <ShortcutHelp key="help" onClose={() => setModal(null)} />}
      </AnimatePresence>

      {/* Announces slide changes to screen readers; beats stay quiet. */}
      <div aria-live="polite" className="prezzer-sr-only">
        {`Slide ${slideIndex + 1} of ${slides.length}: ${def.title}`}
      </div>

      {extraChrome}
    </div>
  )
}

/**
 * Batteries-included deck shell: provider, scaled 16:9 canvas, keyboard and
 * touch nav, notes/grid overlays, badges, progress rail, and the imperative
 * widget registry. A deck is `<Deck slides={slides} acts={acts} />` plus its
 * slide components; compose DeckProvider and the pieces manually only when
 * the shell's layout doesn't fit.
 */
export function Deck({
  slides,
  acts,
  theme,
  hashSync,
  designWidth = 1920,
  designHeight = 1080,
  minScale,
  maxScale,
  extraChrome,
  showProgressRail = true,
  showScanlines = true,
}: DeckProps) {
  return (
    <MotionConfig reducedMotion="user">
      <DeckProvider slides={slides} acts={acts} theme={theme} hashSync={hashSync}>
        <SlideWidgetProvider>
          <DeckShell
            designWidth={designWidth}
            designHeight={designHeight}
            minScale={minScale}
            maxScale={maxScale}
            extraChrome={extraChrome}
            showProgressRail={showProgressRail}
            showScanlines={showScanlines}
          />
        </SlideWidgetProvider>
      </DeckProvider>
    </MotionConfig>
  )
}
