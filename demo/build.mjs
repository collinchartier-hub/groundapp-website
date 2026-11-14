#!/usr/bin/env node
// Builds the product demos into site/. Run `npm run build` in demo/ and commit what changes in site/.
// The built files carry a version in their names (7-day edge cache): bump VERSION when the output changes
// after a release, and update the references in site/js/home-v7.js. They are named `.min.` because they
// are minified bundles with React inside: the studio's check-tells.py skips `.min.` files, and reads the source here.
import { build, context } from 'esbuild'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const VERSION = 1
const NAME = `app-demo-v${VERSION}.min`
const here = dirname(fileURLToPath(import.meta.url))
const site = resolve(here, '..', 'site')

// What is bundled into the script, and the licence each one ships with. Their notices travel with the
// built file as one text file beside it.
const BUNDLED = [
  ['React', 'node_modules/react/LICENSE'],
  ['React DOM', 'node_modules/react-dom/LICENSE'],
  ['Scheduler', 'node_modules/scheduler/LICENSE'],
  ['Lucide', 'node_modules/lucide-react/LICENSE'],
  ['Stageshow kit', 'kit/LICENSE'],
]

const options = {
  absWorkingDir: here,
  entryPoints: { [`js/${NAME}`]: 'src/mount.tsx' },
  outdir: site,
  entryNames: '[dir]/[name]',
  bundle: true,
  format: 'esm',
  // The browser versions lower the CSS: nesting is written out flat, so a browser that runs the script
  // also reads the styles. site/js/home-v7.js only loads the demos where the kit's own CSS works.
  target: ['es2022', 'chrome99', 'safari15.4', 'firefox97'],
  minify: true,
  jsx: 'automatic',
  define: { 'process.env.NODE_ENV': '"production"' },
  legalComments: 'none',
  banner: { js: `/*! Includes React, Lucide and the Stageshow kit. Licences: /js/${NAME}.licenses.txt */` },
  logLevel: 'info',
}

const finish = {
  name: 'finish',
  setup(b) {
    b.onEnd(async (result) => {
      if (result.errors.length) return
      // The stylesheet lands beside the site's other CSS, not next to the script.
      await mkdir(resolve(site, 'assets/css'), { recursive: true })
      await rename(resolve(site, `js/${NAME}.css`), resolve(site, `assets/css/${NAME}.css`))
      const notices = await Promise.all(
        BUNDLED.map(async ([name, file]) => `${name}\n${'='.repeat(name.length)}\n\n${(await readFile(resolve(here, file), 'utf8')).trim()}\n`),
      )
      await writeFile(resolve(site, `js/${NAME}.licenses.txt`), `Third-party software in /js/${NAME}.js and /assets/css/${NAME}.css\n\n${notices.join('\n\n')}`)
    })
  },
}

if (process.argv.includes('--watch')) {
  const ctx = await context({ ...options, plugins: [finish] })
  await ctx.watch()
} else {
  await build({ ...options, plugins: [finish] })
}
