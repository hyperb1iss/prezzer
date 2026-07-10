import { $ } from 'bun'

await $`rm -rf dist`

const result = await Bun.build({
  entrypoints: [
    './src/index.ts',
    './src/chrome/index.ts',
    './src/widgets/registry.tsx',
    './src/theme/tokens.ts',
    './src/motion/animations.ts',
  ],
  root: './src',
  outdir: './dist',
  target: 'browser',
  format: 'esm',
  packages: 'external',
  splitting: true,
  sourcemap: 'external',
})

if (!result.success) {
  for (const log of result.logs) console.error(log)
  process.exit(1)
}

await $`tsc -p tsconfig.build.json`
await Bun.write('./dist/styles.css', Bun.file('./src/styles.css'))
