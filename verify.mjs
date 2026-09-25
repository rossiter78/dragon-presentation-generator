/* Visual + behavioural smoke test. Walks the deck at projector aspect ratio,
   screenshots every section, and asserts the things that are easy to break
   and impossible to notice until you are on stage.

   It walks the deck the way you do: it waits for each section to BUILD
   ITSELF and then presses once to leave. So the two assertions that matter
   most here are not about pixels — that a section reaches its full fragment
   count with no keypress at all, and that one keypress lands on exactly the
   next section and never two.

   Deck shape and cascade timing are READ OFF THE PAGE (window.__deck and
   window.__stage) rather than mirrored here by hand — one less place for
   them to be wrong, and a mirrored timing constant fails as flake.

   Run `npm run preview` in one terminal, then `node verify.mjs`. */
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const OUT = process.env.OUT || 'shots'
const BASE = process.env.BASE || 'http://localhost:4173'
mkdirSync(OUT, { recursive: true })

// PW_CHROMIUM lets CI point at a preinstalled browser; normally unset.
const browser = await chromium.launch(
  process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {},
)
const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 } })
const page = await ctx.newPage()

const errors = []
const watch = (p) => {
  p.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
  p.on('pageerror', (e) => errors.push(String(e)))
}
watch(page)

await page.goto(BASE, { waitUntil: 'networkidle' })
await page.waitForTimeout(400)

const deck = await page.evaluate(() => window.__deck)
// The page's own error first: a content rule that throws at startup (an
// unknown renderer, a picture before a line) is why __deck is missing, and
// it names the section at fault.
if (!deck)
  throw new Error(
    errors.length
      ? `the deck failed to start:\n  ${errors.join('\n  ')}`
      : 'window.__deck missing — is main.tsx publishing it?',
  )

/* SAY WHICH DECK WE FOUND, before asserting anything about it.
   `preview` serves the last BUILD, and if you have two decks on one machine
   it is entirely possible to verify the wrong one and get a clean pass. The
   preview script uses --strictPort so a busy 4173 fails loudly rather than
   sliding to 4174 — but printing the title costs one line and closes the
   gap for anyone running a server by hand. */
console.log(
  `deck: "${deck[0]?.title ?? '?'}" — ${deck.length} sections, ` +
    `${deck.reduce((n, d) => n + d.beats, 0)} beats  @ ${BASE}\n`,
)

// A fragment is a .line everywhere except the opening card, where the
// subtitle is set as display type.
const FRAGMENT = '.line, .title__sub'

/* Counted by what the AUDIENCE can see, not by what is in the DOM.
   Everything is mounted from beat 0 now — `hold` reserves each fragment's
   space so the column never reflows mid-cascade — so counting elements
   would return the full set at every beat and assert nothing at all. The
   reveal is an opacity on the wrapping .beat, so that is what gets read.
   DESIGN.md §7: if a test can only see the attribute, it is not testing
   what the audience sees. */
const countVisible = (sel) =>
  page.evaluate((selector) => {
    const sec = document.querySelector('.section[data-active]')
    if (!sec) return 0
    return [...sec.querySelectorAll(selector)].filter((el) => {
      const holder = el.closest('.beat') ?? el
      return Number(getComputedStyle(holder).opacity) > 0.5
    }).length
  }, sel)

/* --- walk the whole deck ------------------------------------------------ */

const headings = [] // heading on screen at each section, as the audience sees it
const builtLines = [] // fragments visible in a fully built section
const builtFigures = []
/** Sections that took more than one keypress to leave, or fewer. */
const misStepped = []
/** Sections that shoved already-visible content while building. */
const shifted = []

/* Timing read off the page rather than mirrored here — see the comment on
   window.__stage in StageProvider. */
const timing = await page.evaluate(() => window.__stage)
if (!timing) throw new Error('window.__stage missing — is StageProvider publishing it?')
const buildMs = (beats) => timing.leadIn + beats * timing.cadence + timing.reveal + 250

/* Layout position of every fragment in the active section, plus whether the
   audience can see it yet.

   offsetTop rather than getBoundingClientRect: the former is LAYOUT
   position and ignores transforms, so an element's own 18px rise-in does
   not register as the page moving. Reflow is what this is hunting. */
const samplePositions = () =>
  page.evaluate(() => {
    const sec = document.querySelector('.section[data-active]')
    if (!sec) return []
    return [...sec.querySelectorAll('.line, .title__sub, .layer, .shot, .graphic')].map((el) => {
      let y = 0
      for (let n = el; n && n !== sec; n = n.offsetParent) y += n.offsetTop
      const holder = el.closest('.beat') ?? el
      return { y, vis: Number(getComputedStyle(holder).opacity) > 0.5 }
    })
  })

