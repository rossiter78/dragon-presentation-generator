/* ==========================================================================
   The home screen.  GRAPHIC — data comes from the item.
   --------------------------------------------------------------------------
   A phone, a home screen full of apps, and one of them is yours. For the
   slide whose claim is "it is just an app on the home screen" — a drawing of
   exactly that costs the room no reading at all.

   HAND-AUTHORED SVG with stable IDs — DESIGN.md §6. Not Mermaid, not an
   exported image: it has to redraw at whatever size the projector gives
   us, and a tile has to stay addressable if a later beat ever wants one.

   THE OTHER APP LABELS ARE FURNITURE. They are deliberately generic, no
   real product is imitated, and nobody is meant to read them. The one that
   matters is the target tile — give it the icon of the thing you have been
   demoing and the callback lands without a word being spoken.

   THE ICON IS OPTIONAL. Pass `target.icon` and it is drawn; leave it out
   and the tile gets a plain branded square instead. That is what lets this
   pattern ship in a template without carrying anyone's artwork: an example
   deck renders a perfectly good home screen with no image asset at all.

   NOTHING ON IT MOVES. A tapping fingertip was drawn here first and taken
   out again: the argument is the fragments beside it, and a gesture looping
   in the corner of the slide pulls the eye off them every few seconds for
   no gain. The drawing makes its point standing still — your icon is
   sitting on a home screen, among the apps you did not write.
   ========================================================================== */

import { graphic } from '../deck/content-types'
import type { GraphicItem } from '../deck/content-types'
import './phone.css'

/** One tile. `glyph` picks an abstract mark — see Glyph() at the foot of
 *  this file — and `tint` (1–4) picks a surface so the grid does not read as
 *  sixteen identical squares. */
export interface PhoneApp {
  label: string
  glyph: 'chat' | 'grid' | 'ring' | 'doc' | 'wave' | 'bars'
  tint: number
}

export interface PhoneHomeData {
  /** Clock in the status bar. Any string; nobody reads it, and a plausible
   *  one stops the phone looking like a wireframe. */
  time: string
  /** The app that is yours, and where it sits. Zero-based position in the
   *  4×4 grid — row 2, column 2 puts it near the middle of the screen and on
   *  the natural path of a thumb coming from the corner.
   *
   *  `icon` is an imported image asset. Omit it for a drawn placeholder. */
  target: { label: string; col: number; row: number; icon?: string }
  /** Tiles for the fifteen slots the target does not occupy. Fewer is fine
   *  — the remainder are left empty. */
  apps: PhoneApp[]
  /** The dock. No labels are drawn — the real one has none either. */
  dock: PhoneApp[]
}

/** Build a phone-home graphic with its data checked. */
export function phoneHome(opts: {
  alt: string
  caption: string
  cue?: string
  scale?: number
  data: PhoneHomeData
}): GraphicItem {
  return graphic('phone-home', opts)
}

/* --- the grid ------------------------------------------------------------
   Everything is laid out from these four numbers, so the drawing stays
   consistent if a row or a column is ever added. Screen is 320 wide inside
   a 340 device; 24 of padding each side leaves 272 for four 56px tiles and
   three 16px gutters. */
const ICON = 56
const COL_X = (c: number) => 54 + c * 72
const ROW_Y = (r: number) => 108 + r * 98
const COLS = 4
const ROWS = 4

