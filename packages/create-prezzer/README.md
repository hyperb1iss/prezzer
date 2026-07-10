# create-prezzer

Create a complete Bun-native Prezzer deck:

```bash
bun create prezzer my-talk
```

The command writes the starter, installs dependencies with Bun, and initializes Git when the target is not already inside a repository.

```text
--force         keep existing files in a non-empty target
--no-install    skip bun install
--no-git        skip git init
-h, --help      show usage
```

The generated deck supports `bun dev`, `bun run check`, and `bun run build`. Its build output is one offline file at `dist/index.html`.

See the [Prezzer repository](https://github.com/hyperb1iss/prezzer) for engine and authoring documentation.
