# Dragon Presentation Generator

A presentation engine where **your talk is typed data** and the stage layer
never knows what it is about.

Built for conference talks you give from a laptop on a projector, on a
network you do not control. Keyboard-driven, offline by default, and verified
by walking every beat in a real browser.

```bash
npm install
npm run dev
```

That opens the example deck — a talk *about* this engine, where every section
demonstrates the feature it describes. Drive it with the arrow keys and read
[`src/content/talk.ts`](src/content/talk.ts) alongside it.

---

## Is this for you?

**Probably not**, and that is worth saying first. [reveal.js][], [Slidev][]
and [Marp][] are mature, actively maintained, and better at almost
everything. Use one of them unless you want all four of these:

1. **Content as typed data.** Slides everywhere else are markup. A
   restructure that breaks a renderer gives you a blank panel in rehearsal;
   here it gives you a compile error.
2. **Behavioural verification.** `npm run verify` walks every beat in a real
   browser and asserts that fragments render, images decode, nothing reflows
   under an audience mid-build, and the presenter window still drives the
   deck.
3. **Keyboard-only by rule.** Every other tool offers hover and click
   affordances. This one refuses them, because a cursor on a projector is
   invisible to the room and a clicker has two buttons.
4. **Time budgets from the content file**, per section, on the second screen,
   turning amber when you overrun.

The honest test: does your talk want bespoke interactive diagrams? If yes,
this earns its keep. If no, it probably does not.

[reveal.js]: https://revealjs.com
[Slidev]: https://sli.dev
[Marp]: https://marp.app

---

## The interaction model

**One keypress per section.** You arrive, the section builds itself — its
beats cascade in order — and one press takes you to the next section. You are
not clicking through bullets while the room watches you nod at your laptop.

| Key | Does |
|---|---|
| `→` `Space` `PageDown` `N` | next section |
| `←` `PageUp` `Backspace` `P` | previous section |
| `1`–`9` | expand a detail, where a section has them |
| `0` / `Esc` | close it |
| `Enter` | rebuild this section; replay its animation |
| `R` | read mode — everything revealed, scrollable, for sharing the link |
| `S` | presenter window on the second screen |
| `C` | projector rescue mode — see the URL flags below |
| `F` | fullscreen |

`PageUp`/`PageDown` are there because that is what most presentation clickers
emit. `↑`/`↓` scroll the page in the deck window and are **not** bound to
anything there; they move sections in the **presenter window**, where there is
nothing to scroll and your hands already are.

There is no key that fires a single beat — beats arrive on their own — and no
`?` for this list. The legend lives behind the ☰ button, which you press at a
desk, not on stage.

URL flags, all of which survive a reload:

- `?contrast=high` — projector rescue mode, for when the venue optics crush
  every dark tone into mud. `C` toggles the same thing live, which is the one
  you will actually use, two minutes before you start.
- `?theme=<id>` — any theme in `src/theme/`, by filename. Also a dropdown in
  the ☰ menu; the deck starts in whatever `talk.config.ts` names.
- `?cadence=ms` — how fast a section builds. Default 250; `0` is instant.
- `?scale=` / `?notesScale=` — text size in percent (70–150) for the deck and
  the presenter window, separately. Set them with the two sliders in the ☰
  menu; the notes one is also in the presenter window. Browser zoom cannot
  do this: it is per site, so zooming one window zooms both.
- `?mode=read` / `?notes=1` — read mode and the presenter window directly.
- `?mirror=1` — the deck as a passenger: follows the real deck, drives
  nothing. The presenter window embeds it as its replica of the projector;
  you should not need it directly.

---

## Writing a talk

Everything you write is in two files.

### 1. `src/deck/talk.config.ts` — the nameplate

Title, slug, logo, favicon, theme. Twelve strings that used to be scattered
across six files. Change them and rebuild: the tab, the favicon, the PDF's
filename and metadata, the presenter window's title and the deck's colours
all follow from here — there is no second file to remember.

### 2. `src/content/talk.ts` — the talk

Every word the audience reads. A section looks like this:

```ts
section({
  id: 'one-keypress',
  title: 'One keypress per section',
  content: {
    kind: 'body',
    open: 'Empty section. The heading only.',
    items: [
      line('A section builds itself on arrival', {
        sub: ['Beats cascade', 'No clicking through bullets'],
      }),
      line('The deck never waits on you mid-thought', { lead: true }),
      figure(screenshot, { alt: '…', caption: '…' }),
    ],
  },
  budgetMinutes: 2,
  notes: ['The prose lives here, where only you see it.'],
})
```

**One item, one beat, in the order written — pictures last.** Every figure
and graphic goes at the end of `items`, after all the lines. On stage the claim
lands before the picture that proves it. In the file, the words you edit most
sit together, without a figure's options in the middle of them. `section()`
enforces this: a line after a picture fails at startup, naming the section.

