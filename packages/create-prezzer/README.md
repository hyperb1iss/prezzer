# 🎭 create-prezzer

> _A cinematic Bun-native presentation, scaffolded in seconds._

[![npm](https://img.shields.io/npm/v/create-prezzer?logo=npm&logoColor=white&color=ff6ac1)](https://www.npmjs.com/package/create-prezzer)
[![License](https://img.shields.io/github/license/hyperb1iss/prezzer?color=80ffea)](https://github.com/hyperb1iss/prezzer/blob/main/LICENSE)

Create a complete [Prezzer](https://github.com/hyperb1iss/prezzer) deck:

```bash
bun create prezzer my-talk
```

The command writes the starter, installs dependencies with Bun, and initializes Git when the target is not already inside a repository.

```text
--force         write into a non-empty target; template files overwrite name collisions
--no-install    skip bun install
--no-git        skip git init
-h, --help      show usage
```

The generated deck supports `bun dev`, `bun run check`, and `bun run build`. Its build output is one offline file at `dist/index.html`.

See the [Prezzer repository](https://github.com/hyperb1iss/prezzer) for engine and authoring documentation.
