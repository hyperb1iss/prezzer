# Contributing

Prezzer should stay unusually easy to understand and operate. A clean clone needs Bun, then only three commands:

```bash
bun install
bun run check
bun run build
```

## Development loop

Use `examples/hello` to exercise engine changes through the public package exports. Run focused tests while editing:

```bash
bun test packages/engine/src/engine/Deck.test.tsx
bun run typecheck
```

Tests run from the repo root or from inside any package — the happy-dom test preload lives in `test/setup.ts` and every workspace member with tests mirrors it through its own `bunfig.toml`.

Before opening a pull request, run the full check and build. Include the exact commands and results in the pull request description.

For visual changes, open `examples/hello/dist/index.html` after the build and verify the offline artifact, not only the development server. Check keyboard navigation, touch behavior, notes, grid overview, widgets, and reduced motion when the change touches those paths.

## Change shape

- Keep the engine focused on reusable presentation mechanics.
- Put talk-specific slides and widgets in deck repositories.
- Keep built-in chrome independent from consumer styling frameworks.
- Preserve the one-file offline artifact.
- Add a regression test when fixing observable behavior.

Use Conventional Commits with a concise body that explains why the change matters. Keep unrelated work out of the same commit.

By participating, you agree to follow the [code of conduct](CODE_OF_CONDUCT.md).
