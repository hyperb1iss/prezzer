import { motion } from 'motion/react'
import {
  type ActDef,
  Beat,
  type SlideDef,
  staggerContainer,
  staggerItem,
  useBeat,
  useDeckTheme,
  useDenyMode,
} from 'prezzer'
import { SlideHeader, Starfield, StatRail } from 'prezzer/chrome'
import { type DeckWidgetHandle, useWidgetRegistration } from 'prezzer/widgets'
import { type ReactNode, useEffect, useImperativeHandle, useRef, useState } from 'react'

function Title() {
  const theme = useDeckTheme()
  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center">
      <Starfield count={64} />
      <h1
        className="font-display text-[220px] font-bold leading-none tracking-tight"
        style={{ color: theme.colors.textPrimary, textShadow: theme.glow.purple }}
      >
        pre<span style={{ color: theme.colors.electricPurple }}>zz</span>er
      </h1>
      <p className="mt-8 font-body text-4xl" style={{ color: theme.colors.textMuted }}>
        cinematic presentations as code
      </p>
      <p className="mt-16 font-mono text-2xl" style={{ color: theme.colors.textMuted }}>
        space to advance · g grid · n notes · d deny · f fullscreen
      </p>
    </div>
  )
}

function Pitch() {
  const theme = useDeckTheme()
  return (
    <div className="relative h-full w-full px-24 py-20">
      <SlideHeader act={0} title="the pitch" creeds={['DECKS ARE SOFTWARE']} />
      <div
        className="mt-6 space-y-10 font-body text-5xl"
        style={{ color: theme.colors.textPrimary }}
      >
        <p>we don't use powerpoint anymore.</p>
        <Beat at={1}>
          <p style={{ color: theme.colors.textMuted }}>or google slides. or keynote.</p>
        </Beat>
        <Beat at={2}>
          <p>
            every talk is a <span style={{ color: theme.colors.neonCyan }}>react app</span> now —
            slides are components, reveals are beats.
          </p>
        </Beat>
        <Beat at={3}>
          <p>
            and the whole thing bakes into{' '}
            <span style={{ color: theme.colors.coral, textShadow: theme.glow.coral }}>
              one offline HTML file
            </span>
            .
          </p>
        </Beat>
      </div>
      <StatRail
        stats={[
          { value: '1', label: 'html file' },
          { value: '0', label: 'cloud' },
        ]}
      />
    </div>
  )
}

function CodeChunk({ lit, children }: { lit: boolean; children: ReactNode }) {
  return (
    <motion.div
      animate={{ opacity: lit ? 1 : 0.25 }}
      transition={{ duration: 0.3 }}
      className="whitespace-pre font-mono text-[26px] leading-relaxed"
    >
      {children}
    </motion.div>
  )
}

function SlidesAreComponents() {
  const theme = useDeckTheme()
  const beat = useBeat()
  const kw = { color: theme.colors.electricPurple }
  const tag = { color: theme.colors.neonCyan }
  const val = { color: theme.colors.coral }
  const body = { color: theme.colors.textPrimary }
  const allLit = beat === 0
  return (
    <div className="relative h-full w-full px-24 py-20">
      <SlideHeader act={1} title="slides are components" creeds={['ONE IDEA PER SLIDE']} />
      <div
        className="mt-4 rounded-xl border px-14 py-10"
        style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.gridLine }}
      >
        <div style={body}>
          <CodeChunk lit={allLit || beat === 1}>
            <div>
              <span style={kw}>function</span> Thesis() {'{'}
            </div>
            <div>
              {'  '}
              <span style={kw}>return</span> (
            </div>
            <div>
              {'    '}
              <span style={tag}>{'<main>'}</span>
            </div>
            <div>
              {'      '}
              <span style={tag}>{'<h1>'}</span>context is the product
              <span style={tag}>{'</h1>'}</span>
            </div>
            <div>
              {'      '}
              <span style={tag}>{'<Beat'}</span> at={'{'}
              <span style={val}>1</span>
              {'}'}
              <span style={tag}>{'>'}</span>the reveal lands on your cue.
              <span style={tag}>{'</Beat>'}</span>
            </div>
            <div>
              {'    '}
              <span style={tag}>{'</main>'}</span>
            </div>
            <div>{'  )'}</div>
            <div>{'}'}</div>
          </CodeChunk>
          <CodeChunk lit={allLit || beat === 2}>
            <div>&nbsp;</div>
            <div>
              <span style={kw}>const</span> slides: <span style={tag}>SlideDef</span>[] = [
            </div>
            <div>
              {'  '}
              {'{'} id: <span style={val}>'S1'</span>, title: <span style={val}>'the thesis'</span>,
              beats: <span style={val}>2</span>, component: Thesis {'}'},
            </div>
            <div>]</div>
          </CodeChunk>
          <CodeChunk lit={allLit || beat === 3}>
            <div>&nbsp;</div>
            <div>
              <span style={kw}>export function</span> Talk() {'{'}
            </div>
            <div>
              {'  '}
              <span style={kw}>return</span> <span style={tag}>{'<Deck'}</span> slides={'{'}slides
              {'}'} <span style={tag}>{'/>'}</span>
            </div>
            <div>{'}'}</div>
          </CodeChunk>
        </div>
      </div>
      <p className="mt-8 font-mono text-xl" style={{ color: theme.colors.textMuted }}>
        {allLit
          ? 'a full deck. space walks through it.'
          : beat === 1
            ? 'a slide is a component; <Beat> gates the reveal.'
            : beat === 2
              ? 'the registry is the deck order — ids, titles, beat counts, notes.'
              : 'mount <Deck> and present. that is the entire integration.'}
      </p>
    </div>
  )
}

