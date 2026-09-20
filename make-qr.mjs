/* Generate a QR code with your brand mark in the middle.
   -------------------------------------------------------------------------
     node make-qr.mjs <url> [out.svg] [mark.svg]

   For the closing slide, usually — a link the room can photograph while you
   take questions. Scripted rather than done once by hand: a QR you cannot
   regenerate is a QR you cannot correct.

   The generated file is content, so it lands in src/content/ and is
   imported like any other asset.

   WHY A LOGO IN THE MIDDLE WORKS AT ALL
   QR codes carry Reed-Solomon error correction, so a decoder can rebuild
   modules it cannot see. Covering the centre is therefore survivable — the
   centre is the safest place to cover, because the three finder squares in
   the corners and the timing lines along row/column 6 are what a scanner
   uses to LOCATE the code, and losing those is fatal rather than merely
   lossy.

   THE TRADE, AND IT IS A REAL ONE
   More error correction means more modules for the same URL, and more
   modules at a fixed printed size means SMALLER modules, which scans worse
   at distance. So this is not free:

     level M  15% recovery   version 4   33x33   (no logo)
     level Q  25% recovery   version 5   37x37   (this file)
     level H  30% recovery   version 7   45x45

   Q is the middle: 25% recovery against a logo that covers about 7% of the
   data modules — a wide margin — while staying meaningfully coarser than H
   would be. The logo is sized from that budget, not by eye.

   THE MARK, NOT THE WORDMARK
   A QR centre wants something square. A typical wordmark is roughly 2.2:1,
   so at any width narrow enough to be safe it would be illegible. The
   wordmark goes on the slide itself instead; the icon goes here.
*/
import QRCode from 'qrcode'
import { writeFile, readFile } from 'node:fs/promises'

const [urlArg, outArg, markArg] = process.argv.slice(2)

if (!urlArg) {
  console.error('usage: node make-qr.mjs <url> [out.svg] [mark.svg]')
  process.exit(1)
}

const URL = urlArg
const OUT = outArg || 'src/content/qr.svg'
const MARK = markArg || 'public/brand/mark.svg'

/** Fraction of the code's width the white logo panel occupies. 0.22 keeps
 *  the covered area near 7% of the data modules, well inside Q's 25%. */
const PANEL = 0.22
/** The mark sits inside the panel with a little breathing room, so the panel
 *  reads as a deliberate white plate rather than a smudge on the code. */
const INSET = 0.8

const qr = await QRCode.toString(URL, {
  type: 'svg',
  errorCorrectionLevel: 'Q',
  // The spec's quiet zone. Scanners use it to find the code's edges; cutting
  // it to look tidier is the classic way to make a QR stop working.
  margin: 4,
  color: { dark: '#000000', light: '#FFFFFF' },
})

/* --- work out the geometry from the generated code, never by hand ------- */

const viewBox = qr.match(/viewBox="0 0 (\d+(?:\.\d+)?) /)
if (!viewBox) throw new Error('could not read the QR viewBox')
const size = Number(viewBox[1])

const panel = size * PANEL
const panelXY = (size - panel) / 2
const logo = panel * INSET
const logoXY = (size - logo) / 2

/* --- inline the mark, rather than <image href="data:..."> ---------------
   An SVG used as an <img> src renders in a restricted mode where nested
   references are unreliable. Inlining the mark's own paths sidesteps the
   question entirely: the result is one self-contained file that cannot
   half-load. */

const markSrc = await readFile(MARK, 'utf8')
const markBox = markSrc.match(
  /viewBox="(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)"/,
)
if (!markBox) throw new Error(`could not read the viewBox in ${MARK}`)
const [, mx, my, mw, mh] = markBox.map(Number)

// Map the mark's own coordinate system into the logo box.
const scale = logo / Math.max(mw, mh)
const tx = logoXY - mx * scale
const ty = logoXY - my * scale

const markInner = markSrc.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '')

const composed = qr.replace(
  '</svg>',
  `<rect x="${panelXY.toFixed(3)}" y="${panelXY.toFixed(3)}" ` +
    `width="${panel.toFixed(3)}" height="${panel.toFixed(3)}" fill="#FFFFFF"/>` +
    `<g transform="translate(${tx.toFixed(4)} ${ty.toFixed(4)}) scale(${scale.toFixed(6)})">` +
    markInner +
    `</g></svg>`,
)

await writeFile(OUT, composed)

const meta = await QRCode.create(URL, { errorCorrectionLevel: 'Q' })
const modules = meta.modules.size
const coveredPct = ((panel / size) ** 2 * (size / modules) ** 2 * 100).toFixed(1)

console.log(`wrote ${OUT}`)
console.log(`  url       ${URL}`)
console.log(`  version   ${meta.version} (${modules}x${modules} modules, level Q)`)
console.log(`  logo      ${(PANEL * 100).toFixed(0)}% of width, covering ~${coveredPct}% of area`)
console.log(`  NOTE: decode it before trusting it — see the check in the talk repo.`)
