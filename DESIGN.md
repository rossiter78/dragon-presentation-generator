# Design principles

The rules this presentation is built on, and why each one exists. Written
down so the next session — content tuning, then the first real build — does
not relitigate decisions that were already paid for, and does not quietly
break one of them.

Status: all four acts of `outline.md` are transposed — twenty-seven sections,
a hundred and twenty-one beats. The mechanics are settled.

---

## 1. The presentation is a document with beats, not a deck

It scrolls. Sections are full-height snap targets. But within a section,
content arrives one **beat** at a time — never on scroll position.

Why not scroll: a trackpad on a lectern, a clicker that emits PageDown, and an
unknown projector are three reasons never to let scroll offset decide when
something reveals. Scroll-driven reveals fire early, fire twice, or strand you
halfway between two states in front of the room.

**A section builds itself on arrival.** Its beats cascade in order at a fixed
CADENCE — `CADENCE_MS` in `StageProvider.tsx`, 250ms — and stop when the
section is whole. A keypress moves to the next SECTION and never to the next
beat.

This is the one rule here that was revised after rehearsal, so the reasoning
on both sides is worth keeping. Beats originally fired on keypresses, which
is deterministic and rehearses identically every time. It is also 121
keypresses across this talk, and the cost lands entirely on the speaker:
tracking how many presses a slide owes you is attention spent on the
mechanism rather than the room. The staged reveal earns its keep — the layer
cake assembling itself reads far better than the finished diagram dropped on
screen — but the reveal was worth having and the clicking was not.

So the cascade is automatic and the slide change is deliberate. Determinism
is preserved where it actually mattered: a cascade is the same every time it
runs, because it is driven by a timer and not by how fast you press.

**Advancing mid-cascade goes to the next section**, not to the end of the
current one. One press means one slide, always. A press that sometimes
completes a slide and sometimes changes it is exactly the variable click
count this replaced.

`?cadence=ms` tunes it live and survives a reload; `?cadence=0` builds every
section whole on arrival, which is also what the PDF export captures with.

**Do not** add a scroll-scrubbed animation (GSAP ScrollTrigger, or CSS
`animation-timeline: view()` driving anything load-bearing). Ambient effects
are fine; anything the argument depends on is a beat.

---

## 2. Keyboard only. No pointer path to anything.

Nothing expands on click. Nothing reveals on hover. Cards have no cursor and
no hover state.

Why: the audience cannot see your cursor on a projector, so a hover reveal
looks to them like the screen changed for no reason. You cannot reliably land
a hover while talking. And hover does not exist at all for the person who
opens the link on a phone afterwards. Offering an interaction you cannot
perform on stage is worse than offering none.

The mechanism instead:

- **`Space` / `→` / PageDown** move to the next section. Beats arrive on
  their own; there is no key that fires one.
- **Number keys** expand a named detail — `1`–`9`, same key again to close,
  `Esc` to close anything.
- **`Enter`** rebuilds the current section from beat 0, and replays the
  scripted chat exchange.

Each expandable card renders its own digit, so the mapping is on screen and
never has to be remembered mid-sentence. The presenter window lists the same
map for whichever section you are standing in.

**Do not** reintroduce a button for something a key already does. A control
you can only reach with a pointer is a control you cannot use while holding a
clicker.

The PDF button in the corner is not an exception to this, because it is not
a stage control. Nothing in the talk depends on it, it runs for a minute, and
you press it at a desk with a mouse in your hand. The rule is about the
argument — anything the room watches you do needs a key. Housekeeping does
not, and giving it a key would waste one.

The settings menu behind the hamburger is the same category, and it is worth
naming as a surface rather than as a series of exceptions: it is **pre-flight,
not stage**. The build-speed slider and the theme picker are both things you
set with a mouse before anyone is watching, and neither has a key. The test
is not "is there a pointer path" but "does the room watch you do it" — the
contrast toggle is watched and therefore keyed, everything in that menu is
not. What the rule forbids is a pointer path to *the argument*: expanding a
detail, advancing a beat, revealing a line.

---

## 3. Fragments on screen. Sentences in the speaker notes.

Nothing the audience reads is longer than about a dozen words. Six is a good
target.

Why: they cannot read a paragraph and listen to you at the same time, and
reading wins. Every sentence on screen is a sentence you are competing with.

So the split is structural, not stylistic:

| On screen | In `notes` |
|---|---|
| Claims, fragments, chips, 2–4 word labels | The argument in full prose |
| The diagram | Why the diagram is shaped that way |
| The limitation, named | The three objections and their answers |

