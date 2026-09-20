/* Produce a dark-background version of a wordmark.
   -------------------------------------------------------------------------
     node make-wordmark.mjs <source.svg> [out.svg] [lettering-hex]

   Most brand wordmarks are drawn for light backgrounds, with the lettering
   in pure black. On a dark deck that lettering simply disappears.

   So the black is swapped for the theme's --text and NOTHING ELSE is
   touched — any brand colour in the mark stays exactly as drawn. This is the
   same adaptation the theme already makes for every other piece of type in
   a dark inversion, applied to the one asset that carries its colours inside
   the file rather than in CSS.

   Derived, not hand-edited, so it can be rebuilt when the mark is redrawn.
*/
import { writeFile, readFile } from 'node:fs/promises'

const [srcArg, outArg, letteringArg] = process.argv.slice(2)

if (!srcArg) {
  console.error('usage: node make-wordmark.mjs <source.svg> [out.svg] [lettering-hex]')
  process.exit(1)
}

const SRC = srcArg
const OUT = outArg || 'public/brand/wordmark-dark.svg'

/** The colour to replace. Black in most wordmarks; pass a third argument if
 *  yours draws its lettering in something else. */
const LETTERING = letteringArg || '#000000'
const ON_DARK = '#F0EEEE' // --text in both shipped themes

const src = await readFile(SRC, 'utf8')

const before = (src.match(new RegExp(LETTERING, 'gi')) || []).length
if (before === 0) {
  throw new Error(
    `no ${LETTERING} found in the source — has the wordmark been redrawn? ` +
      'Check which colour the lettering uses before trusting this script.',
  )
}

const out = src.replace(new RegExp(LETTERING, 'gi'), ON_DARK)

const red = (out.match(/#C0222E/gi) || []).length
await writeFile(OUT, out)

console.log(`wrote ${OUT}`)
console.log(`  lettering  ${before} x ${LETTERING} -> ${ON_DARK}`)
console.log(`  brand red  ${red} x #C0222E left untouched`)