### The copy rule

**What goes on screen is a fragment, not a sentence.** Six words is a good
target, twelve is the ceiling. The audience cannot read a paragraph and listen
to you at the same time; they will do one or the other, and reading wins.

Full sentences go in `notes`, on your second screen.

You will want to break this on the slide where the point is complicated. That
is the slide where it matters most.

---

## Porting a deck you already have

Most first talks here are not written from scratch — they are a PowerPoint you
have already given. That works, but it is a translation, not an import, and
the places it stops being one-to-one are predictable.

**Read the `.pptx` as the zip it is.** No library needed:

```bash
unzip -o -q talk.pptx -d out/
```

`ppt/slides/slideN.xml` holds the text — walk the `<a:p>` and `<a:t>` runs,
and the `lvl` attribute gives you the indent level. `ppt/media/*` holds every
embedded image. `ppt/slides/_rels/slideN.xml.rels` is what tells you which
media file belongs to which slide, which you need and cannot guess. A short
Node script turns all of that into per-slide text and image manifests.

**Then the judgement calls, which no script makes for you:**

- **One slide, two screenshots, is the normal case and has no clean
  translation.** Both images land in one figure column and shrink until
  neither can be read. Almost always the answer is to split the slide into
  two sections. The exception is a pair of narrow, same-aspect assets — two
  portrait phone screenshots side by side read fine. The rule is not "never
  two," it is "never two when either one has to be read."
- **A `title` section makes a good mid-deck divider**, not just an opener. If
  you are merging two decks, a part-break that looks like a beginning reads
  better than a body slide with three bullets on it, and it costs no new
  renderer.
- **Every PowerPoint sentence has somewhere to go.** The fragment goes on
  screen, the original sentence goes verbatim into `notes`. Nothing is lost
  in the port; it is relocated. If you find yourself deleting a sentence
  rather than moving it, you are editing the talk, which is a different job
  and worth knowing you have started.
- **Look at every extracted image before you write its `alt`.** A diagram, a
  screenshot and a code block need very different descriptions, and the alt
  text is all a screen-reader user gets.

**Two habits that pay for themselves:**

- `npm run build` after each section, not at the end. `tsc -b` catches a
  mistyped builder immediately, while you still know what you meant.
- Check figures in the DOM, not in a screenshot. A missing or mis-scaled
  image looks like whitespace in a screenshot and like nothing at all in your
  memory of it — `img.naturalWidth` in the console is one line and does not
  lie.

And test at the size you will present at. The default browser window is not
16:9; a section that fits it can still clip top and bottom at 1280×720.

---

## What ships

Five patterns and three diagrams, all data-driven. Use one, or write your own
and register it — see `EXTRA_RENDERERS` in the example content file.

| Renderer | The shape it carries |
|---|---|
| `title` | The opening card. One hero line, nothing competing. |
| `body` | The workhorse: heading, fragments, optional figure column. |
| `chat` | One input, two recipients, divergent outcomes — any "it depends who you ask" claim. Replays on `Enter`. |
| `cake` | A stack of layers, floor up, any of them split into pieces; each piece expands on its number key. The Q&A slide. |
| `caveat` | The honest-limitation block: claim, failures, defences, close. |

| Graphic | Draws |
|---|---|
| `agent-ring` | N peers, fully meshed, messages in flight. **Animated** — see below. |
| `deploy-path` | Laptop → repo → a machine with nested VM and containers. |
| `phone-home` | A phone home screen with one app that is yours. |

**On the animated one.** `agent-ring` is the only graphic that moves, and the
rule it illustrates is worth stating: motion is allowed when motion *is* the
content. Messages crossing between peers are the thing a mesh does. A tapping
fingertip on the phone graphic was drawn and then deleted, because it animated
a gesture the room had already understood and pulled the eye off the argument
every few seconds.

---

## Layout

```
src/
  content/talk.ts        ← YOUR TALK. Everything the audience reads.
  content/*.png          ← your screenshots
  content/logos/         ← your logos and favicon (git-ignored; see its README)
  deck/
    talk.config.ts       ← YOUR NAMEPLATE. Title, slug, logo, theme.
    content-types.ts     the contract: Beat, LineItem, section(), line()…
    registry.ts          name → component, and the startup check
  stage/                 beat machine, keyboard, present/read, presenter window
  components/            renderers and patterns
  theme/
    _base.css            shared; no colours chosen here (partial, not a theme)
    dark-blue.css             the default — neutral, with a measured contrast table
    dark-red.css         a second worked example, from a real brand
                         every theme here ships; pick one in the settings
                         menu, with ?theme=<id>, or as `theme` in talk.config
verify.mjs               walks every beat and asserts what rendered
export-pdf.mjs           one page per section, via real Chromium
DeployToHereNow.mjs      publishes dist/ to a here.now site
```