This is the single biggest thing separating this from a deck of bullet
slides, and it is the easiest one to erode during a content pass. When a
section starts feeling thin on screen, that is usually correct — the missing
material belongs in `notes`, not on the projector.

---

## 4. Two modes, one page

- **present** — snap on, sections cascade on arrival, details closed.
- **read** — snap off, everything revealed at once, free scroll.

Why: the link you send afterwards has to work without you narrating it. Read
mode expands every numbered detail automatically, because a reader has no
keyboard cues and should not have to hunt.

Consequence worth holding onto: any content that only makes sense when spoken
is content the read mode cannot carry. The §4 caveat section is the test case
— it is the part that most has to survive being read cold a week later, which
is why nothing in it is hidden behind an interaction at all.

---

## 5. The demos are scripted, not live

The `chat` pattern is a replay on a timeline you control, not a live call.

Why: no venue network, no service latency, no "hang on, let me scroll up", and
it is identical every rehearsal. It is also replayable mid-question with one
key, which a live service is not without looking like stalling.

Show the real bots separately if you want. During the argument, use the
replay.

**Rehearse a failure anyway.** A talk that shows only clean runs reads as
marketing to this audience. One honest "here's where it picked the wrong tool
and here's the scope change that fixed it" buys more than three clean demos.

---

## 6. Diagrams are authored, not generated

Hand-written markup and inline SVG with stable IDs on every element. Not
Mermaid, not a rendered image.

Why: progressive reveal needs to target "the MCP node" specifically and
reliably. Mermaid recomputes layout on every render, so you cannot address an
element to animate it. An exported image cannot be animated at all.

The layer cake is currently CSS grid because it is a stack of boxes. The
topology comparison (co-located vs standalone MCP) will want real SVG, and
should be authored by hand with IDs from the start.

Three ship already and they are how the next one should be built:
`PhoneHome` (a home screen with one app that is yours), `DeployPath` (laptop →
repository → a machine with a nested VM and containers) and `AgentRing` (N
peers and the messages crossing between them). A drawing is a **`graphic`
item**, so it takes a beat and sits in the figures column exactly like a
screenshot; `name` selects the component from `src/deck/registry.ts`, which
keeps the content file data and the drawing code. Their words — down to the
decoy app labels and the container names — come from the item's `data`, per
§9, and every colour in them is a theme token, so projector rescue mode lifts
them with the rest of the deck.

Each one exports a TYPED BUILDER (`phoneHome()`, `deployPath()`,
`agentRing()`) beside its component. That is what keeps authoring checked
while the engine's own types stay open: the builder knows the shape, and the
component casts once, right next to it.

Two rules they all follow and the next one should too. **No logos**: a
service is named in text and drawn as a generic mark — a branch for a
repository, a stack for containers — because a talk does not need to
reproduce anyone's trademark to point at their product. And **a line that
is read takes the lifted ramp**: the arrows are `--accent-400` and their
labels `--accent-300`, never the brand fill (§8).

Two of the three are STILL, and the third is the rule rather than the
exception to it. A fingertip that travelled in and tapped the app was drawn
on the phone graphic, looked right in isolation, and came out again: the
argument there is the fragments beside the phone, and a gesture looping in
the corner takes the room's eye off them every few seconds to tell them
something they have already understood.

`AgentRing` moves because there the motion IS the content. Messages
crossing between peers are the thing a mesh does, and a still mesh of
hairlines says "these could talk" rather than "these are talking". That is
the test: ambient motion is allowed (§1), and it has to be carrying the
claim, not illustrating one the words have already made.

Its traffic is SMIL `animateMotion` down a straight path — no layout, no
JavaScript timer, identical on every rehearsal, and still correct in the
PDF export's frozen frame. The durations in `AGENT_RING` are deliberately
mutually indivisible so the ring never settles into a rhythm; keep that
property if you add a message. It is also the one graphic that answers
`prefers-reduced-motion`, because it is the only one with anything to turn
off.

---

## 7. One owner per animated property

`motion` writes inline styles. Inline styles beat stylesheet rules. So a
property that `motion` animates must not also be set in CSS.

This is not theoretical — the layer dimming was written in CSS first, the
attribute was applied correctly, and nothing appeared on screen. `verify.mjs`
now asserts the *computed* opacity, not the attribute, to catch it.

