import type { BunPlugin } from 'bun'
import { relative, resolve } from 'node:path'

const peerDependency = /^(?:motion|react|react-dom)(?:\/.*)?$/

/** public/ files the bundler resolved itself; the bake consults this to skip warnings */
export const bundlerResolvedAssets = new Set<string>()

const prezzerPlugin: BunPlugin = {
  name: 'prezzer',
  setup(builder) {
    builder.onResolve({ filter: peerDependency }, ({ path }) => ({
      path: Bun.resolveSync(path, process.cwd()),
    }))

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
  },
}

export default prezzerPlugin
