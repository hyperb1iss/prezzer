# Rendering a deck to video

`prezzer render` films a deck frame by frame in headless Chromium on a virtual clock and pipes the frames into ffmpeg. The result is an H.264 MP4 that plays the talk with every transition, beat reveal, push widget, and embedded video exactly as the browser draws it. Page state runs on a virtual clock, so reruns film the same frames, down to GPU raster noise on glows (see Determinism below).

## Setup, once per deck repository

Render needs two things that `prezzer dev` and `prezzer build` never do:

```bash
bun add -d playwright-core
bunx playwright-core install --only-shell chromium
```

and `ffmpeg` on `PATH` (`brew install ffmpeg`, `apt install ffmpeg`, `winget install ffmpeg`). `--frames` writes PNGs and skips ffmpeg. Missing pieces fail with an error that names the install command.

## Commands that cover most requests

```bash
prezzer render                              # bake index.html, film the whole deck to dist/index.mp4
prezzer render --slides 3-5                 # one stretch of the talk
prezzer render --scale 2                    # 3840x2160 from the 1920x1080 stage
prezzer render --hold 2 --out talk.mp4      # two seconds per beat
prezzer render --timeline render.json       # per-slide and per-beat timing
prezzer render dist/index.html              # film an existing build as-is
prezzer render --frames frames/             # PNG sequence (frame-000000.png, ...) instead of an MP4
```

