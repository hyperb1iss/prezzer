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
import { SlideArt, SlideHeader, StatRail } from 'prezzer/chrome'
import { type DeckWidgetHandle, useWidgetRegistration } from 'prezzer/widgets'
import { type ReactNode, useEffect, useImperativeHandle, useRef, useState } from 'react'

function Title() {
  return (
    <div className="demo-slide demo-title">
      <SlideArt src="/art/title-nebula.webp" />
      <div className="demo-content demo-title-copy">
        <p className="demo-eyebrow">a small react app. a very big stage.</p>
        <h1 className="demo-wordmark">
          pre<span>zz</span>er
        </h1>
        <p className="demo-title-tagline">cinematic presentations as code</p>
        <div className="demo-title-rule" />
        <p className="demo-title-caption">written in React · performed by you · yours offline</p>
      </div>
      <div className="demo-content demo-shortcuts">
        <span>
          <kbd>space</kbd> advance
        </span>
        <span>
          <kbd>g</kbd> grid
        </span>
        <span>
          <kbd>n</kbd> notes
        </span>
        <span>
          <kbd>d</kbd> deny
        </span>
        <span>
          <kbd>f</kbd> fullscreen
        </span>
      </div>
    </div>
  )
}

function Pitch() {
  return (
    <div className="demo-slide demo-pitch">
      <SlideArt src="/art/pitch-theatre.webp" scrim="left" />
      <div className="demo-content demo-layout">
        <SlideHeader act={0} title="decks are software." />
        <div className="demo-column">
          <p className="demo-headline">
            leave the
            <br />
            <span className="demo-purple">slide editor.</span>
          </p>
          <div className="demo-reveals">
            <Beat at={1}>
              <p className="demo-muted">
                PowerPoint. Google Slides. Keynote.
                <br />
                we're building our own little theatre.
              </p>
            </Beat>
            <Beat at={2}>
              <p>
                every talk is a <span className="demo-cyan">React app.</span>
                <br />
                components for slides. beats for reveals.
              </p>
            </Beat>
            <Beat at={3}>
              <p className="demo-coral">the whole thing becomes one offline HTML file.</p>
            </Beat>
          </div>
        </div>
        <div className="demo-stats">
          <StatRail
            stats={[
              { value: '1', label: 'html file' },
              { value: '0', label: 'cloud' },
            ]}
          />
        </div>
      </div>
    </div>
  )
}

function CodeChunk({ lit, children }: { lit: boolean; children: ReactNode }) {
  return (
    <motion.div
      animate={{ opacity: lit ? 1 : 0.25 }}
      transition={{ duration: 0.3 }}
      className="demo-code-chunk"
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
    <div className="demo-slide demo-components">
      <SlideArt src="/art/component-prism.webp" scrim="left" />
      <div className="demo-content demo-layout">
        <SlideHeader act={1} title="slides are components" creeds={['ONE IDEA PER SLIDE']} />
        <div className="demo-code-panel">
          <div className="demo-panel-bar">
            <span className="demo-panel-lights" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
            <span>slides.tsx</span>
            <span>React + TypeScript</span>
          </div>
          <div className="demo-code-body">
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
                  {'{'} id: <span style={val}>'S1'</span>, title:{' '}
                  <span style={val}>'the thesis'</span>,
                </div>
                <div>
                  {'    '}beats: <span style={val}>2</span>, component: Thesis {'}'},
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
                  <span style={kw}>return</span> <span style={tag}>{'<Deck'}</span> slides={'{'}
                  slides
                  {'}'} <span style={tag}>{'/>'}</span>
                </div>
                <div>{'}'}</div>
              </CodeChunk>
            </div>
          </div>
        </div>
        <p className="demo-code-caption">
          {allLit
            ? 'a full deck. space walks through it.'
            : beat === 1
              ? 'a slide is a component; <Beat> gates the reveal.'
              : beat === 2
                ? 'the registry sets the order, ids, titles, beat counts, and notes.'
                : 'mount <Deck> and present. that is the entire integration.'}
        </p>
      </div>
    </div>
  )
}

