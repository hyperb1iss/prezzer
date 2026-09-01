import { RolloutBadge } from '../chrome/RolloutBadge'
import { silkCircuit, type Theme, themeToCssVars, withAlpha } from '../theme/tokens'
import { type ActDef, resolveSlide, type SlideDef } from '../types'
import { SlideWidgetProvider } from '../widgets/registry'
import { StaticDeckProvider } from './DeckContext'

export interface PrintViewProps {
  slides: readonly SlideDef[]
  acts?: readonly ActDef[] | undefined
  theme?: Theme | undefined
}

export function isPrintWindow(): boolean {
  return typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('print')
}

/**
 * `?print` renders every slide fully revealed as one 16:9 page each, sized
 * to the design canvas with @page rules to match — the browser's own print
 * dialog becomes the PDF exporter, no headless dependency required. The
 * deck's scaled-transform canvas makes normal printing useless, which is
 * why this is a separate render rather than print CSS on the shell.
 */
export function PrintView({ slides: defs, acts, theme = silkCircuit }: PrintViewProps) {
  const slides = defs.map(resolveSlide)

  return (
    <div className="prezzer-print" style={themeToCssVars(theme)}>
      <p
        className="prezzer-print-hint"
        style={{
          color: theme.colors.textMuted,
          borderColor: withAlpha(theme.colors.electricPurple, 0.27),
        }}
      >
        print or save as PDF from the browser (⌘P) — every slide is one 16:9 page, fully revealed.
        Drop <code>?print</code> from the URL to present.
      </p>
      {slides.map((def, index) => (
        <section
          key={def.id}
          className="prezzer-print-page"
          aria-label={def.title}
          style={{ backgroundColor: theme.colors.background }}
        >
          <StaticDeckProvider
            slides={slides}
            acts={acts}
            theme={theme}
            slideIndex={index}
            beat={def.beats - 1}
          >
            <SlideWidgetProvider>
              <def.component />
              {def.badge && <RolloutBadge status={def.badge} />}
            </SlideWidgetProvider>
          </StaticDeckProvider>
        </section>
      ))}
    </div>
  )
}
