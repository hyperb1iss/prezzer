# Releasing Prezzer

`prezzer` and `create-prezzer` ship together at the same version. The engine must publish first because newly generated decks depend on that release.

## Prepare

1. Update both package versions and the scaffolder's default engine spec in `packages/create-prezzer/src/index.ts`. A test asserts the default matches the engine version, so `bun test` catches a missed bump. (`PREZZER_PACKAGE_SPEC` overrides the default for local smoke tests against a tarball.)
2. Run `bun install` to refresh `bun.lock`.
3. Run `bun run check` and `bun run build`.
4. Pack both packages and run the tarball scaffolding smoke test before publishing.

```bash
bun pm pack --dry-run --cwd packages/engine
bun pm pack --dry-run --cwd packages/create-prezzer
```

## Trusted publishing

Configure an npm trusted publisher for each package with:

- organization or user: `hyperb1iss`
- repository: `prezzer`
- workflow filename: `publish.yml`

The repository uses GitHub OIDC and does not store an npm token. The caller workflow filename is the trusted identity even though the implementation lives in `shared-workflows`.

## Dry run

Run the **Publish** workflow manually. Its `dry-run` input defaults to true and executes the complete install, check, build, and `npm publish --dry-run` path for both packages.

## Publish

Create a GitHub release from the verified commit. Publishing the release invokes the same workflow with dry-run disabled, checks out the release tag, then publishes:

1. `packages/engine`
2. `packages/create-prezzer`

Verify both npm package pages and scaffold one clean deck with `bun create prezzer` after the workflow completes.
