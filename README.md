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
| `→` `↓` `Space` `PageDown` | next section |
| `←` `↑` `PageUp` | previous section |
| `Home` / `End` | first / last section |
| `1`–`9` | expand a detail, where a section has them |
| `0` / `Esc` | close it |
| `Enter` | rebuild this section; replay its animation |
| `R` | read mode — everything revealed, scrollable, for sharing the link |
| `S` | presenter window on the second screen |
| `?` | key legend |

URL flags, all of which survive a reload:

- `?contrast=high` — projector rescue mode, for when the venue optics crush
  every dark tone into mud. Decide this in rehearsal, not at the lectern.
- `?cadence=ms` — how fast a section builds. Default 250; `0` is instant.
- `?mode=read` / `?notes=1` — read mode and the presenter window directly.

---

## Writing a talk

Everything you write is in two files.

### 1. `src/deck/talk.config.ts` — the nameplate

Title, slug, logo, favicon. Twelve strings that used to be scattered across
six files.

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
      figure(screenshot, { alt: '…', caption: '…' }),
      line('The deck never waits on you mid-thought', { lead: true }),
    ],
  },
  budgetMinutes: 2,
  notes: ['The prose lives here, where only you see it.'],
})
```

**One item, one beat, in the order written.** If an image should land between
two lines, write it between them — that interleaving is a directing decision
and it belongs in the content file.

### The copy rule

**What goes on screen is a fragment, not a sentence.** Six words is a good
target, twelve is the ceiling. The audience cannot read a paragraph and listen
to you at the same time; they will do one or the other, and reading wins.

Full sentences go in `notes`, on your second screen.

You will want to break this on the slide where the point is complicated. That
is the slide where it matters most.

---

## What ships

Five patterns and three diagrams, all data-driven. Use one, or write your own
and register it — see `EXTRA_RENDERERS` in the example content file.

| Renderer | The shape it carries |
|---|---|
| `title` | The opening card. One hero line, nothing competing. |
| `body` | The workhorse: heading, fragments, optional figure column. |
| `chat` | One input, two recipients, divergent outcomes — any "it depends who you ask" claim. Replays on `Enter`. |
| `cake` | A stack of named layers, expandable on the number keys. The Q&A slide. |
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
  deck/
    talk.config.ts       ← YOUR NAMEPLATE. Title, slug, logo.
    content-types.ts     the contract: Beat, LineItem, section(), line()…
    registry.ts          name → component, and the startup check
  stage/                 beat machine, keyboard, present/read, presenter window
  components/            renderers and patterns
  theme/
    base.css             shared; no colours chosen here
    dark.css             the default — neutral, with a measured contrast table
    lds-dark.css         a second worked example, from a real brand
public/brand/            your mark and favicon (placeholders ship)
verify.mjs               walks every beat and asserts what rendered
export-pdf.mjs           one page per section, via real Chromium
```

Roughly 90/10 by volume. The 10% is the talk.

---

## Before you present

```bash
npm run build          # tsc -b first, so type errors stop you here
npm run preview        # serve the build on :4173
npm run verify         # in a second terminal — walks every beat
```

- [ ] Read the screenshots `verify` writes to `shots/`. That is the cheapest
      way to see what the room will see.
- [ ] Every `pending` frame filled, or deliberately left as a gap.
- [ ] Budgets totalled against the slot. A 40-minute slot is about 28 minutes
      of talk.
- [ ] Rehearsed against the presenter window (`S`), on two displays, with the
      clock running.
- [ ] Your own mark in `public/brand/`, or `logo.src: null` for none.

**Present from `npm run preview`.** Never `file://`, never venue wifi. And
build first — preview serves whatever was last built.

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

The brand assets in `public/brand/` are placeholders drawn for this repo. A
logo is a trademark and your repo's licence does not cover it: if you publish
a talk built on this, use a mark you own.
