import { useEffect, useRef, useState } from 'react'
import { openPresenterWindow, useStage } from './StageProvider'
import { PDF_FILENAME, TALK } from '../deck/talk.config'

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

/* Vendored, never hot-linked — see public/brand/README.md for why. If the
   file is not there the mark simply does not render; the deck must NOT reach
   out to any network to draw itself. A remote fallback is a dependency that
   fires exactly when you forgot the file, which is exactly when you are
   standing in front of a room on someone else's wifi. */
const LOGO = TALK.logo.src ? `${import.meta.env.BASE_URL}${TALK.logo.src}` : null

/**
 * Persistent frame: the brand mark, the mode switch, and a keyboard legend that
 * collapses out of the way. Everything here is deliberately low-contrast — it
 * must never compete with the content on a projector.
 */
export function Chrome() {
  const { mode, setMode } = useStage()
  const [menuOpen, setMenuOpen] = useState(false)
  const [logo, setLogo] = useState<string | null>(LOGO)
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
        {logo && (
          <img
            src={logo}
            alt={TALK.logo.alt}
            className="chrome__logo"
            onError={() => setLogo(null)}
          />
        )}
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

            <ul className="menu__keys">
              <li>
                <kbd>Space</kbd> <kbd>→</kbd> next section
              </li>
              <li>
                <kbd>←</kbd> <kbd>Backspace</kbd> back
              </li>
              <li>
                <kbd>1</kbd>–<kbd>6</kbd> expand a detail · <kbd>Esc</kbd> close
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
