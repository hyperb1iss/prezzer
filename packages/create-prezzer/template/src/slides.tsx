import { type ActDef, Beat, type SlideDef, useDeckTheme } from 'prezzer'
import { SlideHeader, Starfield } from 'prezzer/chrome'

function TitleSlide() {
  const theme = useDeckTheme()
  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center text-center">
      <Starfield count={48} />
      <p
        className="mb-4 font-mono text-xl tracking-[0.3em] uppercase"
        style={{ color: theme.colors.neonCyan }}
      >
        hello, world
      </p>
      <h1
        className="font-display text-9xl font-bold tracking-tight"
        style={{ color: theme.colors.textPrimary, textShadow: theme.glow.purple }}
      >
        make it <span style={{ color: theme.colors.electricPurple }}>sing</span>
      </h1>
      <p className="mt-6 font-mono text-2xl" style={{ color: theme.colors.textMuted }}>
        space to begin
      </p>
    </div>
  )
}

function BeatSlide() {
  const theme = useDeckTheme()
  return (
    <div className="relative h-full w-full px-24 py-20">
      <SlideHeader act={1} title="one idea, three beats" creeds={['SHOW THE CHANGE']} />
      <div className="space-y-8 font-body text-4xl" style={{ color: theme.colors.textPrimary }}>
        <p>start with the shape of the idea.</p>
        <Beat at={1}>
          <p style={{ color: theme.colors.neonCyan }}>reveal the part that changes the room.</p>
        </Beat>
        <Beat at={2}>
          <p style={{ color: theme.colors.coral }}>land the point, then move.</p>
        </Beat>
      </div>
    </div>
  )
}

function FinalSlide() {
  const theme = useDeckTheme()
  return (
    <div className="flex h-full w-full items-center justify-center text-center">
      <div>
        <p
          className="font-mono text-xl uppercase tracking-[0.3em]"
          style={{ color: theme.colors.coral }}
        >
          your turn
        </p>
        <h2
          className="mt-6 font-display text-8xl font-bold"
          style={{ color: theme.colors.textPrimary }}
        >
          build something electric.
        </h2>
      </div>
    </div>
  )
}

export const acts: ActDef[] = [
  { number: 0, title: 'hello', color: '#e135ff' },
  { number: 1, title: 'idea', color: '#80ffea' },
  { number: 2, title: 'go', color: '#ff6ac1' },
]

export const slides: SlideDef[] = [
  {
    id: 'S1',
    title: 'make it sing',
    act: 0,
    transition: 'zoom',
    notes: ['welcome everyone', 'say why this story matters now'],
    component: TitleSlide,
  },
  {
    id: 'S2',
    title: 'one idea, three beats',
    act: 1,
    beats: 3,
    transition: 'rise',
    notes: ['space advances one beat at a time', 'keep each reveal load-bearing'],
    component: BeatSlide,
  },
  {
    id: 'S3',
    title: 'build something electric',
    act: 2,
    transition: 'portal',
    notes: ['finish on the invitation'],
    component: FinalSlide,
  },
]
