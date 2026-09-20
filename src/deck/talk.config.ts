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
   ========================================================================== */

export interface TalkConfig {
  /** Browser tab, PDF metadata, and the fallback <title>. Keep it short —
   *  it shows up in the presenter window's title bar on the second screen,
   *  where you read it at a glance. */
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

  /** The mark in the bottom-left corner of every slide, served from public/.
   *  Path is relative to public/ — no leading slash, because the deck is
   *  built with a relative base and may be served from a subdirectory.
   *
   *  Set `src` to null for an unbranded deck. If the file is missing the
   *  mark simply does not render: the deck NEVER reaches out to the network
   *  to draw itself, which is the rule that keeps it presentable offline.
   *  See public/brand/README.md. */
  logo: { src: string | null; alt: string }

  /** Favicon, relative to public/. Shows in the tab and in the presenter
   *  window, which is the only place you will actually notice it. */
  favicon: string
}

export const TALK: TalkConfig = {
  title: 'Dragon Presentation Generator',
  slug: 'dragon-presentation-generator',
  logo: { src: 'brand/mark.svg', alt: 'Dragon Presentation Generator' },
  favicon: 'brand/favicon.svg',
}

/** The BroadcastChannel namespace. Explicit `channel` wins; otherwise the
 *  slug, which is already unique per talk. One derivation, used by both the
 *  deck and the presenter window, so they cannot disagree about it. */
export const CHANNEL = TALK.channel ?? `${TALK.slug}-stage`

/** Full filename for the exported PDF. Used by the download button in the
 *  browser and by the Content-Disposition header on the server, which is
 *  why it is derived once here rather than typed in both. */
export const PDF_FILENAME = `${TALK.slug}.pdf`
