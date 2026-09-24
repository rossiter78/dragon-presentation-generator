/* ==========================================================================
   The content contract.
   --------------------------------------------------------------------------
   ENGINE FILE — the same in every talk. What a deck is made of: beats, the
   items a beat can put on screen, a section, and the helpers that build
   them. Your talk imports from here and exports SECTIONS; it never redefines
   any of this.

   BEATS ARE DERIVED, NOT COUNTED. `section()` builds the beat list from the
   items, so a beat can never drift out of sync with what renders at it. Add
   an item, you get a beat; the progress rail, the presenter window and the
   time budget all follow. Nothing in the engine mirrors a beat count by
   hand, and nothing in your talk should either.

   COPY RULE, and it is the important one: what goes on screen is a FRAGMENT,
   not a sentence. Six words is a good target, twelve is the ceiling. The
   audience cannot read a paragraph and listen to you at the same time — they
   will do one or the other, and reading wins. Full sentences belong in
   `notes`, where only you see them.
   ========================================================================== */

/** One advance-able state within a section. Index 0 is the section's
 *  resting state — what is on screen the moment you arrive. */
export interface Beat {
  /** Shown in the presenter window as "next: …" so you always know what the
   *  next keypress will do. */
  cue: string
}

/* --- the things a beat can put on screen -------------------------------- */

/** A fragment. Never a sentence — see the copy rule above. */
export interface LineItem {
  kind: 'line'
  text: string
  /** Sub-fragments, revealed with the line. Two or three words each. */
  sub?: string[]
  /** The claim of the section. One per section at most — a page where
   *  everything is emphasised has nothing emphasised. */
  lead?: boolean
  cue: string
}

/** A screenshot or photograph. On the demo slides this is the BACKUP: the
 *  live demo happens first, and these beats are what you fall back to when
 *  the venue, the bot or the network declines to cooperate. */
export interface FigureItem {
  kind: 'figure'
  /** Imported asset. Omit and set `pending` for a shot not taken yet. */
  src?: string
  /** Filename still to be captured. Renders as a labelled empty frame, so
   *  the layout on stage is the real one and the gap is impossible to miss. */
  pending?: string
  alt: string
  caption: string
  /** How big, 1–100 — see the note below. Omit to leave the figure at its
   *  natural size, capped to the cell. */
  scale?: number
  cue: string
}

/* --- how big a figure is -------------------------------------------------
   `scale` is a percentage of the space the figure is allowed: 100 is as
   large as its cell permits — 66vh tall on the projector — and anything
   below that shrinks it about its centre. 70 suits an app icon;
   40 is small enough that the words win the slide.

   It SETS the size rather than capping it, which matters on an asset that
   was never as big as the cell to begin with: the QR is a 45-unit SVG, and
   no ceiling you could name would move it. So `scale: 100` on a small asset
   makes it larger, not identical. The one thing still holding it back is
   the width of the column — a wide figure asked to be tall shrinks to fit
   rather than overhanging its neighbour, keeping its proportions as it
   does. Nothing above 100, because 100 already fills the cell: bigger than
   that is a `wide` section or fewer figures on the beat.

   Omit it on a screenshot the room has to READ. Those want every pixel of
   the default, and a number here is a chance to take some away. The knob is
   for the figures that are there to be enjoyed — artwork, an icon, a logo,
   the QR — where the right size is a judgement call you make from the back
   of the room in rehearsal.

   Out-of-range numbers are clamped rather than rejected: a typo should make
   one slide look wrong in rehearsal, not blank the deck on stage. The clamp
   WARNS IN DEV, because that promise did not hold on its own. `scale: 0.8`
   — the natural writing of "80%" if you have not read this block — clamps
   to 1, renders the figure about three pixels tall, and a figure that small
   does not read as wrong. It reads as absent, which you diagnose as "I have
   not added that image yet" rather than "I have a bug." A value strictly
   between 0 and 1 is never legitimate (1 is the floor), so it is always the
   fraction typo and is named as such. */
const SCALE_MIN = 1
const SCALE_MAX = 100