Roughly 90/10 by volume. The 10% is the talk.

---

## Before you present

`verify` and the PDF export drive a real Chromium through Playwright. `npm
install` gets the Playwright *package*; the browser itself is a separate
~200MB download, once per machine:

```bash
npx playwright install chromium
```

Skip it and the first `npm run verify` on a clean clone fails immediately
with `browserType.launch: Executable doesn't exist`.

**On a slow or shared network**, that download can fail outright — Playwright
gives each request about 30 seconds, and 200MB does not land in 30 seconds on
a busy conference or campus connection. The failure says `Download failure,
code=1` and does not mention timeouts, so it reads like an outage. Raise the
limit:

```bash
PLAYWRIGHT_DOWNLOAD_CONNECTION_TIMEOUT=600000 npx playwright install chromium
```

Then, every time:

```bash
npm run build          # tsc -b and the theme check first, so errors stop you here
npm run preview        # serve the build on :4173
npm run verify         # in a second terminal — walks every beat
```

- [ ] Read the screenshots `verify` writes to `shots/`. That is the cheapest
      way to see what the room will see.
- [ ] Every `pending` frame filled, or deliberately left as a gap.
- [ ] Budgets totalled against the slot. A 40-minute slot is about 28 minutes
      of talk.
- [ ] Rehearsed against the presenter window (`S`), on two displays, with the
      clock running. Beside the notes it shows a replica of the projector,
      so you can check the build without turning round.
- [ ] Open the presenter window first, *then* take the deck fullscreen on
      the projector. The replica lays out at the deck's window size and
      reshapes when it changes; check it did.
- [ ] Your logos in `src/content/logos/` (symbol only, and one with the
      company name), pointed at in `talk.config.ts` — or `logo.src: null`
      for none. The folder is git-ignored apart from the placeholders.

**Present from `npm run preview`.** Never `file://`, never venue wifi. And
build first — preview serves whatever was last built.

---

## Publishing to here.now

`DeployToHereNow.mjs` uploads the built deck to [here.now](https://here.now)
so it has a shareable URL — handy for sending the deck to people after the
talk. It uses Node's built-in `fetch`, so there is nothing extra to install.

1. Put your here.now API key in the `HERENOW_API_KEY` environment variable.
   Never commit it.

   ```bash
   # macOS / Linux / Git Bash
   export HERENOW_API_KEY=your-key-here
   ```

   ```powershell
   # PowerShell
   $env:HERENOW_API_KEY = "your-key-here"
   ```

2. Build, then publish the output folder:

   ```bash
   npm run build
   node DeployToHereNow.mjs <slug> dist
   ```

`<slug>` is the here.now site to update; the folder defaults to `dist` if
omitted. The script hashes every file and uploads only what changed, then
finalizes the new version and prints the response.

- It **updates an existing site** (a `PUT` to `/api/v1/publish/<slug>`); it
  does not create one. Create the site on here.now first.
- The published copy is for sharing afterwards. **Present from
  `npm run preview`**, not from the hosted URL — the offline rule still holds.

---

## Traps worth knowing

Each of these cost something to find once.

- **Beats are derived, never counted.** `section()` builds the beat list from
  the items. Nothing — not the rail, not the presenter window, not the
  verifier — mirrors a count by hand. Keep it that way.
- **One owner per animated property.** `motion` writes inline styles, which
  beat stylesheet rules. A property animated in a component must not also be
  set in CSS, and the verifier asserts the *computed* value, because an
  attribute test would not have caught it.
- **A brand colour is usually a fill, not a text colour.** Most brand palettes
  are specified for light backgrounds and fail WCAG on a dark one. Keep the
  brand colour for fills and derive a lifted ramp for anything read. Both
  shipped themes carry their measured numbers in the header comment.
- **`preview` serves the last build.** Edit content, refresh, see the old
  deck. `dev` hot-reloads but never type-checks; `build` runs `tsc -b` first.
- **`preview` uses `--strictPort` on purpose.** If 4173 is taken it fails
  rather than sliding to 4174 — otherwise `verify` cheerfully tests whatever
  *other* deck is on 4173 and passes. `verify` prints the deck title it found
  for the same reason.
- **The notes window needs its own key listener.** It is a separate browser
  window with its own event loop; the deck's listener cannot see keys pressed
  in it. This was a real bug and the verifier guards it.
- **Offline is a requirement.** Self-hosted fonts, local mark, local static
  server. Assume the venue network is not there. The deck must never fetch
  anything to draw itself.

More, with the reasoning, in [DESIGN.md](DESIGN.md).

---

## Licence

MIT — see [LICENSE](LICENSE).

The `placeholder-*.svg` files in `src/content/logos/` are placeholders drawn for this repo. A
logo is a trademark and your repo's licence does not cover it: if you publish
a talk built on this, use a mark you own.
