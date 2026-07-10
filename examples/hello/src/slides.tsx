import { motion } from 'motion/react'
import { type ActDef, Beat, type SlideDef, useDeckTheme, useDenyMode } from 'prezzer'
import { SlideHeader, Starfield, StatRail } from 'prezzer/chrome'
import { type DeckWidgetHandle, useWidgetRegistration } from 'prezzer/widgets'
import { useEffect, useImperativeHandle, useRef, useState } from 'react'

function Title() {
  const theme = useDeckTheme()
  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center">
      <Starfield count={48} />
      <h1
        className="font-display text-9xl font-bold tracking-tight"
        style={{ color: theme.colors.textPrimary, textShadow: theme.glow.purple }}
      >
        hello, <span style={{ color: theme.colors.electricPurple }}>prezzer</span>
      </h1>
      <p className="mt-6 font-mono text-2xl" style={{ color: theme.colors.textMuted }}>
        space to advance · n notes · g grid · d deny · f fullscreen
      </p>
    </div>
  )
}

function Beats() {
  const theme = useDeckTheme()
  return (
    <div className="relative h-full w-full px-24 py-20">
      <SlideHeader act={1} title="beats" creeds={['ONE IDEA PER SLIDE']} />
      <div className="space-y-8 font-body text-4xl" style={{ color: theme.colors.textPrimary }}>
        <p>a slide is a little state machine.</p>
        <Beat at={1}>
          <p>
            each <span style={{ color: theme.colors.neonCyan }}>space press</span> advances one
            beat…
          </p>
        </Beat>
        <Beat at={2}>
          <p>
            …and the URL hash tracks it: <span className="font-mono">#2.2</span>, so refresh resumes
            exactly here.
          </p>
        </Beat>
      </div>
      <StatRail
        stats={[
          { value: '3', label: 'beats' },
          { value: '#2.2', label: 'deep link' },
        ]}
      />
    </div>
  )
}

function CountUp() {
  const theme = useDeckTheme()
  const ref = useWidgetRegistration()
  const [running, setRunning] = useState(false)
  const [value, setValue] = useState(0)
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
    if (!running || value >= 100) return
    const timer = setTimeout(() => setValue((current) => Math.min(current + 7, 100)), 60)
    return () => clearTimeout(timer)
  }, [running, value])

  return (
    <div className="text-center">
      <div
        className="font-display text-[200px] font-bold leading-none"
        style={{
          color: value >= 100 ? theme.colors.successGreen : theme.colors.coral,
          textShadow: value >= 100 ? theme.glow.green : theme.glow.coral,
        }}
      >
        {value}
      </div>
      <p className="mt-4 font-mono text-xl" style={{ color: theme.colors.textMuted }}>
        {running
          ? value >= 100
            ? 'done; space now advances the deck'
            : 'running…'
          : 'press space: the widget claims it first'}
      </p>
    </div>
  )
}

function Widgets() {
  return (
    <div className="relative flex h-full w-full flex-col px-24 py-20">
      <SlideHeader act={1} title="imperative widgets" tag="push model" />
      <div className="flex flex-1 items-center justify-center">
        <CountUp />
      </div>
    </div>
  )
}

function Deny() {
  const theme = useDeckTheme()
  const denied = useDenyMode()
  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center gap-10">
      <SlideHeader act={2} title="the deny variant" tag="press d" />
      <motion.div
        animate={{
          color: denied ? theme.colors.errorRed : theme.colors.successGreen,
          textShadow: denied ? theme.glow.coral : theme.glow.green,
        }}
        className="font-display text-8xl font-bold"
      >
        {denied ? 'DENIED' : 'ALLOWED'}
      </motion.div>
      <p
        className="max-w-3xl text-center font-body text-3xl"
        style={{ color: theme.colors.textMuted }}
      >
        every slide gets a free "what if it fails" mode: the same widget, the unhappy path. built
        for live security demos.
      </p>
    </div>
  )
}

export const acts: ActDef[] = [
  { number: 0, title: 'hello', color: '#e135ff' },
  { number: 1, title: 'mechanics', color: '#80ffea' },
  { number: 2, title: 'modes', color: '#ff6ac1' },
]

export const slides: SlideDef[] = [
  {
    id: 'S1',
    title: 'hello, prezzer',
    act: 0,
    transition: 'zoom',
    notes: ['welcome to the reference deck', 'everything here is the public API'],
    component: Title,
  },
  {
    id: 'S2',
    title: 'beats',
    act: 1,
    beats: 3,
    transition: 'rise',
    notes: ['each space press is one beat', 'hash deep-links to slide.beat'],
    component: Beats,
  },
  {
    id: 'S3',
    title: 'imperative widgets',
    act: 1,
    transition: 'portal',
    badge: 'IN FLIGHT',
    notes: ['space starts the widget before advancing', 'DeckWidgetHandle: start/isStarted'],
    component: Widgets,
  },
  {
    id: 'S4',
    title: 'the deny variant',
    act: 2,
    transition: 'glitch',
    deep: true,
    notes: ['d toggles deny mode, auto-resets on slide change'],
    component: Deny,
  },
]
