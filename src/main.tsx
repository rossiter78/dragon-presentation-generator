import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

/* The faces, vendored. These resolve out of node_modules and are bundled
   into dist/ at build time — no Google Fonts <link>, no request to anyone
   else's server when the deck loads.

   OFFLINE IS A REQUIREMENT, not a nicety. You will present this on a venue
   network that is missing, captive-portalled or saturated, and a deck that
   fetches a typeface at load time is a deck that renders in Times New Roman
   in front of a room.

   Only the weights the theme asks for, and only the latin subset — the full
   imports also ship Cyrillic, Greek and Vietnamese, which is 24 extra woff2
   files most decks will never render. Montserrat for display, Source Sans 3
   for body, JetBrains Mono for code and <kbd>.

   CHANGE THESE WITH THE THEME. The font stacks live in the theme file; if
   they name a face you have not imported here, you ship a fallback and do
   not find out until the projector. */
import '@fontsource/montserrat/latin-600.css'
import '@fontsource/montserrat/latin-700.css'
import '@fontsource/source-sans-3/latin-400.css'
import '@fontsource/source-sans-3/latin-600.css'
import '@fontsource/jetbrains-mono/latin-400.css'
import '@fontsource/jetbrains-mono/latin-500.css'

/* The themes — ALL of them, selected at runtime rather than imported one at
   a time. themes.ts globs this directory, so there is no list here to keep
   in step with the files; see src/theme/dark.css for what a theme is allowed
   to be, and DESIGN.md §8 for why the swap is no longer an import. */
import { applyTheme, initialTheme } from './theme/themes'
import App from './App'
import { TALK } from './deck/talk.config'
import { SECTIONS } from './content/talk'
import { PresenterNotes } from './stage/PresenterNotes'

/* The shape of the deck, published for verify.mjs. The verifier used to
   mirror the beat counts by hand, which is a second place for them to be
   wrong; now it reads them off the page and cannot drift.

   This is the BEATS ARE DERIVED rule reaching all the way out to the test
   harness: nothing anywhere counts a beat by hand. */
declare global {
  interface Window {
    __deck?: {
      id: string
      title: string
      beats: number
      lines: number
      figures: number
      demo: boolean
    }[]
    /** Cascade timing, published by StageProvider — see the comment there. */
    __stage?: { cadence: number; leadIn: number; reveal: number }
  }
}
window.__deck = SECTIONS.map((s) => ({
  id: s.id,
  title: s.title,
  beats: s.beats.length,
  lines: s.content.items.filter((i) => i.kind === 'line').length,
  figures: s.content.items.filter((i) => i.kind === 'figure').length,
  demo: Boolean(s.demo),
}))

// ?contrast=high survives a reload, which matters when you discover the
// venue projector is bad two minutes before you start.
const params = new URLSearchParams(window.location.search)
if (params.get('contrast') === 'high') {
  document.documentElement.dataset.contrast = 'high'
}

// The presenter window is the same bundle under ?notes=1 — no second build,
// no second server, and it can never fall out of sync with the deck.
const isNotes = params.get('notes') === '1'

/* The nameplate, applied at startup.
   ------------------------------------------------------------------------
   index.html is ENGINE, not talk: it is static, Vite serves it before any
   module runs, and it cannot read talk.config.ts. So it ships a placeholder
   title and favicon and the deck corrects both here, on the first tick.

   This is the same move CHANNEL and PDF_FILENAME already make — one string
   in talk.config.ts, every consumer derives from it. Before this existed,
   `title` and `favicon` were the two fields in that file nothing read, so
   renaming a talk still meant hand-editing index.html: exactly the
   six-file scavenger hunt the config file claims to have ended. Do not
   start again.

   export-pdf.mjs takes the PDF's Title metadata from page.title(), so this
   line is also what puts the talk's name in the exported file's properties.

   The presenter window is the same bundle under ?notes=1, so it is labelled
   here too. Two windows carrying the same name in the taskbar is a thing
   you fumble live, with the room watching you do it. */
document.title = isNotes ? `${TALK.title} — notes` : TALK.title

const icon = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
if (icon) icon.href = `${import.meta.env.BASE_URL}${TALK.favicon}`

/* The theme, before first paint. ?theme= wins over the talk's own choice, so
   you can show the same deck in a second brand without editing anything —
   and it survives a reload, which is the point of putting it in the URL
   rather than in memory.

   `url: false` because the flag is already in the address bar if it was
   asked for, and writing the configured default into a clean URL would mean
   every deck is opened with a query string it never needed. */
applyTheme(initialTheme(TALK.theme, window.location.search), { url: false })

createRoot(document.getElementById('root')!).render(
  <StrictMode>{isNotes ? <PresenterNotes /> : <App />}</StrictMode>,
)
