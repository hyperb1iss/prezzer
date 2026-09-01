import { describe, expect, test } from 'bun:test'
import { resolve } from 'node:path'

// npm publish (the release workflow's publisher) ships manifests verbatim:
// unlike bun publish it never rewrites catalog: or workspace: protocols, so
// any published dependency field carrying one produces a tarball consumers
// cannot install.
const publishablePackages = ['engine', 'create-prezzer']
const publishedFields = ['dependencies', 'peerDependencies', 'optionalDependencies'] as const

describe('publishable manifests', () => {
  for (const packageName of publishablePackages) {
    test(`${packageName} carries no workspace-only protocols in published fields`, async () => {
      const manifest = await Bun.file(
        resolve(import.meta.dir, `../packages/${packageName}/package.json`)
      ).json()

      for (const field of publishedFields) {
        for (const [name, spec] of Object.entries(manifest[field] ?? {})) {
          expect(`${field}.${name}=${spec}`).not.toContain('catalog:')
          expect(`${field}.${name}=${spec}`).not.toContain('workspace:')
        }
      }
    })
  }
})
