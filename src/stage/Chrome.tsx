import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { openPresenterWindow, useStage } from './StageProvider'
import { ScaleControl } from './ScaleControl'
import { PDF_FILENAME, TALK } from '../deck/talk.config'
import { applyTheme, THEMES } from '../theme/themes'

/** Three lines, drawn rather than typed — a `☰` glyph renders at a different
 *  weight and baseline in every fallback face, and the brand faces do not
 *  carry it at all. */
function HamburgerIcon() {
  return (
    <svg className="chip__icon" viewBox="0 0 16 12" aria-hidden="true" focusable="false">
      <g stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
        <line x1="1" y1="1.5" x2="15" y2="1.5" />
        <line x1="1" y1="6" x2="15" y2="6" />
        <line x1="1" y1="10.5" x2="15" y2="10.5" />
      </g>
    </svg>
  )
}

/** The cascade speed, as a thing you drag rather than a number you guess.
 *
 *  Every change rebuilds the section behind the menu, so you are setting
 *  this against the slide you are looking at instead of against an
 *  abstraction. The stops are coarse on purpose — 50ms is already below
 *  what anyone can distinguish here, and a control with a hundred
 *  meaningful positions has none.
 *
 *  `?cadence=ms` still accepts any value; this is the version you can reach
 *  while the deck is on a projector. */
function CadenceControl() {
  const { cadence, setCadence, defaultCadence } = useStage()

  const label =
    cadence === 0
      ? 'off — whole slide at once'
      : `${cadence}ms between reveals`

  return (
    <div className="menu__setting">
      <div className="menu__settingHead">
        <label htmlFor="cadence">Build speed</label>
        {cadence !== defaultCadence && (
          <button className="menu__reset" onClick={() => setCadence(defaultCadence)}>
            reset
          </button>
        )}
      </div>

      <input
        id="cadence"
        className="menu__range"
        type="range"
        min={0}
        max={800}
        step={50}
        value={Math.min(cadence, 800)}
        onChange={(e) => setCadence(Number(e.target.value))}
      />

      {/* Two labels, at the ends. A third in the middle reads as a third
          setting, and the track runs fast-to-slow left-to-right — so
          anything but the endpoints is a guess at what the middle means. */}
      <div className="menu__scale" aria-hidden="true">
        <span>instant</span>
        <span>slower</span>
      </div>
      <p className="menu__value">{label}</p>
    </div>
  )
}

/** Which brand the deck wears, as a thing you pick before anyone is in the
 *  room.
 *
 *  NO KEY, deliberately, and it is the one control where that is the right
 *  answer — see DESIGN.md §8. Contrast is keyed because the room watches you
 *  rescue a bad projector; the theme is decided at a desk and then never
 *  touched again, and a stray keypress that re-brands a client's deck
 *  mid-sentence is a live failure invented to satisfy a rule about the
 *  argument, which this is not part of.
 *
 *  The options come from themes.ts, which reads the directory — adding a
 *  theme file is the whole of adding an option here. */
function ThemeControl() {
  const [theme, setTheme] = useState(
    () => document.documentElement.dataset.theme ?? THEMES[0]?.id,
  )

  // One theme is not a choice. A deck that ships a single brand gets no
  // control rather than a dropdown that does nothing.
  if (THEMES.length < 2) return null

  return (
    <div className="menu__setting">
      <div className="menu__settingHead">
        <label htmlFor="theme">Theme</label>
        {theme !== TALK.theme && (
          <button
            className="menu__reset"
            onClick={() => {
              applyTheme(TALK.theme)
              setTheme(TALK.theme)
            }}
          >
            reset
          </button>
        )}
      </div>

      <select
        id="theme"
        className="menu__select"
        value={theme}
        onChange={(e) => {
          applyTheme(e.target.value)
          setTheme(e.target.value)
        }}
      >
        {THEMES.map((t) => (
          <option key={t.id} value={t.id}>
            {t.label}
          </option>
        ))}
      </select>
    </div>
  )
}

const EXPORT_ROUTE = '/__export-pdf'

/**
 * The export button, which only exists when something can answer it.
 *
 * The endpoint is served by a Vite plugin, so it is there while you are
 * running `npm run dev` or `npm run preview` on your own machine and gone
 * from a built `dist/` hosted anywhere else. Probing for it rather than
 * assuming means the button is absent in the version you send people —
 * which is right twice over: they should not be offered it, and a button
 * that appears and then fails is worse than no button.
 *
 * The walk takes the better part of a minute, because it is a real browser
 * stepping through 27 sections. The label says so rather than spinning
 * silently, and the button stays disabled until the file arrives.
 */
function ExportChip() {
  const [available, setAvailable] = useState(false)
  const [state, setState] = useState<'idle' | 'working' | 'failed'>('idle')

  useEffect(() => {
    let live = true
    fetch(EXPORT_ROUTE, { method: 'HEAD' })
      .then((r) => live && setAvailable(r.ok))
      .catch(() => {}) // no endpoint, no button
    return () => {
      live = false
    }
  }, [])

  if (!available) return null

  const run = async () => {
    setState('working')
    try {
      const res = await fetch(EXPORT_ROUTE)
      if (!res.ok) throw new Error(await res.text())
      const blob = await res.blob()

      // Hand it to the browser as a download rather than navigating to it:
      // navigating would tear down the deck you are standing in.
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = PDF_FILENAME
      a.click()
      URL.revokeObjectURL(url)
      setState('idle')
    } catch (err) {
      console.error('[export-pdf]', err)
      setState('failed')
      window.setTimeout(() => setState('idle'), 4000)
    }
  }

  return (
    <button
      className="chip"
      onClick={run}
      disabled={state === 'working'}
      data-working={state === 'working' || undefined}
      title="Export the deck as a PDF — one page per section, about a minute"
    >
      {state === 'working' ? 'Exporting…' : state === 'failed' ? 'Failed — see console' : 'PDF'}
    </button>
  )
}