/** Largest distance any ALREADY-VISIBLE element moved across the frames. */
function displacement(frames) {
  let worst = 0
  const n = Math.max(...frames.map((f) => f.length), 0)
  for (let i = 0; i < n; i++) {
    const ys = frames.filter((f) => f[i]?.vis).map((f) => f[i].y)
    if (ys.length > 1) worst = Math.max(worst, Math.max(...ys) - Math.min(...ys))
  }
  return worst
}

for (let s = 0; s < deck.length; s++) {
  /* NO KEYPRESS HERE. The section is supposed to build itself; if it does
     not, the counts below come up short and the run fails.

     Sampled rather than slept through, so the same wait also answers the
     other question: did anything the audience was already reading move
     while the rest of the slide arrived? */
  const frames = []
  const steps = Math.max(2, deck[s].beats + 2)
  for (let k = 0; k < steps; k++) {
    frames.push(await samplePositions())
    await page.waitForTimeout(timing.cadence + 40)
  }
  await page.waitForTimeout(timing.reveal)
  const moved = displacement(frames)
  if (moved > 2) shifted.push(`${deck[s].id} ${moved}px`)

  const active = page.locator('.section[data-active]')
  headings.push((await active.locator('h1, h2').first().textContent())?.trim())
  builtLines.push(await countVisible(FRAGMENT))
  builtFigures.push(await countVisible('.shot'))

  await page.screenshot({
    path: `${OUT}/${String(s).padStart(2, '0')}-${deck[s].id}.png`,
  })

  if (s < deck.length - 1) {
    // One press, one section — the thing the whole cadence design is for.
    await page.keyboard.press('Space')
    await page.waitForTimeout(950) // smooth scroll across the boundary
    const landed = await page.evaluate(
      () => document.querySelector('.section[data-active]')?.id,
    )
    if (landed !== deck[s + 1].id) {
      misStepped.push(`${deck[s].id} → ${landed ?? 'nowhere'} (wanted ${deck[s + 1].id})`)
    }
  }
}

/* --- every screenshot actually decoded ---------------------------------- */

const images = await page.evaluate(() =>
  [...document.querySelectorAll('img.shot__img')].map((i) => ({
    src: i.getAttribute('src'),
    ok: i.complete && i.naturalWidth > 0,
  })),
)
const pending = await page.locator('.shot__pending').count()

/* --- read mode reveals everything --------------------------------------- */

await page.goto(`${BASE}/?mode=read`, { waitUntil: 'networkidle' })
await page.waitForTimeout(700)
const readLines = await page.locator(FRAGMENT).count()
const readFigures = await page.locator('.shot').count()

/* --- presenter window drives the deck via the keyboard ------------------ */

// Back to a fresh deck in PRESENT mode first, so the demo walk below starts
// from the top rather than from wherever read mode left the scroller.
await page.goto(BASE, { waitUntil: 'networkidle' })
await page.waitForTimeout(400)

const notes = await ctx.newPage()
watch(notes)
await notes.goto(`${BASE}/?notes=1`, { waitUntil: 'networkidle' })
await notes.bringToFront() // a background tab cannot be screenshotted
await notes.waitForTimeout(500)
/* The section title, not the beat label: a keypress is now worth a whole
   section, and .notes__label is not unique on a slide carrying a demo. */
const titleBefore = (await notes.locator('.notes__title').textContent())?.trim()
await notes.keyboard.press('ArrowRight')
await notes.waitForTimeout(1100)
const titleAfter = (await notes.locator('.notes__title').textContent())?.trim()
await notes.screenshot({ path: `${OUT}/92-presenter-notes.png` })

/* The replica of the projector, under the notes' Back / Next. It is the deck
   again under ?mirror=1, following the broadcasts — so it must be standing on
   the section the notes say we are on, and must not have stepped a second
   deck of its own (which would put the two a section apart). */
const mirror = notes.frameLocator('.notes__mirror iframe')
const mirrorTitle = (
  await mirror.locator('section[data-active]').getAttribute('aria-label')
)?.trim()
/* The notes window is a whole screen on the night, so it is laid out wide:
   the replica BESIDE the notes, not under them, and whole on screen without
   scrolling — it is the thing you glance at with your back to the room. */
const notesLayout = await notes.evaluate(() => {
  const main = document.querySelector('.notes__main').getBoundingClientRect()
  const box = document.querySelector('.notes__mirrorBox').getBoundingClientRect()
  return {
    beside: box.left >= main.right,
    onScreen: box.top >= 0 && box.bottom <= window.innerHeight,
    width: Math.round(box.width),
    window: window.innerWidth,
  }
})
await notes.locator('.notes__mirror').scrollIntoViewIfNeeded()
await notes.screenshot({ path: `${OUT}/94-presenter-mirror.png` })