function Beats() {
  const theme = useDeckTheme()
  return (
    <div className="relative h-full w-full px-24 py-20">
      <SlideHeader act={1} title="beats" tag="state machines" />
      <div
        className="mt-6 space-y-10 font-body text-5xl"
        style={{ color: theme.colors.textPrimary }}
      >
        <p>a slide is a little state machine.</p>
        <Beat at={1}>
          <p>
            each press of <span style={{ color: theme.colors.neonCyan }}>space</span> advances one
            beat…
          </p>
        </Beat>
        <Beat at={2}>
          <p>
            …and the URL hash tracks it — <span className="font-mono">#4.2</span> — so refresh
            resumes exactly here.
          </p>
        </Beat>
        <Beat at={3}>
          <p style={{ color: theme.colors.textMuted }}>
            backing up re-hides. unrevealed content stays out of the accessibility tree.
          </p>
        </Beat>
      </div>
      <StatRail
        stats={[
          { value: '4', label: 'beats' },
          { value: '#4.2', label: 'deep link' },
        ]}
      />
    </div>
  )
}

const bakeLines = [
  { text: '$ prezzer build', tone: 'muted' },
  { text: 'prezzer baking index.html', tone: 'body' },
  { text: '✓ dist/index.html · one file, works offline', tone: 'green' },
] as const

function BakeReplay() {
  const theme = useDeckTheme()
  const ref = useWidgetRegistration()
  const [running, setRunning] = useState(false)
  const [visible, setVisible] = useState(0)
  const startedRef = useRef(false)

  useImperativeHandle(ref, (): DeckWidgetHandle => {
    return {
      start: () => {
        startedRef.current = true
        setRunning(true)
      },
      isStarted: () => startedRef.current,
    }
  }, [])

  useEffect(() => {
    if (!running || visible >= bakeLines.length) return
    const timer = setTimeout(() => setVisible((current) => current + 1), 700)
    return () => clearTimeout(timer)
  }, [running, visible])

  const done = visible >= bakeLines.length
  const tones = {
    muted: { color: theme.colors.textMuted },
    body: { color: theme.colors.textPrimary },
    green: { color: theme.colors.successGreen, textShadow: theme.glow.green },
  }
  return (
    <div className="w-full max-w-5xl">
      <div
        className="rounded-xl border px-12 py-10 font-mono text-3xl leading-loose"
        style={{
          backgroundColor: theme.colors.terminalBlack,
          borderColor: theme.colors.gridLine,
          minHeight: '260px',
        }}
      >
        {bakeLines.slice(0, visible).map((line) => (
          <motion.div
            key={line.text}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            style={tones[line.tone]}
          >
            {line.text}
          </motion.div>
        ))}
      </div>
      <p className="mt-6 text-center font-mono text-xl" style={{ color: theme.colors.textMuted }}>
        {done
          ? 'done — space now advances the deck'
          : running
            ? 'baking…'
            : 'press space: the widget claims it before the deck moves'}
      </p>
    </div>
  )
}

