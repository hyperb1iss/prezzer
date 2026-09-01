# Prezzer agent guide

Prezzer is a Bun-native React presentation engine: decks are small React apps that bake into one offline HTML file. This repo publishes the engine, the scaffolder, a reference deck, and the deck-authoring skill. Keep the contributor path small, deterministic, and reproducible from a clean clone.

**Building a deck rather than changing the engine?** Read [skills/prezzer/SKILL.md](skills/prezzer/SKILL.md) instead — it carries the authoring workflow, API reference, and verified gotchas.

## Commands

```bash
bun install       # workspace setup — this plus Bun is the entire toolchain
bun run check     # format, lint, typecheck, tests: the full gate
bun run build     # build packages, then bake the reference deck
bun dev           # serve examples/hello with hot reload (prezzer dev)
```

Narrow gates while editing:

```bash
bun run --cwd packages/engine typecheck
bun test packages/engine/src/engine/Deck.test.tsx
```

`bun test` works from the repo root or inside any package: the happy-dom registration lives in `test/setup.ts`, preloaded by the root `bunfig.toml` and mirrored by a per-package `bunfig.toml` in every workspace member with tests. A new package with tests needs the same two-line mirror or its tests fail on every DOM access.

## Layout

- `packages/engine` publishes `prezzer`: the React deck shell, presenter chrome, theme tokens, motion primitives, widget registry, and the `prezzer dev` / `prezzer build` CLI (`bin/prezzer.ts`).
- `packages/create-prezzer` publishes `create-prezzer` and owns the starter template.
- `examples/hello` is the reference deck — it exercises the published package boundary and the complete standalone-build path.
- `examples/demo` is the showcase deck — Prezzer presenting itself; `.github/workflows/pages.yml` bakes it and deploys `examples/demo/dist` to GitHub Pages on every push to main.
- `skills/prezzer` is the deck-authoring skill for coding agents.
- `docs/` holds deck authoring and release guides; releases publish via GitHub OIDC trusted publishing ([docs/releasing.md](docs/releasing.md)).

## Invariants

- The engine is React and plain CSS. Consumer decks may use Tailwind, but built-in chrome must never depend on consumer utility generation.
- Theme values flow through `DeckProvider` and `useDeckTheme`; never import the default theme directly inside themed components, or overrides silently stop applying.
- Navigation state must tolerate empty and live-changing slide lists.
- Browser and application shortcuts take precedence over deck shortcuts, and interaction inside `interactiveElementSelector` (including `data-prezzer-interactive` surfaces) belongs to the content.
- Keyboard, touch, and widget advancement share the same ordering guarantees: every forward advance starts the next pending widget before the deck moves.
- Use Bun for dependency management, workspace scripts, development serving, tests, and builds. Do not add a second development or build path.

## The skill is load-bearing documentation

Agents build real decks from `skills/prezzer/` verbatim, so behavior changes in the engine must update the skill references in the same change — API surface in `references/api.md`, chrome in `references/chrome.md`, motion/theming/widgets/verification likewise. Doc drift here is a bug, not a docs chore: the skill's claims are transcribed from `packages/engine/src` and have been adversarially verified against it.

## Change shape

Keep changes atomic with Conventional Commit messages (`type(scope): subject`, wrapped body explaining why). Run the narrowest relevant check while editing, then the full repository gate before handing off. Verify behavior in the built artifact when a change touches serving, bundling, or inlining — dev mode and the bake genuinely differ.