// The demo banner only exists on the slides where a demo happens. Walk the
// deck FROM THE NOTES WINDOW until it says we are standing on one, which
// also exercises the relay under repeated keypresses.
//
// A deck need not have a demo slide. When it has none there is nothing to
// assert, and these two checks are SKIPPED rather than pointed at an
// arbitrary section — an assertion that cannot fail is worse than no
// assertion, because it reads as coverage.
//
// The relay itself is still tested: the arrow-key check above does that,
// and it does not depend on a demo existing.
const demoSection = deck.find((d) => d.demo)
let notesTitle = ''
for (let i = 0; demoSection && i < deck.length && notesTitle !== demoSection.title; i++) {
  await notes.keyboard.press('PageDown')
  // A press is a section now, so this has to outlast the smooth scroll;
  // at the old beat-sized 260ms the presses stack up and overshoot.
  await notes.waitForTimeout(1000)
  notesTitle = (await notes.locator('.notes__title').textContent())?.trim()
}
const demoBanner = demoSection ? await notes.locator('.notes__demo').count() : 0
if (demoSection) await notes.screenshot({ path: `${OUT}/93-presenter-demo.png` })

/* --- text size, per window ---------------------------------------------
   Browser zoom is per origin, so it cannot size the projector and the
   laptop apart; these sliders can. Asserted on the COMPUTED root font size
   in each document — the thing rem-sized text actually follows — and in
   both directions for the notes size, since it can be set from either
   window and each has to hear the other. */
const rootPx = (target) =>
  target.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize))
const mirrorFrame = notes.frames().find((f) => f.url().includes('mirror=1'))
const near = (a, b) => Math.abs(a - b) < 0.05
/* Where a slider sits on screen. A slider that moves when its own value
   changes slides out from under the pointer mid-drag — so each one must be
   standing exactly where it was after the scale it sets has changed. */
const at = async (target, sel) =>
  target.evaluate((s) => {
    const r = document.querySelector(s).getBoundingClientRect()
    return [r.x, r.y, r.width].map((n) => Math.round(n)).join(',')
  }, sel)

await page.bringToFront()
const basePx = await rootPx(page)
const notesBasePx = await rootPx(notes)
const notesSliderAt = await at(notes, '#notes-scale')
await page.locator('.chip--ghost').click() // the hamburger
const deckSliderAt = await at(page, '#deck-scale')
await page.locator('#deck-scale').fill('130')
await page.waitForTimeout(400)
const deckScaled = await rootPx(page)
const deckSliderAfter = await at(page, '#deck-scale')
const mirrorScaled = mirrorFrame ? await rootPx(mirrorFrame) : NaN
const notesUntouched = await rootPx(notes)

await page.locator('#notes-scale').fill('120')
await page.waitForTimeout(400)
const notesFromMenu = await rootPx(notes)
await page.screenshot({ path: `${OUT}/95-menu-text-size.png` })

await notes.bringToFront()
await notes.locator('#notes-scale').fill('90')
await notes.waitForTimeout(400)
const notesFromOwn = await rootPx(notes)
const notesSliderAfter = await at(notes, '#notes-scale')

// And scrolled to the bottom, at the largest size so there is a page to
// scroll — the bar is pinned so reaching the replica does not take it away.
await notes.locator('#notes-scale').fill('150')
await notes.waitForTimeout(300)
const notesScrolled = await notes.evaluate(() => {
  window.scrollTo(0, document.documentElement.scrollHeight)
  return window.scrollY
})
await notes.waitForTimeout(200)
const notesSliderScrolled = await at(notes, '#notes-scale')
await notes.evaluate(() => window.scrollTo(0, 0))
await notes.locator('#notes-scale').fill('90')
await notes.waitForTimeout(300)
const menuHeard = await page.locator('#notes-scale').inputValue()
const deckStill = await rootPx(page)
await notes.screenshot({ path: `${OUT}/96-notes-text-size.png` })

// Both survive a reload, from the deck's URL.
await page.bringToFront()
await page.reload({ waitUntil: 'networkidle' })
await page.waitForTimeout(400)
const deckReloaded = await rootPx(page)
const reloadedParams = new URL(page.url()).searchParams

/* --- high contrast ------------------------------------------------------ */

await page.bringToFront()
await page.goto(`${BASE}/?contrast=high&mode=read`, { waitUntil: 'networkidle' })
await page.waitForTimeout(600)
await page.screenshot({ path: `${OUT}/91-readmode-highcontrast.png` })

