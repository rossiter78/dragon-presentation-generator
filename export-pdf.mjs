/* The deck, as a PDF you can send someone.

   One page per SECTION, fully built — not one per beat. A progressive
   reveal is a flipbook once it stops being driven by a person, and nobody
   pages through seventy-odd frames of the same slide growing a line at a
   time. What lands in the PDF is each section the way the room finally saw
   it.

   RASTER, DELIBERATELY. Each page is a screenshot, so the export cannot
   drift from the deck: the dark theme, the vendored faces, the measured red
   ramp, motion's settled positions and the split layout all arrive exactly
   as projected, and no second print stylesheet has to be kept in sync with
   a layout tuned for a 100dvh snap section. The cost is real — the text is
   not selectable and not searchable. If you want prose a reader can follow
   unaided, that is a different artifact: what is on screen is fragments of
   six words by design, and they mean very little without the `notes`
   beside them. See DESIGN.md, "What is deliberately not built yet".

   Captured with `?cadence=0`, which builds every section the instant you
   arrive instead of cascading its beats. Same final pixels as the deck on
   stage — the cascade is a way of arriving at a section, not a different
   section — but it removes 30 seconds of waiting and, more to the point,
   any chance of shooting a section that was still assembling itself.

   Section counts come off the page (window.__deck, published in main.tsx),
   exactly as in verify.mjs — nothing here mirrors the deck by hand, so
   adding a section adds a page and no edit is needed in this file.

   Run `npm run preview` in one terminal, then `npm run export:pdf`.

     OUT=dir     where the page PNGs and the wrapper land  (shots-pdf)
     PDF=path    the file to write                         (OUT/deck.pdf)
     BASE=url    the deck to capture                       (preview server)
     SCALE=n     source pixels per CSS pixel               (2)

   BASE with `?contrast=high` exports the projector rescue variant, should
   you ever want that one as a file. */