export function PhoneHome({ data }: { data?: unknown }) {
  const d = data as PhoneHomeData
  const TARGET_X = COL_X(d.target.col)
  const TARGET_Y = ROW_Y(d.target.row)

  /* The non-target tiles, in reading order around the target. */
  const slots: (PhoneApp | null)[] = []
  const queue = [...d.apps]
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const isTarget = r === d.target.row && c === d.target.col
      slots.push(isTarget ? null : (queue.shift() ?? null))
    }
  }

  return (
    <svg
      className="phone"
      viewBox="0 0 380 760"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        {/* The titanium band. Brand charcoal lifted and dropped, never a
            grey — the same rule the theme is built on. */}
        <linearGradient id="phone-band" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--surface-3)" />
          <stop offset="48%" stopColor="var(--surface)" />
          <stop offset="100%" stopColor="var(--surface-3)" />
        </linearGradient>

        {/* Wallpaper: one red bloom, low enough to be atmosphere rather
            than a second focal point. */}
        <radialGradient id="phone-wall" cx="26%" cy="14%" r="86%">
          <stop offset="0%" stopColor="var(--accent-fill)" stopOpacity="0.2" />
          <stop offset="46%" stopColor="var(--surface-2)" stopOpacity="0.55" />
          <stop offset="100%" stopColor="var(--ink)" stopOpacity="1" />
        </radialGradient>

        {/* The installed app's icon is a photograph in a squircle, like
            every other icon on a real home screen. */}
        <clipPath id="phone-target-clip">
          <rect x={TARGET_X} y={TARGET_Y} width={ICON} height={ICON} rx="14" />
        </clipPath>

        {/* The screen clips its own contents, so a tile can sit near the
            edge without spilling onto the band. */}
        <clipPath id="phone-screen-clip">
          <rect x="30" y="30" width="320" height="700" rx="44" />
        </clipPath>
      </defs>

      {/* --- device ------------------------------------------------------ */}
      <g id="phone-body">
        <rect
          x="20"
          y="20"
          width="340"
          height="720"
          rx="52"
          fill="url(#phone-band)"
          stroke="var(--line-strong)"
          strokeWidth="1.5"
        />
        {/* Side buttons, in the band. Two strokes, and the phone stops
            looking like a rounded rectangle. */}
        <rect x="17" y="180" width="3" height="52" rx="1.5" fill="var(--line-strong)" />
        <rect x="17" y="252" width="3" height="52" rx="1.5" fill="var(--line-strong)" />
        <rect x="360" y="230" width="3" height="84" rx="1.5" fill="var(--line-strong)" />

        <rect x="30" y="30" width="320" height="700" rx="44" fill="var(--ink)" />
        <rect x="30" y="30" width="320" height="700" rx="44" fill="url(#phone-wall)" />
      </g>

      <g clipPath="url(#phone-screen-clip)">
        {/* --- status bar ------------------------------------------------ */}
        <g id="phone-status">
          <text x="62" y="70" className="phone__time">
            {d.time}
          </text>
          <g fill="var(--text-secondary)" opacity="0.8">
            <rect x="272" y="62" width="3" height="5" rx="1" />
            <rect x="278" y="59" width="3" height="8" rx="1" />
            <rect x="284" y="56" width="3" height="11" rx="1" />
            <rect x="290" y="53" width="3" height="14" rx="1" />
            <path
              d="M303 59c4-4 11-4 15 0"
              fill="none"
              stroke="var(--text-secondary)"
              strokeWidth="2.4"
              strokeLinecap="round"
            />
            <path
              d="M307 64c2-2 6-2 8 0"
              fill="none"
              stroke="var(--text-secondary)"
              strokeWidth="2.4"
              strokeLinecap="round"
            />
            <rect
              x="326"
              y="54"
              width="22"
              height="12"
              rx="3.5"
              fill="none"
              stroke="var(--text-secondary)"
              strokeWidth="1.4"
            />
            <rect x="328" y="56" width="15" height="8" rx="2" />
          </g>
        </g>
        {/* The island. Pure black, because on the real thing it is a hole. */}
        <rect x="147" y="44" width="86" height="26" rx="13" fill="#05080b" />

        {/* --- the grid --------------------------------------------------- */}
        {slots.map((app, i) => {
          const c = i % COLS
          const r = Math.floor(i / COLS)
          if (!app) return null
          return (
            <AppTile key={`${app.label}-${i}`} app={app} x={COL_X(c)} y={ROW_Y(r)} />
          )
        })}

        {/* --- the one I wrote -------------------------------------------- */}
        <g id="phone-target">
          {/* Glow under the tile. It is the only thing on the home screen
              carrying any colour, which is what walks the room's eye to it
              without a word. Fill use of brand red — never read as text. */}
          <rect
            x={TARGET_X - 6}
            y={TARGET_Y - 6}
            width={ICON + 12}
            height={ICON + 12}
            rx="20"
            fill="var(--accent-fill)"
            opacity="0.22"
            className="phone__targetGlow"
          />
          {/* Your artwork if you have it, a drawn stand-in if you do not.
              The stand-in is not a placeholder to be replaced later — it is
              a legitimate tile, and a deck with no icon asset should still
              look finished from the back of the room. */}
          {d.target.icon ? (
            <image
              href={d.target.icon}
              x={TARGET_X}
              y={TARGET_Y}
              width={ICON}
              height={ICON}
              preserveAspectRatio="xMidYMid slice"
              clipPath="url(#phone-target-clip)"
            />
          ) : (
            <g clipPath="url(#phone-target-clip)">
              <rect
                x={TARGET_X}
                y={TARGET_Y}
                width={ICON}
                height={ICON}
                fill="var(--accent-fill)"
              />
              <text
                x={TARGET_X + ICON / 2}
                y={TARGET_Y + ICON / 2}
                className="phone__targetInitial"
              >
                {d.target.label.slice(0, 1).toUpperCase()}
              </text>
            </g>
          )}
          <rect
            x={TARGET_X}
            y={TARGET_Y}
            width={ICON}
            height={ICON}
            rx="14"
            fill="none"
            stroke="var(--accent-400)"
            strokeWidth="1.5"
          />
          <text
            x={TARGET_X + ICON / 2}
            y={TARGET_Y + ICON + 15}
            className="phone__label phone__label--target"
          >
            {d.target.label}
          </text>
        </g>

        {/* --- page dots and dock ----------------------------------------- */}
        <g id="phone-pages" fill="var(--text-muted)">
          <circle cx="178" cy="560" r="3.5" opacity="0.95" />
          <circle cx="192" cy="560" r="3.5" opacity="0.4" />
          <circle cx="206" cy="560" r="3.5" opacity="0.4" />
        </g>

        <g id="phone-dock">
          <rect
            x="40"
            y="596"
            width="300"
            height="92"
            rx="32"
            fill="var(--surface-2)"
            opacity="0.72"
          />
          {d.dock.map((app, i) => (
            <AppTile key={app.label} app={app} x={56 + i * 71} y={614} bare />
          ))}
        </g>

        <rect x="145" y="706" width="110" height="5" rx="2.5" fill="var(--text)" opacity="0.45" />
      </g>
    </svg>
  )
}