General form of the rule: if a test can only see the attribute, it is not
testing what the audience sees.

**A reveal never reflows.** Related, and the one that bit hardest. Sections
are `align-content: center`, so mounting an element on its beat grows the
column and re-centres everything above it — every fragment already on screen
slides upward as each new one lands. Measured across the deck: 25 of 27
sections moved visible text, the worst by 115px, 1159px in total, all of it
under an audience mid-read.

So **nothing is mounted on its beat.** `<Beat hold>` keeps the element in the
layout from beat 0 and reveals it with opacity and transform, neither of
which reflows. A component that draws itself — `LayerCake`, `ChatReplay` —
owes the same guarantee by hand: render the element always, animate
`opacity`, and never wrap a beat-gated element in `AnimatePresence`. The
layer cake's peer bracket was the last offender at 36px.

`AnimatePresence` is still right for a **number-key expansion**, which is
asked for, is not part of the cascade, and is expected to push content.

`verify.mjs` asserts this — *no reveal shifts content already on screen*. It
samples every fragment's `offsetTop` through each section's build and fails
if anything visible moves more than 2px. `offsetTop` rather than
`getBoundingClientRect`, because the latter includes the 18px rise-in and
would report the animation itself as a bug. The deck currently measures 0px
across all 27 sections.

---

## 8. A theme is a token set, with measured contrast

A theme is a token set and nothing else. No component picks a colour; if you
find yourself adding one to a component, add a token instead. Two themes ship
— `dark.css` (the default) and `lds-dark.css` (a real brand) — and no
component knows which is loaded.

Backgrounds are the ink lifted toward the accent's hue, never neutral black.
That is what makes a dark theme read as a considered surface rather than as
generic dark mode.

**A brand colour is usually a fill, not a text colour.** Brand palettes are
almost always specified for light backgrounds, and the signature colour is
almost always too dark to read on a dark one. The honest fix is not to use it
anyway at low contrast — it is to keep it for FILLS, where contrast rules do
not apply, and derive a lifted ramp for anything read. Three rungs:

| token | use |
|---|---|
| `--accent-fill` | the real brand colour. Fills only, never text, never a thin line. |
| `--accent-400` | lifted to ≥ 4.5:1. Large text, UI borders, meaningful lines. |
| `--accent-300` | lifted further, ≥ 6:1. Body text, inline emphasis. |

`lds-dark.css` is the worked example of the awkward case: its brand red
measures 3.17:1 on `--ink`, failing AA for body text *and* large text, so it
genuinely cannot be used for type at all.

**Measure, and write the numbers down.** Both theme files carry their
computed contrast table in the header comment. Re-measure when you change a
value: a table that was true once and is not checked again is worse than no
table, because it is believed.

**Projector rescue mode** (`C`, or `?contrast=high`) lifts the background off
near-black, strengthens every line, and kills the glows. Venue projectors
crush blacks; this is ninety seconds of insurance.

### Switching a theme is a runtime choice, not a rebuild

This supersedes the original "one import in `main.tsx`, one swap" rule. That
rule had a failure mode nobody saw coming: whichever theme `main.tsx` did not
import was never parsed by anything, so `lds-dark.css` sat in the repo with an
unclosed comment — a hard `CssSyntaxError` — through a green build. It failed
for the first person who tried to *use* the second theme, which is the worst
possible person for it to fail for.

Every theme in `src/theme/` now ships in the bundle and scopes its tokens
under a `data-theme` attribute:

```css
:root[data-theme='lds-dark'] { … }
:root[data-theme='lds-dark'][data-contrast='high'] { … }
```

`main.tsx` collects them with `import.meta.glob` rather than naming one, so
the set of themes is derived from the directory rather than mirrored by hand
— the same rule the beat list follows, over the same directory
`check-themes.mjs` compiles. The leading underscore in `_base.css` marks it a
partial: it holds element rules, not tokens, and the glob skips it.

Which theme loads first is per-talk identity, so it lives in `talk.config.ts`
beside the title and the logo rather than in a source import. `?theme=<id>`
overrides it for one session and survives a reload, exactly as
`?contrast=high` does. `index.html` carries a static `data-theme` for the
same reason it carries `data-contrast` — with tokens scoped to the
attribute, a document without one has no colours at all, and the placeholder
keeps the deck styled for the frame before the bundle runs.

A component still never knows which theme is loaded. The picker writes an
attribute on the document element; it does not name a colour, and neither
does anything downstream of it.