The deck argument decides whether a bake happens. A source entry (an HTML file whose scripts load by path, like the starter's `index.html`) bakes into `dist/` first, then the baked file is filmed. A built single-file deck renders exactly as given, so any prezzer build works, including one that was emailed to you.

| Flag               | Default                         | Meaning                                                                            |
| ------------------ | ------------------------------- | ---------------------------------------------------------------------------------- |
| `--out <file>`     | beside the built deck, `.mp4`   | MP4 path; replaced only when the encode finishes (below)                           |
| `--frames <dir>`   | off                             | write PNGs instead of an MP4; the directory must be new or empty, 2 GB free        |
| `--fps <n>`        | 30                              | frames per second                                                                  |
| `--scale <n>`      | 1                               | device scale factor; the output is the design canvas times this (H.264 needs even) |
| `--hold <s>`       | 3                               | seconds on each beat, counted from the advance (so it includes the transition)     |
| `--slides <range>` | whole deck                      | `3`, `2-5`, or `4-`; 1-indexed like the hash                                       |
| `--timeline <f>`   | none                            | JSON timing file, below                                                            |
| `--crf <n>`        | 18                              | x264 quality; lower is larger and sharper                                          |
| `--workers <n>`    | a quarter of the cores, up to 4 | parallel capture pages                                                             |
| `--channel <name>` | Playwright's Chromium           | a browser channel such as `chrome`                                                 |

Flags beat the timeline file, which beats the defaults.

The MP4 encodes into a hidden sibling file and is renamed over `--out` only after ffmpeg finishes cleanly. A failed render, Ctrl+C, or a kill removes the partial file and leaves the previous `--out` untouched; an interrupted render exits 130. The `--out` directory must already exist and be writable, which is checked before any browser starts. An interrupted `--frames` render removes the frames it wrote. On a terminal, progress is one live line; anywhere else (an agent, a CI log) it prints a plain `prezzer filming 120/456` line every five seconds.

## Timeline file

```json
{
  "fps": 30,
  "hold": 3,
  "slides": "1-6",
  "holds": { "1": 5, "3.2": 8, "6": 1.5 },
  "widgets": { "5": 6 }
}
```

`holds` keys are deck positions in hash vocabulary: `"3"` is every beat of slide 3, `"3.2"` is slide 3 with two reveals fired (the beat suffix is 0-indexed, like `#3.2`). A beat entry beats its slide entry, which beats `hold`. A hold of `0` advances immediately. `widgets` gives a push widget an exact duration (below). Unknown keys are an error, so a typo never passes silently.

## What the renderer does with a deck

1. **Probe.** It loads the deck once to learn the slide count, every slide's beat count, and the design canvas size, using the deck's own hash contract (`#N.99999` clamps to the slide's last beat). Decks with `hashSync={false}` cannot render.
2. **Plan.** It plays the selected range once without capturing. At each position it holds, then presses space. If the hash moves, that was a beat or a slide. If it holds, a push widget claimed the press.
3. **Film.** Capture workers replay the plan press for press and frame for frame, each capturing its share, and frames stream into ffmpeg in order with no frame files on disk. Every worker checks each press against the planned hash and each frame's DOM mutation and running-animation counts against what the plan observed, and the render fails loudly on any mismatch.

Push widgets: after a widget claims the advance, the renderer films until the slide stays quiet (no text or structure changes and no finite animations running) for 1.5 s, capped at 30 s, then plays the beat's hold so the final state reads, then advances again. A widget with long silent gaps (a replay that pauses for two seconds) would look finished early, so give it an explicit duration in `widgets`. On the deck's very last beat, a press that changes nothing within half a second ends the film.

Presses during a transition: an advance that lands while the next slide is still mounting goes to the deck, not to the incoming slide's widget. With very short holds, give a widget slide enough hold for its entrance to finish (a second is plenty) or the widget gets skipped.

## Embedded video

`<video>` elements are driven per frame: playback is simulated (the element stays natively paused and seeks to film time each frame), so a clip plays in perfect sync no matter how slowly it decodes. `play()`, `pause()`, `currentTime`, `loop`, `ended`, `playbackRate`, and `autoplay` all behave, and the page hears `play`, `pause`, `timeupdate`, `seeked`, and `ended` from the film clock rather than from the native element. Audio is not recorded; the MP4 is silent.

The Chromium that playwright-core 1.64 installs is a Chrome for Testing build and decodes H.264 (verified on macOS). Older Playwright Chromium builds shipped without proprietary codecs; if a clip shows its fallback or a blank frame, render with `--channel chrome` to use the installed Google Chrome. Seeking costs decode time, so a slide with a rolling clip films slower than one without (about two thirds the speed in the numbers below).

## Determinism, and where it ends

The page runs on the renderer's clock: timers, animation frames, `Date`, and `performance.now()` advance only between frames, every timer fires at its exact due time with the page settled before the next, every Web Animation and CSS animation is pinned to film time (including `reverse()` and playback-rate changes), `Math.random` and `crypto.getRandomValues` are seeded, and fonts and images finish decoding before any frame shows them.

Page state is exact across runs and across worker counts, and the per-frame checks in the film step enforce it. Pixels are almost exact. GPU rasterization of blurred glows and of text on an animating layer can wobble by a few color levels, and how often that shows up depends on the run. Measured on a 456-frame 1080p render of a real talk (title, beat reveals, a rolling H.264 clip):

| Comparison                        | Byte-identical frames | Worst frame, pixels off by more than 32 levels |
| --------------------------------- | --------------------- | ---------------------------------------------- |
| Two runs, 4 workers each          | 456 of 456            | none                                           |
| Two other runs, 4 workers each    | 432 of 456            | 5 pixels (0.0002%)                             |
| One run with 1 worker, one with 4 | 428 of 456            | 326 pixels (0.016%), at most 45 levels         |

So runs at the same worker count are usually byte-identical, and worker counts differ only by glow-level noise. The repository's render test films the same range with one worker and with two and allows up to 1% of a frame's pixels to move by more than 32 levels. That tolerance only guards pixels: divergent page state fails the render itself, because every worker checks each frame against the plan. MP4 files are never bit-identical across runs, because x264 carries even one-level noise through a group of pictures.

Things a deck can do that break this: fetching data from the network at runtime, animating a `<canvas>` from a source other than `requestAnimationFrame` and timers, or reading real time from somewhere the clock does not cover. Known uncovered sources: a `Worker` or an iframe, `Intl.DateTimeFormat().format()` called with no date (it reads the real clock internally), `performance.timeOrigin`, `event.timeStamp`, and `document.timeline.currentTime`. The bake inlines assets, so a normally built deck rarely touches any of these.

## Programmatic use

`prezzer/render` exports the pieces: `renderDeck` for the whole pipeline, and `prepareFilm` and `startFilm` for filming any page deterministically (a title card or caption overlay built from prezzer components, for example):

```ts
import { chromium } from "playwright-core";
import {
  frameStep,
  openVideoSink,
  prepareFilm,
  startFilm,
} from "prezzer/render";

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1920, height: 1080 },
});
await prepareFilm(context, { seed: 7 });
const page = await context.newPage();
await page.goto("file:///path/to/card.html");
const film = await startFilm(page);
const video = openVideoSink({ out: "card.mp4", fps: 30 });
for (let frame = 0; frame < 90; frame += 1) {
  await film.advance(frameStep(frame, 30));
  await video.write(await film.capture());
}
await video.close();
await browser.close();
```

`prepareFilm` must run before the context opens a page. Pass `captured: false` to `advance` on frames you will not capture; page state stays identical and videos skip the decode.

## Throughput

Measured on an Apple Silicon laptop with lossless PNG capture, capture phase only: one worker films about 13 fps at 1080p and 3 fps at 4K, and four workers about 26 fps and 5.5 fps. A slide with a rolling H.264 clip drops 1080p to about 9 fps on one worker and 18 on four. Planning adds about 2 ms per frame. Capture dominates, and more workers stop helping once the GPU saturates.