await browser.close()

/* --- assertions --------------------------------------------------------- */

const totalLines = deck.reduce((t, d) => t + d.lines, 0)
const totalFigures = deck.reduce((t, d) => t + d.figures, 0)
const wrongLines = deck.filter((d, i) => builtLines[i] !== d.lines).map((d) => d.id)
const wrongFigures = deck
  .filter((d, i) => builtFigures[i] !== d.figures)
  .map((d) => d.id)
const wrongHeading = deck.filter((d, i) => headings[i] !== d.title).map((d) => d.id)
const brokenImages = images.filter((i) => !i.ok).map((i) => i.src)

const checks = [
  [`${deck.length} sections walked, ${deck.reduce((t, d) => t + d.beats, 0)} beats`, true],
  [
    `every section builds itself with no keypress (${wrongLines.join(', ') || 'all ok'})`,
    wrongLines.length === 0,
  ],
  [
    `one keypress moves exactly one section (${misStepped.join('; ') || 'all ok'})`,
    misStepped.length === 0,
  ],
  [
    `no reveal shifts content already on screen (${shifted.join('; ') || 'all ok'})`,
    shifted.length === 0,
  ],
  [`every figure arrives in the cascade (${wrongFigures.join(', ') || 'all ok'})`, wrongFigures.length === 0],
  [`each section shows its own heading (${wrongHeading.join(', ') || 'all ok'})`, wrongHeading.length === 0],
  [`every screenshot decodes (${brokenImages.join(', ') || 'all ok'})`, brokenImages.length === 0],
  [`${pending} shot(s) still to be taken`, true],
  ['read mode reveals every fragment', readLines === totalLines],
  ['read mode reveals every figure', readFigures === totalFigures],
  [
    `arrow key in notes window advances the deck (${titleBefore} → ${titleAfter})`,
    titleBefore !== titleAfter,
  ],
  [
    `the replica in the notes window follows the deck (${mirrorTitle})`,
    mirrorTitle === titleAfter,
  ],
  [
    `the replica sits beside the notes, whole on screen (${notesLayout.width}px wide in ${notesLayout.window}px)`,
    notesLayout.beside && notesLayout.onScreen,
  ],
  ...(demoSection
    ? [
        [
          `reached “${demoSection.title}” from the notes window`,
          notesTitle === demoSection.title,
        ],
        ['the demo banner reaches the presenter window', demoBanner === 1],
      ]
    : [['no demo slide in this deck — demo banner checks skipped', true]]),
  [
    `slide text size scales the deck (${basePx}px → ${deckScaled}px at 130%)`,
    near(deckScaled, basePx * 1.3),
  ],
  [
    `the replica takes the deck's text size (${mirrorScaled}px)`,
    near(mirrorScaled, basePx * 1.3),
  ],
  [
    `slide text size leaves the notes window alone (${notesUntouched}px)`,
    near(notesUntouched, notesBasePx),
  ],
  [
    `notes text size set from the deck's menu reaches the notes window (${notesFromMenu}px at 120%)`,
    near(notesFromMenu, notesBasePx * 1.2),
  ],
  [
    `notes text size set in the notes window applies there and reaches the menu (${notesFromOwn}px, menu ${menuHeard}%)`,
    near(notesFromOwn, notesBasePx * 0.9) && menuHeard === '90' && near(deckStill, basePx * 1.3),
  ],
  [
    `the slide size slider holds still while the deck rescales (${deckSliderAt} → ${deckSliderAfter})`,
    deckSliderAt === deckSliderAfter,
  ],
  [
    `the notes size slider holds still while the notes rescale (${notesSliderAt} → ${notesSliderAfter})`,
    notesSliderAt === notesSliderAfter,
  ],
  notesScrolled > 0
    ? [
        `the notes size slider stays pinned when the window scrolls ${notesScrolled}px (${notesSliderScrolled})`,
        notesSliderScrolled === notesSliderAt,
      ]
    : ['notes window too short to scroll at 150% — pinned-bar check skipped', true],
  [
    `both text sizes survive a reload (scale=${reloadedParams.get('scale')}, notesScale=${reloadedParams.get('notesScale')})`,
    near(deckReloaded, basePx * 1.3) && reloadedParams.get('notesScale') === '90',
  ],
]
for (const [label, ok] of checks) console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}`)
console.log(errors.length ? 'CONSOLE ERRORS:\n' + errors.join('\n') : 'no console errors')
console.log(`screenshots in ${OUT}/`)
if (checks.some(([, ok]) => !ok)) process.exitCode = 1
