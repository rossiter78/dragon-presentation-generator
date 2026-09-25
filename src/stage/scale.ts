/* ==========================================================================
   Text size, per window.
   --------------------------------------------------------------------------
   The deck and the presenter window are the same origin, and Chrome and Edge
   remember zoom PER ORIGIN — so Ctrl +/- in one window zooms the other too.
   With a projector and a laptop at very different resolutions there is no
   single zoom that suits both, and no way to set two. This is the way to set
   two: each window scales its own root font size, and everything sized in
   rem follows.

   What does not follow is anything sized to the viewport — screenshots and
   drawings are fractions of the screen height (`--shot-h`), and stay that
   way. That is deliberate: a picture already fills its cell, and the thing
   that is too small or too large on a strange screen is the words.

   Percent, 100 = as authored. Both values live in the URL like ?cadence=,
   so a reload keeps them.
   ========================================================================== */

export const DEFAULT_SCALE = 100
export const SCALE_MIN = 70
export const SCALE_MAX = 150
export const SCALE_STEP = 5

/** The deck's own text size. Also what the replica in the notes window uses,
 *  since it is the deck. */
export const DECK_SCALE_PARAM = 'scale'
/** The presenter window's text size. */
export const NOTES_SCALE_PARAM = 'notesScale'

export function clampScale(pct: number): number {
  return Math.max(SCALE_MIN, Math.min(SCALE_MAX, Math.round(pct)))
}

export function readScale(param: string): number {
  const raw = new URLSearchParams(window.location.search).get(param)
  if (raw === null) return DEFAULT_SCALE
  const pct = Number(raw)
  return Number.isFinite(pct) ? clampScale(pct) : DEFAULT_SCALE
}

/** Scale THIS document. stage.css reads the property on :root. */
export function applyScale(pct: number) {
  document.documentElement.style.setProperty('--text-scale', String(pct / 100))
}

/** Keep the URL honest, without adding a history entry per drag step. */
export function writeScaleParam(param: string, pct: number) {
  const url = new URL(window.location.href)
  if (pct === DEFAULT_SCALE) url.searchParams.delete(param)
  else url.searchParams.set(param, String(pct))
  window.history.replaceState(null, '', url)
}
