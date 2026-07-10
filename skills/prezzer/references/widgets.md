# Widgets

Two models. Choose by who owns time.

**Pull (default):** the deck owns time. The widget reads deck state and renders the current scene. Deep links, back-navigation, and grid jumps work for free because the widget is a pure function of `beat`. Reach for pull first; push exists only for demos that genuinely run on their own clock.

**Push:** the widget owns its own timeline (a count-up, a simulated attack, a terminal replay) and claims the presenter's next advance before the deck moves on.

## Pull model

Read `useBeat()`, `useDenyMode()`, or `autoplaySignal` and render:

```tsx
function Architecture() {
  const beat = useBeat();
  const denied = useDenyMode();
  return <Diagram stage={beat} failurePath={denied} />;
}
```

`autoplaySignal` (on `useDeck()`) is a counter the presenter increments with the `a` key — a manual cue for ambient flourishes that aren't worth a beat. Trigger on change:

```tsx
const { autoplaySignal } = useDeck();
useEffect(() => {
  if (autoplaySignal > 0) replaySweep();
}, [autoplaySignal]);
```

## Push model

The contract, from `prezzer/widgets` (this subpath is the only source — the root does not re-export it):

```tsx
import { type DeckWidgetHandle, useWidgetRegistration } from "prezzer/widgets";
```

Implement `DeckWidgetHandle` (`start()`, `isStarted()`) via `useImperativeHandle` on the ref that `useWidgetRegistration()` returns. Ordering guarantee: every forward advance — space, `→`, `pgdn`, and every forward touch gesture (left swipe, right-edge tap, center tap) — starts the first unstarted widget in registration order and consumes that advance; once all widgets on the slide report started, advances move the deck again. `shift` plus any advance key always skips the whole slide regardless of pending widgets.

Verified working pattern (this is `examples/hello`'s count-up, the reference implementation):

```tsx
function CountUp() {
  const ref = useWidgetRegistration();
  const [running, setRunning] = useState(false);
  const [value, setValue] = useState(0);
  const startedRef = useRef(false);

  useImperativeHandle(ref, (): DeckWidgetHandle => {
    return {
      start: () => {
        startedRef.current = true;
        setRunning(true);
      },
      isStarted: () => startedRef.current,
    };
  }, []);

  useEffect(() => {
    if (!running || value >= 100) return;
    const timer = setTimeout(() => setValue((v) => Math.min(v + 7, 100)), 60);
    return () => clearTimeout(timer);
  }, [running, value]);

  return <div>{value}</div>;
}
```

Two load-bearing details:

- **`isStarted` must answer synchronously from a ref, not state.** The registry calls it during the keydown; a `useState` value can lag a render behind and the widget double-starts.
- **Tell the presenter.** Put the cue in the slide's `notes` (`"space starts the demo"`) and consider on-canvas hint text — a spacebar that visibly does nothing reads as a crash.

Widgets unregister automatically on unmount; slide changes reset the queue naturally because the components unmount with the slide.

## Demo fallbacks

Every push widget is a live demo, and live demos fail. Give each one a deny-mode variant (`useDenyMode()`) or a static final-state fallback, and rehearse the failure path — that's what deny mode is for.
