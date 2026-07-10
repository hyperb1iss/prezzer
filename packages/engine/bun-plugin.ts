import type { BunPlugin } from 'bun'

const peerDependency = /^(?:motion|react|react-dom)(?:\/.*)?$/

const prezzerPlugin: BunPlugin = {
  name: 'prezzer-peer-dependencies',
  setup(builder) {
    builder.onResolve({ filter: peerDependency }, ({ path }) => ({
      path: Bun.resolveSync(path, process.cwd()),
    }))
  },
}

export default prezzerPlugin
