# Engine feedback — from porting a real talk

Written after using dragon-presentation-generator for the first time: two
PowerPoint decks (`MCP_AI_HighLevel.pptx`, `New_AI_Features.pptx`) ported
into one 23-section, 51-minute talk in `src/content/talk.ts`. Everything
below was hit first-hand, not inferred from reading the source.

**Purpose of this file:** hand it to a session that works on the engine
itself (not on talk content). It is a punch list, ranked by how much it cost
this session, each with a repro and a concrete fix. Delete it once acted on
— it is not meant to become permanent repo furniture.

---

## Part A — defects (things that are just wrong)

### 1. `dark-red.css` didn't compile — the second "worked example" theme was never built

`src/theme/dark-red.css` ended mid-comment at line 118 (`unclosed comment`,
`CssSyntaxError`). The moment I pointed `main.tsx` at it, `npm run build`
failed. The token set itself was complete — only the trailing comment block
was truncated — so this reads as a copy-paste or save error that nothing
ever caught, because **nothing has ever built with this theme active**. The
default (`dark-blue.css`) is the only theme this repo's own tooling exercises.

Fix I applied: closed the comment. Real fix: add a CI/pretest step that
builds against every file in `src/theme/`, not just whichever one
`main.tsx` currently imports — otherwise a second unused theme can rot
indefinitely.

### 2. `TALK.title` and `TALK.favicon` are dead fields

`talk.config.ts` line ~19 says: *"NOTHING ABOUT THE ARGUMENT LIVES HERE...
this is the one place the deck says who it is."* False for two of six
fields. `index.html` hardcodes both:

```html
<link rel="icon" href="./brand/favicon.svg" />
<title>Dragon Presentation Generator</title>
```

Nothing reads `TALK.title` or `TALK.favicon` anywhere in `src/`. I confirmed
with `grep -rn "TALK\.title\|TALK\.favicon" src/` — zero hits outside the
config file itself. Only `TALK.logo`, `TALK.slug` (via `PDF_FILENAME`,
`CHANNEL`) are actually wired up.

Consequence: change the config, rebuild, and the browser tab and favicon
still show the *previous* talk's identity — I hand-edited `index.html`
twice this session to work around it, which is exactly the six-file
scavenger hunt the config file claims to have eliminated.

Fix: read `TALK.title`/`TALK.favicon` in `main.tsx` at startup
(`document.title = TALK.title`; swap the `<link rel="icon">` href via the
DOM) rather than in static HTML — same pattern already used for `CHANNEL`
and `PDF_FILENAME`. Or, if a build-time swap is preferred, do it in
`vite.config.ts` via `transformIndexHtml`.

### 3. A section's `logo` field is silently ignored by every renderer except `Body`

`SectionMeta.logo` is documented as "a logo at the foot of the words
column" — no mention that it only applies to one `content.kind`. It's read
in exactly one place, [`src/components/Body.tsx:81-85`](src/components/Body.tsx). Set it on a
`title` or `caveat` or `cake` section and it does nothing — no warning, no
error, just an unused prop.

I hit this directly: I put `logo` on the opening `title` card, and it never
rendered. Nothing told me why until I went looking.

Fix: either (a) move the logo-rendering into the shared section shell so
every renderer gets it for free, or (b) have `assertRegistry()` (or a
sibling check) warn when `meta.logo` is set on a `content.kind` that
doesn't consume it — the same spirit as the existing unknown-renderer
check, just for an unused field instead of an unknown one.

### 4. `figure(...)`'s `scale` is a 1–100 percentage; passing a 0–1 fraction fails silently

[`src/deck/content-types.ts:85-92`](src/deck/content-types.ts):

```ts
const SCALE_MIN = 1
const SCALE_MAX = 100
export function scaleFactor(scale) {
  const n = Math.min(SCALE_MAX, Math.max(SCALE_MIN, scale))
  return n / 100
}
```