/* --- one tile -------------------------------------------------------------
   Furniture. Muted charcoal tints from the theme rather than a colour per
   app: a rainbow of icons on a dark slide pulls every eye away from the one
   tile that matters. */
function AppTile({
  app,
  x,
  y,
  bare = false,
}: {
  app: PhoneApp
  x: number
  y: number
  /** Dock tiles carry no label — neither do the real ones. */
  bare?: boolean
}) {
  return (
    <g className="phone__app">
      <rect
        x={x}
        y={y}
        width={ICON}
        height={ICON}
        rx="14"
        fill={`var(--app-${app.tint})`}
        stroke="var(--line)"
        strokeWidth="1"
      />
      <Glyph name={app.glyph} x={x} y={y} />
      {!bare && (
        <text x={x + ICON / 2} y={y + ICON + 15} className="phone__label">
          {app.label}
        </text>
      )}
    </g>
  )
}

/** The mark on a tile. Six shapes, drawn in a 56×56 box at (x, y), all in
 *  one muted colour — they are texture, not iconography. */
function Glyph({ name, x, y }: { name: PhoneApp['glyph']; x: number; y: number }) {
  const common = {
    fill: 'none',
    stroke: 'var(--app-glyph)',
    strokeWidth: 2.2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    opacity: 0.72,
  }
  return (
    <g transform={`translate(${x} ${y})`}>
      {name === 'doc' && (
        <g {...common}>
          <rect x="17" y="14" width="22" height="28" rx="3" />
          <path d="M23 23h10M23 29h10M23 35h6" />
        </g>
      )}
      {name === 'grid' && (
        <g {...common}>
          <rect x="16" y="16" width="10" height="10" rx="2.5" />
          <rect x="30" y="16" width="10" height="10" rx="2.5" />
          <rect x="16" y="30" width="10" height="10" rx="2.5" />
          <rect x="30" y="30" width="10" height="10" rx="2.5" />
        </g>
      )}
      {name === 'ring' && (
        <g {...common}>
          <circle cx="28" cy="28" r="12" />
          <circle cx="28" cy="28" r="4" />
        </g>
      )}
      {name === 'wave' && (
        <g {...common}>
          <path d="M14 32c4-10 8-10 12 0s8 10 12 0 8-10 12 0" transform="translate(-2 0)" />
        </g>
      )}
      {name === 'bars' && (
        <g {...common}>
          <path d="M18 38V28M28 38V18M38 38V24" />
        </g>
      )}
      {name === 'chat' && (
        <g {...common}>
          <path d="M16 22a4 4 0 0 1 4-4h16a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H26l-7 6v-6h-1a2 2 0 0 1-2-2z" />
        </g>
      )}
    </g>
  )
}