function Beats() {
  const beat = useBeat()
  return (
    <div className="demo-slide demo-beats">
      <SlideArt src="/art/beat-jellyfish.webp" scrim="left" />
      <div className="demo-content demo-layout">
        <SlideHeader act={1} title="a little stage magic." tag="beats" />
        <div className="demo-column">
          <p className="demo-headline">
            the reveal.
            <br />
            <span className="demo-cyan">on your cue.</span>
          </p>
          <div className="demo-beat-track" role="img" aria-label={`Beat ${beat + 1} of 4`}>
            {[0, 1, 2, 3].map((step) => (
              <div key={step} className="demo-beat-step" data-active={step <= beat}>
                <span>0{step + 1}</span>
                <i />
              </div>
            ))}
          </div>
          <div className="demo-reveals">
            <Beat at={1}>
              <p>
                one press of <kbd>space</kbd>. one beat.
              </p>
            </Beat>
            <Beat at={2}>
              <p>
                the URL remembers: <span className="demo-cyan font-mono">#4.2</span>
                <br />
                <span className="demo-muted">refresh and resume right here.</span>
              </p>
            </Beat>
            <Beat at={3}>
              <p className="demo-muted">
                back up to re-hide. unrevealed content stays out of the accessibility tree.
              </p>
            </Beat>
          </div>
        </div>
      </div>
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
    <div className="demo-bake" data-running={running}>
      <div className="demo-terminal">
        <div className="demo-panel-bar">
          <span className="demo-panel-lights" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <span>the bake</span>
          <span>{done ? 'COMPLETE' : running ? 'RUNNING' : 'READY'}</span>
        </div>
        <div className="demo-terminal-lines">
          {!running && (
            <div className="demo-terminal-idle">
              <span>$</span>
              <span className="demo-cursor" />
              <span className="demo-muted">your demo is ready.</span>
            </div>
          )}
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
      </div>
      <p className="demo-code-caption">
        {done
          ? 'done. space advances the deck.'
          : running
            ? 'baking... the next space advances the deck.'
            : 'press space to start. the widget gets the first cue.'}
      </p>
    </div>
  )
}

function Widgets() {
  return (
    <div className="demo-slide demo-widgets">
      <SlideArt src="/art/bake-dragon.webp" scrim="left" />
      <div className="demo-content demo-layout">
        <SlideHeader act={2} title="the demo takes the stage." tag="widgets" />
        <div className="demo-column">
          <p className="demo-headline">
            one cue.
            <br />
            <span className="demo-cyan">off it goes.</span>
          </p>
          <p className="demo-intro">
            a widget gets the first cue,
            <br />
            then runs on its own clock. dragon included.
          </p>
          <BakeReplay />
        </div>
      </div>
    </div>
  )
}

function Deny() {
  const theme = useDeckTheme()
  const denied = useDenyMode()
  return (
    <div className="demo-slide demo-deny" data-denied={denied}>
      <SlideArt src="/art/access-cat.webp" scrim="left" />
      <div className="demo-content demo-layout">
        <SlideHeader act={2} title="the cat has opinions." tag="deny mode" />
        <div className="demo-column">
          <p className="demo-eyebrow demo-access-label">
            <span />
            live access check
          </p>
          <motion.div
            animate={{
              color: denied ? theme.colors.errorRed : theme.colors.successGreen,
              textShadow: denied ? theme.glow.coral : theme.glow.green,
            }}
            className="demo-access-status"
            role="status"
          >
            ACCESS
            <br />
            {denied ? 'DENIED' : 'GRANTED'}
          </motion.div>
          <p className="demo-intro">
            a very small bouncer. a useful rehearsal.
            <br />
            wire your demo to deny mode and rehearse
            <br />
            the failure before it happens on stage.
          </p>
          <p className="demo-key-cue">
            <kbd>d</kbd>
            <span>{denied ? 'restore access' : 'try the failure path'}</span>
          </p>
        </div>
      </div>
    </div>
  )
}

const transitionCatalog = [
  { name: 'morph', mood: 'dense content', glyph: '◇' },
  { name: 'slide', mood: 'sequential narration', glyph: '→' },
  { name: 'zoom', mood: 'big reveals', glyph: '⊕' },
  { name: 'portal', mood: 'new worlds', glyph: '◎' },
  { name: 'glitch', mood: 'failure modes', glyph: '≋' },
  { name: 'rise', mood: 'act openers', glyph: '↑' },
  { name: 'spiral', mood: 'playful pivots', glyph: '↝' },
  { name: 'split', mood: 'dramatic contrast', glyph: '⋈' },
] as const

