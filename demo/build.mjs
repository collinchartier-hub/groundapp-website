#!/usr/bin/env node
// Builds the product demo into site/. Run `npm run build` in demo/ and commit what changes in site/.
// The built files carry a version in their names (7-day edge cache): bump VERSION when the output changes
// after a release, and update the two references in site/js/home-v7.js. They are named `.min.` because they
// are minified bundles with React inside: the studio's check-tells.py skips `.min.` files, and reads the source here.
import { build, context } from 'esbuild'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const VERSION = 1
const NAME = `app-demo-v${VERSION}.min`
const here = dirname(fileURLToPath(import.meta.url))
const site = resolve(here, '..', 'site')

const options = {
  absWorkingDir: here,
  entryPoints: { [`js/${NAME}`]: 'src/mount.tsx' },
  outdir: site,
  // The stylesheet lands beside the site's other CSS, not next to the script.
  entryNames: '[dir]/[name]',
  bundle: true,
  format: 'esm',
  target: 'es2022',
  minify: true,
  jsx: 'automatic',
  define: { 'process.env.NODE_ENV': '"production"' },
  legalComments: 'none',
  logLevel: 'info',
}

const moveCss = {
  name: 'css-to-assets',
  setup(b) {
    b.onEnd(async (result) => {
      if (result.errors.length) return
      const { rename, mkdir } = await import('node:fs/promises')
      await mkdir(resolve(site, 'assets/css'), { recursive: true })
      await rename(resolve(site, `js/${NAME}.css`), resolve(site, `assets/css/${NAME}.css`))
    })
  },
}

if (process.argv.includes('--watch')) {
  const ctx = await context({ ...options, plugins: [moveCss] })
  await ctx.watch()
} else {
  await build({ ...options, plugins: [moveCss] })
}