function Widgets() {
  return (
    <div className="relative flex h-full w-full flex-col px-24 py-20">
      <SlideHeader act={2} title="demos claim the spacebar" tag="push model" />
      <div className="flex flex-1 items-center justify-center">
        <BakeReplay />
      </div>
    </div>
  )
}

function Deny() {
  const theme = useDeckTheme()
  const denied = useDenyMode()
  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center gap-12">
      <SlideHeader act={2} title="the deny variant" tag="press d" />
      <motion.div
        animate={{
          color: denied ? theme.colors.errorRed : theme.colors.successGreen,
          textShadow: denied ? theme.glow.coral : theme.glow.green,
        }}
        className="font-display text-9xl font-bold"
      >
        {denied ? 'ACCESS DENIED' : 'ACCESS GRANTED'}
      </motion.div>
      <p
        className="max-w-4xl text-center font-body text-4xl"
        style={{ color: theme.colors.textMuted }}
      >
        every slide gets a free failure-path variant: the same widget, the unhappy path. rehearse it
        before it happens on stage.
      </p>
    </div>
  )
}

const transitionCatalog = [
  { name: 'morph', mood: 'dense content' },
  { name: 'slide', mood: 'sequential narration' },
  { name: 'zoom', mood: 'big reveals' },
  { name: 'portal', mood: 'new worlds' },
  { name: 'glitch', mood: 'failure modes' },
  { name: 'rise', mood: 'act openers' },
  { name: 'spiral', mood: 'playful pivots' },
  { name: 'split', mood: 'dramatic contrast' },
] as const

function Transitions() {
  const theme = useDeckTheme()
  return (
    <div className="relative h-full w-full px-24 py-20">
      <SlideHeader act={2} title="eight transitions" creeds={['CHOSEN PER SLIDE']} />
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="mt-10 grid grid-cols-4 gap-8"
      >
        {transitionCatalog.map((transition) => {
          const isThisOne = transition.name === 'spiral'
          return (
            <motion.div
              key={transition.name}
              variants={staggerItem}
              className="rounded-xl border px-8 py-10 text-center"
              style={{
                backgroundColor: theme.colors.surface,
                borderColor: isThisOne ? theme.colors.coral : theme.colors.gridLine,
                boxShadow: isThisOne ? theme.glow.coral : undefined,
              }}
            >
              <div
                className="font-mono text-4xl font-bold"
                style={{ color: theme.colors.neonCyan }}
              >
                {transition.name}
              </div>
              <div className="mt-3 font-body text-2xl" style={{ color: theme.colors.textMuted }}>
                {transition.mood}
              </div>
              {isThisOne && (
                <div className="mt-3 font-mono text-xl" style={{ color: theme.colors.coral }}>
                  ← this slide
                </div>
              )}
            </motion.div>
          )
        })}
      </motion.div>
    </div>
  )
}

function OneFile() {
  const theme = useDeckTheme()
  return (
    <div className="relative flex h-full w-full flex-col px-24 py-20">
      <SlideHeader act={3} title="one file, fully offline" />
      <div className="flex flex-1 flex-col items-center justify-center gap-10">
        <div
          className="font-mono text-8xl font-bold"
          style={{ color: theme.colors.electricPurple, textShadow: theme.glow.purple }}
        >
          dist/index.html
        </div>
        <div
          className="max-w-4xl space-y-8 text-center font-body text-4xl"
          style={{ color: theme.colors.textPrimary }}
        >
          <Beat at={1}>
            <p>markup, styles, scripts, images, fonts — baked in as data URIs.</p>
          </Beat>
          <Beat at={2}>
            <p style={{ color: theme.colors.textMuted }}>
              present from file://, attach it to an email, drop it on any static host.
            </p>
          </Beat>
          <Beat at={3}>
            <p style={{ color: theme.colors.coral, textShadow: theme.glow.coral }}>
              you're looking at it — this page is the baked artifact, deployed by CI.
            </p>
          </Beat>
        </div>
      </div>
      <StatRail
        stats={[
          { value: '1', label: 'file' },
          { value: '0', label: 'servers' },
          { value: '100%', label: 'offline' },
        ]}
      />
    </div>
  )
}

