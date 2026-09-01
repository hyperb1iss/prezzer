import type { BunPlugin } from 'bun'
import { dirname, relative, resolve } from 'node:path'
import { parseMarkdownDeck } from './markdown-loader'

const peerDependency = /^(?:motion|react|react-dom)(?:\/.*)?$/

// The emitted markdown module must import the runtime factory from wherever
// it actually lives: the published package for a consumer deck, the source
// tree when the plugin runs inside this repo.
function resolveMarkdownRuntime(importerDirectory: string): string {
  try {
    return Bun.resolveSync('prezzer/markdown', importerDirectory)
  } catch {
    return Bun.resolveSync('./src/markdown/index.tsx', import.meta.dir)
  }
}

/** public/ files the bundler resolved itself; the bake consults this to skip warnings */
export const bundlerResolvedAssets = new Set<string>()

const prezzerPlugin: BunPlugin = {
  name: 'prezzer',
  setup(builder) {
    builder.onResolve({ filter: peerDependency }, ({ path }) => {
      try {
        const resolved = Bun.resolveSync(path, process.cwd())
        // A hit in Bun's global install cache means the deck itself does
        // not have the package; a cache path cannot resolve its own
        // transitive imports, so let importer-relative resolution run.
        if (resolved.includes('/install/cache/')) return undefined
        return { path: resolved }
      } catch {
        return undefined
      }
    })

    // Root-absolute references like url(/fonts/x.woff2) point into public/,
    // which the bundler cannot resolve on its own — in dev that fails the
    // whole page, in the bake it fails the build. Real on-disk absolute
    // paths pass through untouched.
    builder.onResolve({ filter: /^\// }, async ({ path }) => {
      if (await Bun.file(path).exists()) return undefined
      const projectPath = path.startsWith(process.cwd())
        ? relative(process.cwd(), path)
        : path.slice(1)
      const candidates = [projectPath]
      try {
        const decoded = decodeURIComponent(projectPath)
        if (decoded !== projectPath) candidates.push(decoded)
      } catch {
        // a bare % that is not an escape sequence; the raw form already covers it
      }
      for (const candidate of candidates) {
        const publicPath = resolve('public', candidate)
        if (await Bun.file(publicPath).exists()) {
          bundlerResolvedAssets.add(publicPath)
          return { path: publicPath }
        }
      }
      return undefined
    })

    // Markdown decks: parse and render at bundle time (Bun.markdown does
    // not exist in the browser), emit a module that hands the pre-rendered
    // chunks to the runtime factory.
    builder.onLoad({ filter: /\.md$/ }, async ({ path }) => {
      const slides = parseMarkdownDeck(await Bun.file(path).text())
      const runtime = resolveMarkdownRuntime(dirname(path))
      return {
        contents: [
          `import { markdownSlides } from ${JSON.stringify(runtime)}`,
          `export default markdownSlides(${JSON.stringify(slides)})`,
        ].join('\n'),
        loader: 'js',
      }
    })
  },
}

export default prezzerPlugin