I wrote `scale: 0.8` meaning "80%," the natural reading if you haven't read
this comment block. It clamped to `SCALE_MIN = 1`, rendering the figure at
**1×3 pixels**. No warning, no dev-mode error — a figure that is simply gone.
I found it by querying `img.clientWidth` in the browser console; the
screenshot alone made it look like a layout gap, not a broken image.

This is a classic 0–1-vs-0–100 footgun and the clamping — deliberately
designed so "a typo should make one slide look wrong in rehearsal, not
blank the deck" — didn't actually deliver on that promise, because a figure
shrunk to 1px doesn't look wrong, it looks *absent*, which reads as "I
haven't added that image yet" rather than "I have a bug."

Fix: warn (console, dev-mode only) when `scale` is a number strictly
between 0 and 1 exclusive — that range is never a legitimate value (1 is
the floor) and is the single most likely typo. A one-line heuristic catches
this without touching the clamping behavior.

### 5. Two figures/graphics in one section's column both become unreadable — no guard

Nothing stops a section from carrying two `figure()` items. When it does,
they share the figure column and both shrink until neither is legible —
I hit this twice, once with two Denodo tool screenshots on one slide, once
with two Claude Connector screenshots. Both times the fix was structural
(split into two sections), not a sizing tweak.

The one case where two figures in a column *does* work is a pair of
narrow, same-aspect assets — I used it deliberately for two portrait phone
screenshots side by side, and it read fine there. So the rule isn't "never
two," it's "never two when either one needs to be read."

Fix: not a hard block (the phone-screenshot case is legitimate), but
`verify.mjs` or a dev-time console warning when a section has >1 figure/
graphic item, prompting the author to check it at real aspect ratio before
trusting it.

### 6. The `caveat` pattern has no overflow guard against real viewport heights

The first draft of a `caveatSection()` I wrote overflowed a 1280×720
viewport — the "Known limitation" flag clipped at the top and the closing
line collided with the bottom chrome bar. This only became visible when I
tested at `resize_window(1280, 720)`; the default browser-pane size (800×
450-ish) never showed it.

Root cause was too much copy for the pattern (3 failures + 3 long defence
texts + a long claim), which the component makes no attempt to constrain —
it just grows past the viewport with `overflow: visible` implied.

Fix: either cap the pattern's content at authoring time (validate string
lengths / array sizes in `caveatSection()`, similar to how `LineItem` fields
are documented with word-count guidance but not enforced), or give the
`.caveat__block` a `max-height` with internal scroll so an overlong caveat
degrades instead of clipping. `verify.mjs` walking at a realistic 16:9
viewport size and asserting no element overflows the viewport would have
caught this automatically.

### 7. The presenter-window key legend and the actual key range disagree

[`src/stage/Chrome.tsx:219`](src/stage/Chrome.tsx:219):
`<kbd>1</kbd>–<kbd>6</kbd> expand a detail`

[`src/stage/StageProvider.tsx:293`](src/stage/StageProvider.tsx:293):
`if (/^[1-9]$/.test(e.key))`

