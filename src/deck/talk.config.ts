/* ==========================================================================
   Per-talk identity.
   --------------------------------------------------------------------------
   EDIT THIS FILE per talk. It is the one place the deck says who it is.

   Before this file existed these twelve strings were scattered across
   index.html, package.json, channel.ts, StageProvider.tsx, Chrome.tsx and
   vite-plugin-export-pdf.ts — so "rename the talk" meant finding six files
   and missing one. Now it is one edit, and the build reads the rest.

   NOTHING ABOUT THE ARGUMENT LIVES HERE. Words the audience reads go in
   src/content/. This is the nameplate, not the talk.

   The logo files live in src/content/logos/ with the rest of the talk's own
   material. They are referenced as `new URL('…', import.meta.url)`, which
   Vite recognises and bundles into dist/ — and which is still plain
   JavaScript, because Node loads this file too (vite.config.ts reads the
   slug through the PDF plugin) and Node cannot `import` an .svg.
   See src/content/logos/README.md.
   ========================================================================== */

// Point these at your own files in src/content/logos/. Keep the
// `new URL(<literal>, import.meta.url)` shape: Vite only bundles a literal.
const mark = new URL('../content/logos/placeholder-mark.svg', import.meta.url).href
const favicon = new URL('../content/logos/placeholder-favicon.svg', import.meta.url).href

export interface TalkConfig {
  /** Browser tab and PDF metadata. Applied to `document.title` at startup
   *  in main.tsx — index.html ships a placeholder that this replaces, and
   *  export-pdf.mjs reads the live title back out for the PDF's properties.
   *
   *  Keep it short: the presenter window appends " — notes" and shows it in
   *  the title bar on the second screen, where you read it at a glance. */
  title: string

  /** Filename for the PDF export, WITHOUT the extension. Lower-case and
   *  hyphenated: it becomes a file in someone's Downloads folder. */
  slug: string

  /** Namespace for the BroadcastChannel that keeps the deck and the
   *  presenter window in lockstep, and the name of the presenter window
   *  itself.
   *
   *  It must be UNIQUE PER TALK if you ever run two decks on the same
   *  origin — two talks sharing a channel name means one deck's arrow key
   *  advances the other's notes. Derived from `slug` by default, which is
   *  unique as long as your slugs are.
   *
   *  Note that BroadcastChannel is scoped to the ORIGIN, so two decks on
   *  different ports cannot collide regardless. This matters when you serve
   *  two builds from the same port at different times of day. */
  channel?: string

  /** The mark in the bottom-left corner of every slide. `src` is a bundled
   *  file's URL (see `mark` at the top), not a path you type.
   *
   *  Set `src` to null for an unbranded deck. If the file is missing the
   *  mark simply does not render: the deck NEVER reaches out to the network
   *  to draw itself, which is the rule that keeps it presentable offline.
   *  See src/content/logos/README.md. */
  logo: {
    src: string | null
    alt: string

    /** Paint the mark in the theme's `--accent-fill` instead of its own
     *  colours, so it follows a theme swap rather than staying the colour it
     *  was drawn in.
     *
     *  OFF BY DEFAULT, and that is deliberate: your logo is your logo, and a
     *  tint flattens it. It is drawn as a CSS mask, which reads only the
     *  file's ALPHA — so a two-colour mark masks to its silhouette and loses
     *  the inner shapes, unless those shapes are real holes. The placeholder
     *  in src/content/logos/ is drawn that way on purpose and sets this true; a
     *  real multi-colour logo should leave it off.
     *
     *  Square marks only. The corner box is square, and a wide wordmark will
     *  letterbox inside it rather than fill it. */
    tint?: boolean
  }

  /** Favicon — a bundled file's URL, like `logo.src`. Shows in the tab and in the presenter
   *  window, which is the only place you will actually notice it. */
  favicon: string

  /** Which theme the deck opens in — a filename in src/theme/, without the
   *  extension: 'dark-blue', 'dark-red'. Every theme in that directory ships in
   *  the bundle and any of them can be selected from the settings menu or
   *  with ?theme=<id>; this is only the one it STARTS in.
   *
   *  It lives here rather than as an import in main.tsx because which brand
   *  a deck wears is identity, the same as the logo beside it. An id with no
   *  matching file warns at startup and falls back rather than rendering an
   *  unstyled deck. */
  theme: string
}

export const TALK: TalkConfig = {
  title: 'Dragon Presentation Generator',
  slug: 'dragon-presentation-generator',
  logo: {
    src: mark,
    alt: 'Dragon Presentation Generator',
    // The shipped mark is a placeholder belonging to nobody, so it follows
    // the theme rather than pinning the deck to one colour. Drop your own
    // logo in and turn this off.
    tint: true,
  },
  favicon,
  theme: 'dark-blue',
}

/** The BroadcastChannel namespace. Explicit `channel` wins; otherwise the
 *  slug, which is already unique per talk. One derivation, used by both the
 *  deck and the presenter window, so they cannot disagree about it. */
export const CHANNEL = TALK.channel ?? `${TALK.slug}-stage`

/** Full filename for the exported PDF. Used by the download button in the
 *  browser and by the Content-Disposition header on the server, which is
 *  why it is derived once here rather than typed in both. */
export const PDF_FILENAME = `${TALK.slug}.pdf`