function Transitions() {
  return (
    <div className="demo-slide demo-transitions">
      <SlideArt src="/art/transition-ribbon.webp" scrim="left" />
      <div className="demo-content demo-layout">
        <SlideHeader act={2} title="give the story a rhythm." creeds={['8 TRANSITIONS']} />
        <p className="demo-intro">a different entrance for every kind of moment.</p>
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="demo-transition-grid"
        >
          {transitionCatalog.map((transition) => {
            const isThisOne = transition.name === 'spiral'
            return (
              <motion.div
                key={transition.name}
                variants={staggerItem}
                className="demo-transition-card"
                data-current={isThisOne}
              >
                <span className="demo-transition-glyph" aria-hidden="true">
                  {transition.glyph}
                </span>
                <div className="demo-transition-name">{transition.name}</div>
                <div className="demo-transition-mood">{transition.mood}</div>
                {isThisOne && <span className="demo-transition-current">you're here</span>}
              </motion.div>
            )
          })}
        </motion.div>
      </div>
    </div>
  )
}

function OneFile() {
  return (
    <div className="demo-slide demo-one-file">
      <SlideArt src="/art/one-file-shard.webp" scrim="left" />
      <div className="demo-content demo-layout">
        <SlideHeader act={3} title="take the whole thing with you." />
        <div className="demo-column">
          <p className="demo-headline">
            one file.
            <br />
            <span className="demo-purple">everywhere.</span>
          </p>
          <div className="demo-file-path">
            <span aria-hidden="true">↳</span> dist/index.html
          </div>
          <div className="demo-reveals">
            <Beat at={1}>
              <p>
                markup, styles, scripts.
                <br />
                <span className="demo-muted">images and fonts baked in, too.</span>
              </p>
            </Beat>
            <Beat at={2}>
              <p className="demo-muted">
                present from file://, attach it to an email, drop it on any static host.
              </p>
            </Beat>
            <Beat at={3}>
              <p className="demo-coral">
                the published demo is this exact deck,
                <br />
                baked into HTML and deployed by CI.
              </p>
            </Beat>
          </div>
        </div>
        <div className="demo-stats">
          <StatRail
            stats={[
              { value: '1', label: 'file' },
              { value: '0', label: 'servers' },
              { value: '100%', label: 'offline' },
            ]}
          />
        </div>
      </div>
    </div>
  )
}

function AgentFastPath() {
  return (
    <div className="demo-slide demo-agent">
      <SlideArt src="/art/agent-moth.webp" scrim="left" />
      <div className="demo-content demo-layout">
        <SlideHeader act={3} title="a little help behind the curtain." />
        <div className="demo-column">
          <p className="demo-headline">
            you shape
            <br />
            <span className="demo-cyan">the story.</span>
          </p>
          <p className="demo-intro">your agent weaves the deck.</p>
          <div className="demo-reveals">
            <Beat at={1}>
              <div className="demo-agent-command">
                <span className="demo-eyebrow">install the authoring skill</span>
                <code>npx skills add hyperb1iss/prezzer</code>
              </div>
            </Beat>
            <Beat at={2}>
              <p className="demo-muted">
                the workflow, the API, and the gotchas.
                <br />
                ready before the first component.
              </p>
            </Beat>
            <Beat at={3}>
              <p className="demo-purple">this deck was built by an agent with that skill.</p>
            </Beat>
          </div>
        </div>
      </div>
    </div>
  )
}

function Closing() {
  return (
    <div className="demo-slide demo-closing">
      <SlideArt src="/art/closing-moonboats.webp" scrim="bottom" />
      <div className="demo-content demo-closing-copy">
        <p className="demo-eyebrow">your next talk starts here</p>
        <h2 className="demo-closing-title">make a scene.</h2>
        <div className="demo-create-command">
          <span aria-hidden="true">$</span>
          <code>bun create prezzer my-talk</code>
          <span className="demo-cursor" aria-hidden="true" />
        </div>
        <p className="demo-closing-note">bring a story. the stage is yours.</p>
      </div>
      <div className="demo-content demo-closing-footer">
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
    notes: ['this deck is the live demo; every claim on screen is running right now'],
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
    notes: ['beats spotlight one chunk at a time', 'this highlight is useBeat(), the pull model'],
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
    notes: ['the meta beat is the closer; the published demo is the baked HTML artifact'],
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