import { chromium } from 'playwright'
import { mkdirSync, writeFileSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const OUT = process.env.OUT || 'shots-pdf'
const BASE = process.env.BASE || 'http://localhost:4173'
const PDF = process.env.PDF || `${OUT}/deck.pdf`
/* Source pixels per CSS pixel. 2 keeps the deck crisp when a reader opens
   the file full-screen on a high-density display, which is where it is
   actually going to be looked at. SCALE=1 is about a third the size. */
const SCALE = Number(process.env.SCALE || 2)

/* Captured at projector aspect... */
const W = 1600
const H = 900
/* ...and printed at PowerPoint's 16:9 page — 13.333in x 7.5in at 96dpi.
   Same picture either way; this is just the page size every PDF reader and
   every slide tool already expects to be handed. */
const PAGE_W = 1280
const PAGE_H = 720

/* With cadence=0 every beat of a section is set at once, but motion still
   animates them in over 0.5s. Wait that out before the shutter. */
const SETTLE_MS = 700

mkdirSync(OUT, { recursive: true })

const browser = await chromium.launch(
  process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {},
)
const ctx = await browser.newContext({
  viewport: { width: W, height: H },
  deviceScaleFactor: SCALE,
})
const page = await ctx.newPage()

const errors = []
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
page.on('pageerror', (e) => errors.push(String(e)))

// Built instantly rather than cascading — see the header. Appended via URL
// so a BASE that already carries ?contrast=high keeps it.
const target = new URL(BASE)
target.searchParams.set('cadence', '0')

await page.goto(target.href, { waitUntil: 'networkidle' })
await page.evaluate(() => document.fonts.ready)
await page.waitForTimeout(400)

const deck = await page.evaluate(() => window.__deck)
if (!deck) throw new Error('window.__deck missing — is main.tsx publishing it?')

/* The frame is furniture for a live driver. The brand mark stays: it was on
   every slide the room saw, and it is branding rather than an affordance.
   The mode switch, the notes button and the key legend go, and so does the
   rail — its markers are buttons, and offering an interaction the reader
   cannot perform is worse than offering none, which is the deck's own rule
   applied to a file. Injected here rather than added to the app's
   stylesheet, so the export cannot change how anything behaves on stage. */
await page.addStyleTag({
  content: '.chrome--tools, .rail { display: none !important; }',
})

/* Crossing a section boundary is a smooth scroll, and a screenshot taken
   mid-flight is the one failure this export can have that still produces a
   plausible-looking file. Two identical scroll positions 80ms apart is the
   cheap, honest way to know it landed. */
async function scrollSettled() {
  let last = -1
  for (let i = 0; i < 40; i++) {
    const top = await page.evaluate(
      () => document.querySelector('.scroller')?.scrollTop ?? 0,
    )
    if (top === last) return true
    last = top
    await page.waitForTimeout(80)
  }
  return false
}

/* --- walk the deck, one page per section -------------------------------- */

const pages = []
const stalled = []
/* Sections that went to film with fewer fragments on screen than the deck
   says they have. Without this the failure mode is silent and expensive: if
   `cadence=0` ever stopped taking effect, every page would still render, in
   the right order, at the right size, just half empty — and you would find
   out from whoever you sent it to. */
const short = []

for (let s = 0; s < deck.length; s++) {
  // The section built itself on arrival; one press moves to the next.
  if (!(await scrollSettled())) stalled.push(deck[s].id)
  await page.waitForTimeout(SETTLE_MS)

  /* Counted by visible opacity, not by element count. Every fragment is
     mounted from beat 0 so the column never reflows while it builds, which
     means counting elements would report a full section even on a page
     that came out blank. The reveal lives on the wrapping .beat. */
  const [onScreen, figures] = await page.evaluate(() => {
    const sec = document.querySelector('.section[data-active]')
    if (!sec) return [0, 0]
    const seen = (selector) =>
      [...sec.querySelectorAll(selector)].filter((el) => {
        const holder = el.closest('.beat') ?? el
        return Number(getComputedStyle(holder).opacity) > 0.5
      }).length
    return [seen('.line, .title__sub'), seen('.shot')]
  })
  if (onScreen < deck[s].lines || figures < deck[s].figures) {
    short.push(`${deck[s].id} (${onScreen}/${deck[s].lines} lines, ${figures}/${deck[s].figures} figures)`)
  }

  const file = `${String(s + 1).padStart(2, '0')}-${deck[s].id}.png`
  await page.screenshot({ path: `${OUT}/${file}` })
  pages.push({ file, title: deck[s].title })

  if (s < deck.length - 1) {
    await page.keyboard.press('Space') // into the next section
    await scrollSettled()
  }
}

/* --- what looking at the last page would not tell you -------------------- */

const broken = (
  await page.evaluate(() =>
    [...document.querySelectorAll('img.shot__img')]
      .filter((i) => !(i.complete && i.naturalWidth > 0))
      .map((i) => i.getAttribute('src')),
  )
).filter(Boolean)
const pending = await page.locator('.shot__pending').count()
const docTitle = await page.title()

/* --- assemble ------------------------------------------------------------
   One image per page at exactly the page size. `line-height: 0` and a block
   image kill the inline baseline gap, which is what otherwise pushes each
   page a few pixels over the sheet and leaves a blank one between every
   slide. */

const esc = (s) =>
  String(s).replace(
    /[&<>"]/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c],
  )

// Chromium takes the document title as the PDF's Title metadata, which is
// what a reader's window chrome and file manager will show.
const html = `<!doctype html>
<meta charset="utf-8">
<title>${esc(docTitle)}</title>
<style>
  @page { margin: 0 }
  html, body { margin: 0; padding: 0; background: #000 }
  .page {
    width: ${PAGE_W}px; height: ${PAGE_H}px;
    overflow: hidden; line-height: 0;
    break-after: page; page-break-after: always;
  }
  .page:last-child { break-after: auto; page-break-after: auto }
  img { display: block; width: ${PAGE_W}px; height: ${PAGE_H}px }
</style>
${pages
  .map((p) => `<div class="page"><img src="${esc(p.file)}" alt="${esc(p.title)}"></div>`)
  .join('\n')}
`

const htmlPath = resolve(OUT, 'deck.html')
writeFileSync(htmlPath, html)

const printer = await ctx.newPage()
await printer.goto(pathToFileURL(htmlPath).href, { waitUntil: 'networkidle' })
await printer.pdf({
  path: PDF,
  width: `${PAGE_W}px`,
  height: `${PAGE_H}px`,
  printBackground: true,
})

await browser.close()

/* --- report -------------------------------------------------------------- */

const mb = (statSync(PDF).size / 1024 / 1024).toFixed(1)
const say = (ok, label) => console.log(`${ok ? 'OK  ' : 'WARN'}  ${label}`)

console.log('')
say(true, `${pages.length} pages, one per section, captured at ${W}x${H}@${SCALE}x`)
say(true, `page size ${PAGE_W}x${PAGE_H}px — 13.333in x 7.5in, 16:9`)
say(
  short.length === 0,
  `every section fully built when shot${short.length ? ` (short: ${short.join('; ')})` : ''}`,
)
say(
  stalled.length === 0,
  `scroll settled on every section${stalled.length ? ` (late: ${stalled.join(', ')})` : ''}`,
)
say(
  broken.length === 0,
  `every screenshot decoded${broken.length ? ` (broken: ${broken.join(', ')})` : ''}`,
)
say(
  pending === 0,
  `${pending} shot(s) still to be taken — those pages carry an empty frame`,
)
say(
  errors.length === 0,
  errors.length ? `console errors:\n${errors.join('\n')}` : 'no console errors',
)
console.log('')
console.log(`${resolve(PDF)}  (${mb} MB)`)
console.log(`pages and wrapper in ${OUT}/`)

if (broken.length || stalled.length || short.length) process.exitCode = 1