The code accepts 1–9; the on-screen legend (the only in-app help — there is
no separate `?` key, see #10 below) says 1–6. `README.md` matches the code
(1–9), so the drift is in the UI, not the docs. Small, but it's the kind of
thing a presenter discovers live when they press `7` expecting nothing and
get a surprise.

### 8. `README.md`'s key table lists keys that don't exist, and omits ones that do

Already flagged before content work started, still true at time of
writing:

- `Home` / `End` → "first / last section" — **not implemented anywhere in
  `src/`.** No handler exists.
- `↓` / `↑` → next/previous — only wired in the *presenter notes* window
  ([`src/stage/PresenterNotes.tsx:65-66`](src/stage/PresenterNotes.tsx:65)), not the main deck.
- `?` → key legend — no such handler. The legend lives behind the
  hamburger button in `Chrome.tsx`, mouse-only, which directly contradicts
  the README's own sales pitch ("refuses hover and click affordances").
- Undocumented but real: `n`/`p` (next/prev), `Backspace` (prev), `c`
  (toggle high contrast — the README implies this is URL-flag-only via
  `?contrast=high`), `f` (fullscreen).

### 9. Nothing in the README mentions installing Playwright's browser binary

`npm ci` installs the `playwright` **npm package** but not the ~200MB
browser binary `verify.mjs`/`export-pdf.mjs` actually launch. First run of
`npm run verify` on a clean clone fails immediately:

```
browserType.launch: Executable doesn't exist at ...chrome-headless-shell.exe
```

with Playwright's own remediation banner telling you to run
`npx playwright install`. README's "Before you present" checklist
(currently: `npm run build`, `npm run preview`, `npm run verify`) should
list this as a one-time setup step before `npm run verify` is ever usable.

### 10. On a slow or throttled connection, `npx playwright install` fails outright — no retry, no resumable download, no guidance

This one cost real time in this session and is worth writing down in
detail because the failure mode is misleading.

The download target (`chrome-win64.zip`, ~196MB, served via
`cdn.playwright.dev` → 307-redirect to `storage.googleapis.com`) has a
**hardcoded ~30-second-per-request socket timeout** in
`playwright-core/lib/coreBundle.js`. On a connection doing a real,
sustained ~1–1.5MB/s (verified independently with `curl`, which *did*
succeed at that speed on 1–2MB range requests), a 196MB file physically
cannot land inside 30 seconds. Playwright retries the whole request from
zero a few times, then gives up with `Download failure, code=1` — a
message that gives no hint the actual cause was a timeout, not a network
outage. It happened identically from two different working directories,
which briefly looked like a "wrong directory" problem and wasn't.

There *is* an escape hatch —
`PLAYWRIGHT_DOWNLOAD_CONNECTION_TIMEOUT` (milliseconds) — found by reading
`coreBundle.js` directly; it is not mentioned in this repo's README or
`CLAUDE.md` at all, and Playwright's own CLI error message doesn't surface
it either. It resolved cleanly once the user moved to a faster network, so
the fix genuinely was bandwidth, not configuration — but a corporate/campus
network slower than ~7MB/s will hit this exact wall on the very first
`npm run verify`.

Suggested fix for this repo specifically (Playwright itself is a third
party — this is about softening the first-run experience of *this*
project):
- Note `PLAYWRIGHT_DOWNLOAD_CONNECTION_TIMEOUT` in the README's setup
  section, next to the `npx playwright install` step, with a one-line
  "on a slow network, try `PLAYWRIGHT_DOWNLOAD_CONNECTION_TIMEOUT=600000
  npx playwright install chromium`."
- Consider whether `verify.mjs`/`export-pdf.mjs` could degrade gracefully
  (clear one-line message pointing at that env var) instead of the raw
  Playwright stack trace when the executable is missing.

---

## Part B — real, but lower-cost or a matter of taste

### 11. Brand placeholder SVGs hardcode a colour, so they go off-brand the instant you switch themes

`public/brand/mark.svg` / `favicon.svg` ship with `fill="#2F6FED"` baked
in — `dark-blue.css`'s `--brand` blue, literally. `Chrome.tsx` loads the mark
via `<img src="...">`
([`src/stage/Chrome.tsx:176-179`](src/stage/Chrome.tsx:176)), so the SVG is an opaque raster
as far as CSS is concerned — it cannot inherit `currentColor` or any theme
token even if the file used one. Swap `main.tsx` to `dark-red.css` (all
reds) and the corner mark stays defaultly-blue until someone manually
redraws or recolors the asset.

This is arguably fine for a *real* brand mark (a logo has fixed colours by
definition), but the *placeholder* asset shipped in the repo pretending to
be theme-neutral example content is not theme-neutral, and nothing in
`public/brand/README.md` flags that swapping `main.tsx`'s theme import
does not touch the mark.

### 12. `wordmark-dark.svg` is documented but doesn't exist in a fresh clone

`public/brand/README.md` lists three files in its table — `mark.svg`,
`favicon.svg`, `wordmark-dark.svg` — and a generator script,
`make-wordmark.mjs`, exists to produce the third. Only the first two ship.
Setting `logo: { src: 'brand/wordmark-dark.svg', ... }` on a section (the
documented pattern) 404s silently — the `<img>` just doesn't render, same
failure shape as #3 and #4: broken assets in this engine tend to fail by
vanishing, not by erroring.

`make-wordmark.mjs` itself is well-written and does what it says (swaps a
literal `#000000` for the theme's `--text`), but assumes the source SVG's
lettering has an *explicit* black fill. A wordmark exported from
PowerPoint (which is what a real user will have) commonly has **no `fill`
attribute at all** on its text paths — it relies on the SVG default of
black — and the script correctly refuses with a clear error in that case
("no #000000 found... has the wordmark been redrawn?"). That's good
behavior, but it means the script cannot actually be used unmodified on a
typical PPTX-exported logo; I ended up hand-writing a one-off splitter
script instead. Might be worth having `make-wordmark.mjs` also match an
*absent* fill attribute (i.e., paths that inherit the default black) as a
second case, since that's probably the common one in practice.

### 13. A PowerPoint slide with two screenshots is the normal case, and the engine has no first-class answer for it

Porting two separate source decks, I hit "one slide, two images" **three
separate times**, and the fix was always the same manual move: split the
slide into two sections. That's a fine outcome, but it means porting a
PPTX 1:1 is never actually 1:1 — every multi-image slide needs a judgment
call the engine doesn't help with (see also #5). Not necessarily something
to fix in code, but worth naming in the README's advice for anyone doing
what I just did, since "port an existing deck" is presumably a real
use case for this engine, not just "write one from scratch."

### 14. There's no guidance anywhere for merging two decks into one, but it's an easy pattern once you've done it once

I inserted a transition using `content.kind: 'title'` — the same pattern
the deck's own opening card uses — reasoning that a part-divider should
look like a beginning, not like a body slide with a short bullet list. That
worked well and cost nothing extra (no new renderer, no registry change).
Worth adding one sentence to the README/DESIGN.md under "Writing a talk":
*"A `title` section works as a mid-deck part-divider too, not only as the
opener."* It isn't discoverable from the current docs — I only tried it
because I'd already seen the pattern on slide 1.

---

## Part C — the workflow that worked, for the next person porting a deck

Recording this because it wasn't obvious going in, and the answer turned
out to be a short, repeatable loop:

1. **Unzip the `.pptx` directly** (`unzip -o -q file.pptx -d out/`) rather
   than reaching for a PowerPoint-reading library. It's a zip of OOXML —
   `ppt/slides/slideN.xml` for text (walk `<a:p>`/`<a:t>` runs, `lvl`
   attribute for indent), `ppt/media/*` for every embedded image, and
   `ppt/slides/_rels/slideN.xml.rels` to know which media file belongs to
   which slide. A ~30-line Node script gets clean per-slide text + image
   manifests out of any deck this way with no dependency beyond `unzip`.
2. **Read every extracted image before writing captions/alt text.** Several
   images in both source decks needed direct inspection to write accurate
   `alt` — a diagram vs. a screenshot vs. a code block reads very
   differently, and the alt text is the only thing a screen-reader user or
   the PDF export's accessibility layer gets.
3. **One fragment on screen, the source sentence verbatim in `notes`.**
   This is the README's stated rule and it holds up — every `line()` in
   the ported deck is ≤6 words, and every full PPTX sentence survived,
   unedited, in that section's `notes` array, so nothing was lost, just
   relocated.
4. **Always test at a real projector aspect, not just the default pane
   size.** `resize_window({width: 1280, height: 720})` caught the caveat
   overflow (#6) that the default pane size hid completely. Do this before
   calling a section "reviewed."
5. **`npm run build` after every content change**, not just at the end —
   `tsc -b` catches typed-builder mistakes (`cakeSection`, `caveatSection`)
   immediately, before they reach the browser.
6. **DOM-inspect figures, don't just screenshot them.** The scale bug (#4)
   and both dropped-images-from-`file://` mistakes were invisible in
   screenshots — a screenshot of missing content just looks like
   whitespace. `img.naturalWidth`/`clientWidth` via `javascript_tool` catches
   it in one line.