/* Once per bad value, not once per render. scaleFactor() runs on every
   paint of the figure that carries the typo, so an undeduped warning buries
   the console under a hundred copies of itself and you stop reading it —
   which is the failure this warning exists to prevent, moved one level up. */
const warnedScales = new Set<number>()

/** 1–100 as authored → the multiplier the CSS wants. */
export function scaleFactor(scale: number | undefined): number | undefined {
  if (scale === undefined) return undefined
  const n = Math.min(SCALE_MAX, Math.max(SCALE_MIN, scale))
  if (import.meta.env.DEV && n !== scale && !warnedScales.has(scale)) {
    warnedScales.add(scale)
    console.warn(
      scale > 0 && scale < 1
        ? `scale: ${scale} looks like a fraction — it is a PERCENTAGE, 1–100. ` +
            `Clamped to ${SCALE_MIN}, which renders the figure a few pixels ` +
            `tall. You probably meant scale: ${Math.round(scale * 100)}.`
        : `scale: ${scale} is outside 1–100 and was clamped to ${n}.`,
    )
  }
  return n / 100
}

/** A drawing, not a photograph.
 *
 *  Hand-authored SVG with stable IDs, per DESIGN.md §6 — `name` selects the
 *  component from the graphics registry. It takes a beat and sits in the
 *  figures column beside the words, exactly like a screenshot; the
 *  difference is that it redraws at the projector's size and can animate.
 *
 *  `name` is an open string, NOT a union of the graphics that happen to ship
 *  with the engine. A talk registers its own drawings in registry.ts and
 *  names them here without editing this file — which is the whole point of
 *  the registry. An unknown name is caught at startup by assertRegistry(),
 *  not at compile time: the cost of the open type is one runtime check, and
 *  the benefit is that your talk never has to patch the engine to add a
 *  diagram. */
export interface GraphicItem {
  kind: 'graphic'
  name: string
  alt: string
  caption: string
  /** How big, 1–100 — same meaning as on a figure. A drawing redraws at
   *  whatever size it is given, so this costs it no sharpness. */
  scale?: number
  /** What the drawing draws. Same bargain as `SectionContent.data`: the
   *  engine cannot know a given diagram's shape, so each graphic exports a
   *  typed builder and casts once inside itself. */
  data?: unknown
  cue: string
}

/** A beat with nothing of its own to render.
 *
 *  A self-rendering section (the chat replay, the layer cake) draws itself
 *  from its own data block, so its beats carry a cue and no copy. They still
 *  live in `items` — one per keypress — because that is the only way the
 *  beat count, the rail and the presenter window stay derived rather than
 *  declared. */
export interface CueItem {
  kind: 'cue'
  cue: string
}

export type Item = LineItem | FigureItem | GraphicItem | CueItem

export interface SectionContent {
  /** Which renderer draws this section. `title` is the opening card — one
   *  hero line, nothing competing with it. `body` is the workhorse: heading,
   *  then items. Anything else hands the section to a component that draws
   *  its own shape.
   *
   *  Open string for the same reason as `GraphicItem.name`: a talk adds a
   *  renderer in registry.ts and names it here, without editing the engine.
   *  assertRegistry() catches a typo at startup. */
  kind: string
  /** Cue for beat 0 — the state you arrive in. */
  open: string
  items: Item[]
  /** Payload for a self-rendering section — the chat replay's two threads,
   *  the layer cake's layers. `body` and `title` sections never set it.
   *
   *  It is `unknown` here because the engine genuinely does not know what a
   *  given pattern needs. You are not meant to build one of these by hand:
   *  each pattern exports a typed builder (`chatSection()`, `cakeSection()`)
   *  that takes its data with full checking and returns a plain SectionMeta.
   *  That keeps authoring type-safe and confines the cast to one line inside
   *  the pattern that owns it. */
  data?: unknown
}