**The corner mark follows the theme, if you let it.** `logo.tint` in
`talk.config.ts` paints the mark in `--accent-fill` through a CSS mask, so a
theme swap moves it too — the shipped placeholder is drawn as one path with
its letterform knocked out as a real hole precisely so that it survives a
mask, which reads alpha and discards colour. It is off by default: a real
logo has fixed colours by definition, and flattening someone's brand to a
silhouette is not a default worth having. What is not defensible is the
version that shipped first, where the *placeholder* — example content, owned
by nobody — hardcoded the default theme's blue and stayed blue on a red
deck.

### Why contrast has a key and the theme does not

They look like the same control and are not:

| | `C` — projector rescue | the theme picker |
|---|---|---|
| what it changes | how legible the deck is | who the deck belongs to |
| when you reach for it | on stage, two minutes in, because the projector is bad | at a desk, before anyone is in the room |
| how often, per talk | once if the venue is against you | once, and then never again |

Contrast is a thing the room watches you fix, so §2 says it needs a key. The
theme is housekeeping — the same category as the PDF button and the build-
speed slider — so it lives in the settings menu and does not spend one of the
letters. Binding it would also mean a stray keypress can change a client's
branding mid-sentence, which is a live failure invented to serve a rule that
does not apply here.

---

## 9. Content is typed data, not markup

Every word lives in `src/content/talk.ts` as typed objects. Components read
from it and hard-code nothing.

Why: this argument gets restructured several times before the meetup. When
content is data, a restructure that breaks a renderer is a compile error
rather than a blank panel discovered during rehearsal. It also means the
progress rail, the presenter notes, the beat counts and the time budget all
derive from one source and cannot drift out of sync with what is on screen.

---

## 10. The presenter window is not optional

Second-screen view over `BroadcastChannel`: how far the current section has
built, the next SECTION (a keypress is worth a whole one now, so there is no
next beat to announce), the number-key map, the speaker notes, and a clock
against a per-section budget.

The time budget matters more here than in a deck. A scrolling presentation has
no slide count staring at you, so it quietly invites overrun. 40 minutes
including Q&A is roughly 28 minutes of talk.

**Both windows handle every key.** The notes window has its own listener that
relays over the channel, because a separate browser window has its own event
loop and the deck's listener cannot see keys pressed in it. This was a real
bug; `verify.mjs` guards it.

---

## 11. Offline is a requirement, not a preference

Present from `npm run preview` — a local static server. Never `file://` (ES
modules do not load there) and never a hosted URL on venue wifi.

Fonts are self-hosted through `@fontsource` and bundled at build time — no
`<link>` to Google Fonts, no request to anyone's server when the deck loads.
The brand mark is vendored in `public/brand/`.

The deck must NEVER reach out to a network to draw itself. An earlier version
fell back to a logo URL on the author's website when the local file was
missing, which is a dependency that fires exactly when you forgot to copy the
file — which is to say, in a room with bad wifi. It was deleted; a missing
mark now simply does not render.

---

## 12. Verification is behavioural, not just visual

`node verify.mjs` walks the deck at projector aspect ratio, screenshots every
section, and asserts the things that are easy to break and impossible to
notice until you are on stage.

It walks the way you do — it WAITS for each section to build itself, then
presses once to leave. So the two load-bearing assertions are not about
pixels:

```
every section builds itself with no keypress
one keypress moves exactly one section
```

Between them they cover the whole cadence contract. The first fails if the
timer stops driving beats; the second fails if a press ever advances a beat,
or two sections, or none.

Re-run it after any content change. Deck shape and cascade timing are read
off the page (`window.__deck`, `window.__stage`) and never mirrored here — a
timing constant copied into a test drifts, and when it drifts the test fails
as flake, which is the most expensive kind of failure to chase.

`node export-pdf.mjs` shares the walk and adds its own check: every section
had its full fragment count on screen when the shutter fired. Without it, a
cadence that silently stopped working would still produce 27 correctly-sized
pages — just half-empty ones, discovered by whoever you sent them to.

---

## Where the words are

All of it in **`src/content/talk.ts`**:

| Export | What it holds |
|---|---|
| `SECTIONS` | The deck. One entry per numbered slide in `outline.md`, built by `section()` |
| `PROMPT`, `THREADS`, `DISAMBIGUATION` | Act III slide 17, not wired up yet |
| `LAYERS`, `LAYER_CAKE` | Act III slide 20, not wired up yet |
| `CAVEAT` | Act IV slide 27, not wired up yet |