/* Vendored, never hot-linked — see src/content/logos/README.md for why. If the
   file is not there the mark simply does not render; the deck must NOT reach
   out to any network to draw itself. A remote fallback is a dependency that
   fires exactly when you forgot the file, which is exactly when you are
   standing in front of a room on someone else's wifi. */
const LOGO = TALK.logo.src

/**
 * The corner mark, in the theme's colour or in its own.
 *
 * TINTED, it is drawn as a CSS mask over `--accent-fill`: the file supplies
 * the silhouette, the theme supplies the colour, and switching theme moves
 * the mark with it. That is the whole reason the shipped placeholder knocks
 * its letterform out as a hole instead of painting it in a second colour —
 * a mask reads alpha and throws colour away, so a two-tone mark would arrive
 * as a solid square.
 *
 * UNTINTED — the default, and what a real logo wants — it is a plain <img>
 * and renders exactly as drawn.
 *
 * Both paths PROBE THE FILE FIRST and render nothing if it is missing, which
 * is the contract src/content/logos/README.md states. It earns its place twice.
 * It replaces the <img onError> this used to rely on, which a <span> cannot
 * have — and it settles what a mask does when its image 404s, which the
 * engines need not agree about: Chromium paints nothing (tested), but
 * reading the failed value as `mask-image: none` is also defensible, and
 * that paints the *un-masked* element — a solid accent rectangle in the
 * corner of every slide. Asking first means we never find out the hard way,
 * on someone else's browser, in front of a room.
 */
function BrandMark() {
  const [src, setSrc] = useState<string | null>(null)

  useEffect(() => {
    if (!LOGO) return
    const probe = new Image()
    probe.onload = () => setSrc(LOGO)
    probe.src = LOGO
  }, [])

  if (!src) return null

  if (!TALK.logo.tint) {
    return <img src={src} alt={TALK.logo.alt} className="chrome__logo" />
  }

  return (
    <span
      className="chrome__logo chrome__logo--tint"
      role="img"
      aria-label={TALK.logo.alt}
      /* The URL is data from the talk's config; the colour it is painted in
         stays in the stylesheet, where every colour in this repo lives. */
      style={{ '--logo-src': `url("${src}")` } as CSSProperties}
    />
  )
}

/**
 * Persistent frame: the brand mark, the mode switch, and a keyboard legend that
 * collapses out of the way. Everything here is deliberately low-contrast — it
 * must never compete with the content on a projector.
 */
export function Chrome() {
  const { mode, setMode, scale, setScale, notesScale, setNotesScale } = useStage()
  const [menuOpen, setMenuOpen] = useState(false)
  const toolsRef = useRef<HTMLDivElement | null>(null)

  /* Click anywhere else to dismiss. The menu covers the bottom-right corner
     of the projected image, so leaving it open by accident is a real cost —
     and there is no Escape binding for it, because Escape already closes an
     expanded detail and overloading it would make both behaviours guesswork. */
  useEffect(() => {
    if (!menuOpen) return
    const onDown = (e: PointerEvent) => {
      if (!toolsRef.current?.contains(e.target as Node)) setMenuOpen(false)
    }
    window.addEventListener('pointerdown', onDown)
    return () => window.removeEventListener('pointerdown', onDown)
  }, [menuOpen])

  return (
    <>
      <div className="chrome chrome--brand">
        {/* Icon-only mark on charcoal, per the theme's logo rules. */}
        <BrandMark />
      </div>

      <div className="chrome chrome--tools" ref={toolsRef}>
        <ExportChip />
        <button
          className="chip"
          onClick={() => setMode(mode === 'present' ? 'read' : 'present')}
          title="Toggle present / read mode (R)"
        >
          {mode === 'present' ? 'Presenting' : 'Reading'}
        </button>
        <button className="chip" onClick={openPresenterWindow} title="Speaker notes (S)">
          Notes
        </button>
        <button
          className="chip chip--ghost"
          onClick={() => setMenuOpen((v) => !v)}
          aria-expanded={menuOpen}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          title="Settings and keys"
        >
          <HamburgerIcon />
        </button>

        {menuOpen && (
          <div className="menu" role="dialog" aria-label="Settings and keys">
            <CadenceControl />
            {/* Two sizes, one per screen — see scale.ts for why browser zoom
                cannot do this. The notes one is also in the notes window,
                so it can be set on the screen it changes. */}
            <ScaleControl
              id="deck-scale"
              label="Slide text size"
              value={scale}
              onChange={setScale}
            />
            <ScaleControl
              id="notes-scale"
              label="Notes text size"
              value={notesScale}
              onChange={setNotesScale}
            />
            <ThemeControl />

            <ul className="menu__keys">
              <li>
                <kbd>Space</kbd> <kbd>→</kbd> <kbd>N</kbd> next section
              </li>
              <li>
                <kbd>←</kbd> <kbd>Backspace</kbd> <kbd>P</kbd> back
              </li>
              <li>
                <kbd>1</kbd>–<kbd>9</kbd> expand a detail · <kbd>Esc</kbd> close
              </li>
              <li>
                <kbd>Enter</kbd> rebuild this section
              </li>
              <li>
                <kbd>S</kbd> speaker notes window
              </li>
              <li>
                <kbd>R</kbd> present / read mode
              </li>
              <li>
                <kbd>C</kbd> high-contrast projector mode
              </li>
              <li>
                <kbd>F</kbd> fullscreen
              </li>
            </ul>
          </div>
        )}
      </div>
    </>
  )
}