export interface SectionMeta {
  id: string
  /** Small label above the title. Set it on the FIRST section of each part,
   *  so the room gets told which quarter of the argument it has just walked
   *  into; leave it off everywhere else, where it is noise. */
  eyebrow?: string
  /** The heading on screen, and the label in the rail and presenter window. */
  title: string
  content: SectionContent
  beats: Beat[]
  /** Minutes budgeted. The presenter window turns amber when you overrun. */
  budgetMinutes: number
  /** Speaker notes. Second screen only — never rendered to the audience.
   *  This is where the prose lives. */
  notes: string[]
  /** Set on the slides where a live demo happens. Presenter window only —
   *  the audience never sees a "demo" badge, so skipping one costs nothing. */
  demo?: string
  /** Wider content column. Set on the sections carrying screenshots, which
   *  are unreadable from the back of the room at body-text width. */
  wide?: boolean
  /** What the number keys 1–9 expand in this section, in order. Shown in the
   *  presenter window so you never have to remember the mapping on stage. */
  detailKeys?: string[]
  /** Set when Enter replays a scripted animation in this section. */
  replayable?: boolean
  /** A logo at the foot of the words column. Present from beat 0 rather
   *  than revealed — it is furniture, not an argument, and a brand mark that
   *  animates in is a brand mark competing with the point being made.
   *  `src` is an imported file's URL, like a figure's — put the file in
   *  src/content/logos/ and import it in talk.ts. */
  logo?: { src: string; alt: string }
}

/* --- authoring helpers ---------------------------------------------------
   `cue` defaults to the words themselves, which is right for most beats.
   Override it when the next keypress needs a direction rather than a
   reminder — "let it land", "point at the tool call". */

export function line(
  text: string,
  opts: { sub?: string[]; lead?: boolean; cue?: string } = {},
): LineItem {
  return {
    kind: 'line',
    text,
    sub: opts.sub,
    lead: opts.lead,
    cue: opts.cue ?? `“${text}”`,
  }
}

export function figure(
  src: string | null,
  opts: {
    alt: string
    caption: string
    cue?: string
    pending?: string
    scale?: number
  },
): FigureItem {
  return {
    kind: 'figure',
    src: src ?? undefined,
    pending: opts.pending,
    alt: opts.alt,
    caption: opts.caption,
    scale: opts.scale,
    cue: opts.cue ?? `Screenshot — ${opts.caption}`,
  }
}

export function graphic(
  name: string,
  opts: {
    alt: string
    caption: string
    cue?: string
    scale?: number
    data?: unknown
  },
): GraphicItem {
  return {
    kind: 'graphic',
    name,
    alt: opts.alt,
    caption: opts.caption,
    scale: opts.scale,
    data: opts.data,
    cue: opts.cue ?? `Diagram — ${opts.caption}`,
  }
}

/** A beat in a self-rendering section. Direction only — the component
 *  decides what arrives on screen. */
export function cue(cue: string): CueItem {
  return { kind: 'cue', cue }
}

/* --- pictures last --------------------------------------------------------
   Words first, then every figure and graphic, in every section. A picture
   that lands before the words it illustrates takes the room's eye from the
   claim before the claim is made; and a figure sitting in the middle of a
   run of lines in talk.ts is in the way of the words you edit most.

   So the rule is enforced, not sorted. Beats follow the order items are
   written, and a silent re-sort would put one order in the file and another
   on the stage. Instead a line (or cue) after a picture throws at startup,
   naming the section, and you move the picture to the end. */
const isPicture = (item: Item) => item.kind === 'figure' || item.kind === 'graphic'

function assertPicturesLast(meta: Omit<SectionMeta, 'beats'>) {
  const items = meta.content.items
  const first = items.findIndex(isPicture)
  if (first === -1) return
  const late = items.slice(first).find((item) => !isPicture(item))
  if (late) {
    throw new Error(
      `section "${meta.id}": figures and graphics go LAST in items, after ` +
        `every line — move them to the end. Found ${late.kind} ` +
        `${late.cue} after a ${items[first].kind}.`,
    )
  }
}

/** Assembles a section and derives its beat list from its items. */
export function section(meta: Omit<SectionMeta, 'beats'>): SectionMeta {
  assertPicturesLast(meta)
  return {
    ...meta,
    beats: [
      { cue: meta.content.open },
      ...meta.content.items.map((item) => ({ cue: item.cue })),
    ],
  }
}