function AgentFastPath() {
  const theme = useDeckTheme()
  return (
    <div className="relative h-full w-full px-24 py-20">
      <SlideHeader act={3} title="the agent fast path" creeds={['SHAPE THE STORY']} />
      <div
        className="mt-6 space-y-12 font-body text-5xl"
        style={{ color: theme.colors.textPrimary }}
      >
        <p>
          you shape the story. <span style={{ color: theme.colors.neonCyan }}>your agent</span>{' '}
          builds the deck.
        </p>
        <Beat at={1}>
          <div
            className="inline-block rounded-xl border px-10 py-6 font-mono text-4xl"
            style={{
              backgroundColor: theme.colors.terminalBlack,
              borderColor: theme.colors.gridLine,
              color: theme.colors.neonCyan,
            }}
          >
            npx skills add hyperb1iss/prezzer
          </div>
        </Beat>
        <Beat at={2}>
          <p style={{ color: theme.colors.textMuted }}>
            one command teaches it the workflow, the API, and the gotchas already hit for you.
          </p>
        </Beat>
        <Beat at={3}>
          <p>
            this deck?{' '}
            <span style={{ color: theme.colors.electricPurple, textShadow: theme.glow.purple }}>
              built by an agent with that skill.
            </span>
          </p>
        </Beat>
      </div>
    </div>
  )
}

function Closing() {
  const theme = useDeckTheme()
  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center gap-12">
      <Starfield count={64} />
      <div
        className="font-mono text-7xl font-bold"
        style={{ color: theme.colors.neonCyan, textShadow: theme.glow.cyan }}
      >
        bun create prezzer my-talk
      </div>
      <div
        className="space-y-4 text-center font-body text-3xl"
        style={{ color: theme.colors.textMuted }}
      >
        <p>github.com/hyperb1iss/prezzer · MIT</p>
        <p>made with 💜 by @hyperb1iss</p>
      </div>
    </div>
  )
}

export const acts: ActDef[] = [
  { number: 0, title: 'the pitch', color: '#e135ff' },
  { number: 1, title: 'slides are code', color: '#80ffea' },
  { number: 2, title: 'present', color: '#ff6ac1' },
  { number: 3, title: 'the artifact', color: '#f1fa8c' },
]

export const slides: SlideDef[] = [
  {
    id: 'S1',
    title: 'prezzer',
    act: 0,
    transition: 'zoom',
    notes: ['this deck is the live demo — every claim on screen is running right now'],
    component: Title,
  },
  {
    id: 'S2',
    title: 'the pitch',
    act: 0,
    beats: 4,
    transition: 'rise',
    notes: ['land the thesis before the reveals', 'last beat is the whole product'],
    component: Pitch,
  },
  {
    id: 'S3',
    title: 'slides are components',
    act: 1,
    beats: 4,
    transition: 'morph',
    notes: ['beats spotlight one chunk at a time', 'this highlight is useBeat() — the pull model'],
    component: SlidesAreComponents,
  },
  {
    id: 'S4',
    title: 'beats',
    act: 1,
    beats: 4,
    transition: 'slide',
    notes: ['try it: back up with ← and the beats re-hide', 'refresh mid-slide to prove resume'],
    component: Beats,
  },
  {
    id: 'S5',
    title: 'demos claim the spacebar',
    act: 2,
    transition: 'portal',
    badge: 'LIVE DEMO',
    notes: [
      'space starts the bake replay; next space advances',
      'DeckWidgetHandle: start/isStarted',
    ],
    component: Widgets,
  },
  {
    id: 'S6',
    title: 'the deny variant',
    act: 2,
    transition: 'glitch',
    deep: true,
    notes: ['d toggles deny mode, auto-resets on slide change', 'built for live security demos'],
    component: Deny,
  },
  {
    id: 'S7',
    title: 'eight transitions',
    act: 2,
    transition: 'spiral',
    notes: ['the spiral you just saw is the highlighted card'],
    component: Transitions,
  },
  {
    id: 'S8',
    title: 'one file, fully offline',
    act: 3,
    beats: 4,
    transition: 'split',
    notes: ['the meta beat is the closer — this page IS dist/index.html'],
    component: OneFile,
  },
  {
    id: 'S9',
    title: 'the agent fast path',
    act: 3,
    beats: 4,
    transition: 'morph',
    notes: ['true story: an agent with the skill built this deck'],
    component: AgentFastPath,
  },
  {
    id: 'S10',
    title: 'bun create prezzer',
    act: 3,
    transition: 'zoom',
    notes: ['leave this up during questions'],
    component: Closing,
  },
]