A section is metadata plus a `content` block, and the content block is an
ordered list of **items** — a `line` (a fragment, optionally with `sub`
fragments, optionally the section's one `lead`) or a `figure` (a screenshot,
or a `pending` filename for one not taken yet). One item, one beat, in the
order written. `content.kind` picks the renderer: `title` for the opening
card, `body` for everything else.

Four things to know while tuning:

**Beats are derived, never counted.** `section()` builds `beats` from the
items, so a beat cannot drift out of sync with what renders at it. `cue`
defaults to the words themselves; override it when the next keypress needs a
direction ("let it land") rather than a reminder. `verify.mjs` reads the beat
counts off the page via `window.__deck`, so nothing mirrors them by hand.

**`notes` is where the prose goes.** The objections, the numbers, the
positioning, the answer to the question you expect — all of it material that
would ruin the slides and belongs in your mouth.

**`demo` marks the slides with a live demo.** It shows as a banner in the
presenter window only. The audience never sees a demo badge, so skipping one
on the night costs nothing on screen, and the screenshot beats behind it are
the backup.

**A section with figures sets `wide`.** It widens the container and takes the
split layout — words in a narrow column, shots taking the rest of the width.
A phone conversation at body-text width is unreadable past the third row.

**`scale` sizes one figure, 1–100.** A number on a `figure` or a `graphic`,
where 100 is as large as the cell allows (66vh tall on the projector) and
anything below shrinks it about its centre: `scale: 70` on an app icon,
nothing at all on a screenshot the room has to read. It is a real
size, not a ceiling — put it on a small asset like the QR and the asset
grows to meet it — so the only guard left is the column width, which a wide
figure still shrinks to fit rather than overhanging. The knob is per item
and the row around it does not move, because every figure's space is
reserved from beat 0 either way. Out-of-range numbers clamp; there is
nothing above 100, since 100 already fills the cell. Wiring: `--shot-scale`
inline on the `<figure>`, from which `body.css` derives that figure's
`--shot-h` — which is why the drawings' own height caps in `ring.css`,
`phone.css` and `deploy.css`, all written as multiples of `--shot-h`, follow
a scaled graphic without knowing the property exists.

---
## Known gaps

- **A real handout.** `export-pdf.mjs` produces a PDF, but it is a *picture
  of the deck* — one page per section, each page a screenshot, for the person
  who asks for the slides afterwards. That is not the same artifact as
  something a reader can follow unaided, and the reason is the copy rule
  above: what is on screen is fragments of six words, and they carry very
  little without the `notes` beside them. A real handout is generated from
  `talk.ts` prose, not from pixels, and paginates on its own terms rather
  than on the deck's.

- **An outline importer.** Writing a talk means writing `talk.ts` by hand
  today. A `npm run import -- outline.md` that parses a strict Markdown
  subset into a compiling deck is an obvious next step, and deliberately not
  built yet: the grammar should be designed against two real talks, not one,
  or it will encode the accidents of the first.

  If it is built, it runs ONCE and then `talk.ts` is canonical. Do not
  round-trip — a re-import silently overwrites hand-tuned cues and captions,
  which is the kind of loss you discover in rehearsal. A `--check` mode that
  diffs the outline against the deck and reports drift covers the real need
  without the trap.

- **Screen mirror in the presenter window.** Slidev's presenter view can
  capture another monitor and show it inline, so you can watch a terminal or
  a phone while still seeing your notes. Worth copying for any slide with a
  live demo.

- **A notes editor route.** Batch-editing every section's notes on one screen
  is cheap to imitate when the notes already live in one file.

- **The QR decode check did not come across.** `make-qr.mjs` prints "decode
  it before trusting it — see the check in the talk repo," and that check is
  not in this repo. `jsqr` and `pngjs` are in `devDependencies` and nothing
  imports them, which is the shape of a test that was left behind during
  extraction. Until it is rewritten, a QR that does not scan ships silently,
  and the note telling you to check it by hand is the only defence.

- **A light theme.** Both shipped themes are dark. Nothing in the engine
  assumes it — every colour is a token — but nobody has measured a light
  palette, and an unmeasured theme is exactly what §8 argues against. Note
  that the theme picker makes adding one *easier to ship and no easier to
  justify*: dropping a file in `src/theme/` now puts it in front of a user
  in a dropdown, so the duty to measure the contrast table and write it into
  the file header is stronger than it was when a theme cost a code change to
  reach.
