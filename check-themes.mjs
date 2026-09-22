/* ==========================================================================
   Every theme compiles, and every theme is scoped to itself.
   --------------------------------------------------------------------------
   Two failures this catches, both of which used to be invisible:

   1. A THEME THAT DOES NOT PARSE. A theme used to be selected by an import
      in main.tsx, which meant every other theme in this directory was read
      by nothing. lds-dark.css sat in the repo with an unclosed comment — a
      hard CssSyntaxError — through a green build, and failed for the first
      person who tried to USE it. Vite's own CSS pipeline runs over each file
      here as its own entry: same parser, same @import resolution, same
      errors, without waiting for someone to select the theme first.

   2. A THEME THAT IS NOT SCOPED. Every theme now ships in the bundle at once
      (DESIGN.md §8), so its tokens must sit under its own [data-theme]
      value. A bare `:root` block sets tokens for every OTHER theme too, and
      that is not visible from inside the theme that has it — only from
      inside the ones it quietly overrides. The filename is the id, so this
      is checkable exactly.

   Runs ahead of `npm run build`. Add a theme and it is covered the moment
   you save it, with no list to remember to update.
   ========================================================================== */

import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { build } from 'vite'

const DIR = 'src/theme'

/* A leading underscore marks a PARTIAL: element rules, no tokens, imported
   by the themes rather than selected between. It still has to compile — a
   broken partial breaks every theme that imports it — but it is exempt from
   the scoping rule, because it is not a theme. Same convention themes.ts
   globs on, so the two agree about what a theme is. */
const isPartial = (f) => f.startsWith('_')

function scopeErrors(file) {
  const id = file.replace(/\.css$/, '')
  // Strip comments first, so a selector quoted in prose is not read as code.
  const code = readFileSync(join(DIR, file), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
  const scope = `[data-theme='${id}']`
  const errors = []

  for (const [, selector] of code.matchAll(/^\s*(:root[^{]*)\{/gm)) {
    const s = selector.trim()
    if (!s.includes(scope)) {
      errors.push(`${s} is not scoped to ${scope} — it would apply to every other theme too.`)
    }
  }

  if (errors.length === 0 && !code.includes(scope)) {
    errors.push(`nothing here is scoped to ${scope}, so selecting '${id}' renders an unstyled deck.`)
  }
  return errors
}

const files = readdirSync(DIR)
  .filter((f) => f.endsWith('.css'))
  .sort()

if (files.length === 0) {
  console.error(`No .css files in ${DIR}/ — is that right?`)
  process.exit(1)
}

let failed = 0

for (const file of files) {
  const path = join(DIR, file)
  try {
    await build({
      logLevel: 'silent',
      configFile: false,
      build: { write: false, rollupOptions: { input: path } },
    })

    const errors = isPartial(file) ? [] : scopeErrors(file)
    if (errors.length > 0) {
      failed++
      console.error(`  FAIL  ${path}`)
      for (const e of errors) console.error(`        ${e}`)
    } else {
      console.log(`  ok    ${path}${isPartial(file) ? '  (partial)' : ''}`)
    }
  } catch (err) {
    failed++
    console.error(`  FAIL  ${path}`)
    console.error(`        ${err.message.split('\n').join('\n        ')}`)
  }
}

if (failed > 0) {
  console.error(`\n${failed} of ${files.length} files in ${DIR}/ are not usable.`)
  process.exit(1)
}

console.log(`${files.length} files in ${DIR}/ compile, and every theme is scoped to itself.`)
