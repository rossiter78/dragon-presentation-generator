/* ==========================================================================
   The themes, derived from this directory.
   --------------------------------------------------------------------------
   ENGINE FILE. Every theme in src/theme/ ships in the bundle and is selected
   at runtime by a `data-theme` attribute on <html> — the same mechanism as
   `data-contrast`, see DESIGN.md §8.

   NOTHING LISTS THE THEMES BY HAND. The glob below reads the directory, so
   dropping a file in src/theme/ is the whole of adding a theme: it compiles
   in `npm run check:themes`, it appears in the settings menu, and it is
   reachable as ?theme=<filename>. This is the same rule the beat list
   follows — a count or a list mirrored by hand is a second place to be
   wrong.

   `_base.css` is a PARTIAL: element rules and resets, no tokens, imported by
   each theme rather than selected between. The leading underscore keeps it
   out of the glob, which is why it is named that way.
   ========================================================================== */

/* eager: the tokens must be in the document before the first paint, not
   fetched when someone opens the menu. They are ~1kB of custom properties
   each; a talk with ten themes still costs less than one woff2. */
const files = import.meta.glob('./[!_]*.css', { eager: true })

/** Filename without extension: 'dark-blue', 'dark-red'. This is the id in
 *  talk.config.ts, in ?theme=, and in the CSS selector. */
function idOf(path: string): string {
  return path.replace(/^\.\//, '').replace(/\.css$/, '')
}

/* Casing a filename cannot carry. Only for names where the derived label is
   actually wrong — an acronym, a proper noun — not for every theme: an entry
   here is a hand-maintained string, which is the thing this file otherwise
   avoids. Unlisted ids fall through to the derivation below, which is the
   expected case — every shipped theme derives its label, so this is empty.
   An entry looks like  'acme-dark': 'ACME dark'. */
const LABELS: Record<string, string> = {}

/** 'dark-red' → 'Dark red'; a LABELS entry overrides it. */
function labelOf(id: string): string {
  return LABELS[id] ?? id.replace(/-/g, ' ').replace(/^./, (c) => c.toUpperCase())
}

export interface Theme {
  id: string
  label: string
}

/** Every theme, alphabetical — a stable order in the menu across builds,
 *  and one that does not depend on the order the bundler happened to walk
 *  the directory in. */
export const THEMES: Theme[] = Object.keys(files)
  .map(idOf)
  .sort()
  .map((id) => ({ id, label: labelOf(id) }))

/** Write the attribute the CSS selects on. The single place the theme is
 *  applied, so the menu, the URL flag and startup cannot disagree about what
 *  "setting the theme" means.
 *
 *  It also writes ?theme= back into the address bar without navigating:
 *  a reload keeps what you picked, and openPresenterWindow() copies the
 *  current URL, so the notes window opens in the theme you are looking at
 *  rather than the configured default. */
export function applyTheme(id: string, { url = true } = {}): void {
  document.documentElement.dataset.theme = id

  if (!url) return
  const next = new URL(window.location.href)
  next.searchParams.set('theme', id)
  window.history.replaceState(null, '', next)
}

/** The theme to start in: an explicit ?theme= wins, then the talk's own
 *  choice. An unknown id falls back rather than leaving the document with no
 *  tokens at all — with the selectors scoped, a bad name would otherwise
 *  render an unstyled deck, which is a worse failure than the wrong colour. */
export function initialTheme(configured: string, search: string): string {
  const asked = new URLSearchParams(search).get('theme')
  const known = (id: string | null) => THEMES.some((t) => t.id === id)

  if (known(asked)) return asked!
  if (asked) {
    console.warn(
      `?theme=${asked} is not a theme in src/theme/. ` +
        `Known: ${THEMES.map((t) => t.id).join(', ')}. Using ${configured}.`,
    )
  }
  if (known(configured)) return configured
  console.warn(
    `talk.config.ts names theme '${configured}', which is not a file in ` +
      `src/theme/. Using ${THEMES[0]?.id}.`,
  )
  return THEMES[0]?.id ?? configured
}
