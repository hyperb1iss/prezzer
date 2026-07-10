# Prezzer contributor guide

Prezzer is a Bun-native open-source workspace. Keep the contributor path small, deterministic, and easy to reproduce from a clean clone.

## Commands

```bash
bun install
bun run check
bun run build
```

`bun run check` formats, lints, typechecks, builds the publishable packages, and runs the tests. `bun run build` then proves the reference deck compiles to one offline HTML file.

## Architecture

- `packages/engine` publishes `prezzer` and the `prezzer build` CLI.
- `packages/create-prezzer` publishes `create-prezzer` and owns the starter.
- `examples/hello` is the package-boundary and standalone-build reference.
- `skills/prezzer` documents the authoring workflow for coding agents.

The engine is React and plain CSS. Consumer decks may use Tailwind, but built-in chrome must never depend on consumer utility generation. Theme values flow through `DeckProvider` and `useDeckTheme`; do not import the default theme directly inside themed components.

Navigation state must tolerate empty and live-changing slide lists. Browser and application shortcuts take precedence over deck shortcuts. Keyboard, touch, and widget advancement must share the same ordering guarantees.

Use Bun for dependency management, workspace scripts, development serving, tests, and builds. Do not add a second development or build path.

Keep changes atomic. Run the narrowest relevant check while editing, then run the full repository gate before handing off.
