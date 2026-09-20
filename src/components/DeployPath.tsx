/* ==========================================================================
   The deploy path.  GRAPHIC — data comes from the item.
   --------------------------------------------------------------------------
   Laptop, repository, and one machine: a host, a VM inside it, a container
   runtime inside that. For the slide that answers "where does this actually
   run?"

   The nesting IS the diagram. Three boxes inside one another say "it all
   runs on one box" faster than the three fragments beside it can, which is
   why the fragments get to stay fragments.

   HAND-AUTHORED SVG with stable IDs — DESIGN.md §6. The flow arrows are
   `--accent-400`, the rung that measures 4.64:1 and is cleared for meaningful
   lines; the fills are surfaces; nothing here invents a colour.

   NO LOGOS, and keep it that way. The repository and the runtime are named
   in text and drawn as generic marks — a branch, a stack of containers. A
   talk does not need to reproduce anyone's trademark to point at their
   product, and a deck that ships someone else's logo is a deck you cannot
   open-source.

   EVERYTHING BELOW IS DERIVED. The panel grows from the number of
   containers in the data, the VM grows from the panel, the drawing's
   height grows from the VM, and the two cards on the left re-centre on the
   result. Add a sixth container and the diagram re-lays itself; nothing
   here needs a second edit, and nothing can end up half a box out.

   Nothing on it moves, for the same reason the phone home screen does not:
   the argument is the words beside it. Compare AgentRing.tsx, where the
   motion is the content and so it earns its keep.
   ========================================================================== */

import { graphic } from '../deck/content-types'
import type { GraphicItem } from '../deck/content-types'
import './deploy.css'

/** One box on the machine: what it is called and what it does. Two or three
 *  words for the role — it is a label inside a chip, not a description. */
export interface DeployContainer {
  name: string
  role: string
}

/** The path from where you write code to where it runs.
 *
 *  Names, not architecture: change a container here and the drawing follows.
 *  Nothing in this file is a picture of any particular stack — swap Proxmox
 *  for a cloud region and GitHub for anything with a branch, and the diagram
 *  still says what it says. */
export interface DeployPathData {
  /** Where the code is written. */
  laptop: { title: string; sub: string }
  /** Where it is pushed. */
  repo: { title: string; sub: string }
  /** What happens ON each arrow. Two words each — they are labels on a
   *  line, not a sentence about the line. */
  steps: { push: string; deploy: string }
  /** The machine. `hardware` is small print: it is there for the one person
   *  in the room who wants to know what the box is, and it is sized so that
   *  nobody else has to read it. Pass an empty string to drop it. */
  host: { title: string; hardware: string }
  /** The virtualisation layer, if there is one. */
  vm: string
  /** The container runtime. */
  runtime: string
  /** Every container on the machine, in the order they read best: the
   *  things you wrote, then what they run on. Add one and the drawing
   *  re-lays itself — the panel, the VM and the diagram's height all derive
   *  from this list, so nothing else needs an edit. */
  containers: DeployContainer[]
  /** What the deploy does, in the order it does it. */
  deployStep: string
}

/** Build a deploy-path graphic with its data checked. */
export function deployPath(opts: {
  alt: string
  caption: string
  cue?: string
  scale?: number
  data: DeployPathData
}): GraphicItem {
  return graphic('deploy-path', opts)
}

/* --- the machine, from the inside out ------------------------------------
   Read this bottom-up: a container has a size, so the stack of them has a
   size, so the runtime does, so the VM does, so the box does. */
const CHIP = { x: 598, w: 284, h: 52, gap: 12 }
const DOCKER = { x: 578, w: 324, top: 158 }
const VM = { x: 556, w: 368, top: 116 }
const P = { x: 530, y: 24, w: 420 }

/** Top of container i. The first sits below the runtime's own label. */
const chipY = (i: number) => DOCKER.top + 36 + i * (CHIP.h + CHIP.gap)

/* --- the two stages on the left ------------------------------------------
   Authored in their own 160×150 box and placed with a transform, so the
   flow can re-centre on a taller or shorter machine without a single glyph
   coordinate moving. */
const CARD = { w: 160, h: 150 }
const A_X = 10 // laptop
const B_X = 270 // repository

/** Every derived dimension, from the one number that varies.
 *
 *  This is the whole reason the diagram re-lays itself: the caller supplies
 *  a list of containers and everything from the runtime panel's floor to the
 *  viewBox height falls out of its length. */
function layout(count: number) {
  /** What the deploy does, on the floor of the runtime. */
  const fineY = chipY(count - 1) + CHIP.h + 26
  const dockerH = fineY + 20 - DOCKER.top
  const vmH = DOCKER.top + dockerH + 20 - VM.top
  const pH = VM.top + vmH + 16 - P.y
  const height = P.y + pH + 24
  const mid = P.y + pH / 2 // the flow's baseline
  return { fineY, dockerH, vmH, pH, height, mid, cardY: mid - CARD.h / 2 }
}

export function DeployPath({ data }: { data?: unknown }) {
  const d = data as DeployPathData
  const COUNT = d.containers.length
  const {
    fineY: FINE_Y,
    dockerH: DOCKER_H,
    vmH: VM_H,
    pH: P_H,
    height: HEIGHT,
    mid: MID,
    cardY: CARD_Y,
  } = layout(COUNT)

  return (
    <svg
      className="deploy"
      viewBox={`0 0 960 ${HEIGHT}`}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <marker
          id="deploy-head"
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="9"
          markerHeight="9"
          markerUnits="userSpaceOnUse"
          orient="auto"
        >
          <path d="M0 0 L10 5 L0 10 Z" fill="var(--accent-400)" />
        </marker>
      </defs>

      {/* --- 1. the laptop ----------------------------------------------- */}
      <Stage id="deploy-laptop" x={A_X} cardY={CARD_Y} node={d.laptop}>
        <g
          fill="var(--surface-3)"
          stroke="var(--line-strong)"
          strokeWidth="1.6"
          strokeLinejoin="round"
        >
          <rect x="50" y="27" width="60" height="42" rx="5" />
          <path d="M44 71 L116 71 L126 81 L34 81 Z" />
        </g>
        <rect x="55" y="32" width="50" height="32" rx="3" fill="var(--ink)" />
        {/* Three lines of code on the lid. Nobody reads them; they are what
            stops the rectangle reading as a television. */}
        <g stroke="var(--accent-400)" strokeWidth="2" strokeLinecap="round" opacity="0.65">
          <path d="M62 41 h14M62 48 h24M62 55 h18" />
        </g>
      </Stage>

      <Arrow from={A_X + CARD.w + 16} to={B_X - 14} mid={MID} label={d.steps.push} />

      {/* --- 2. the repository ------------------------------------------- */}
      <Stage id="deploy-repo" x={B_X} cardY={CARD_Y} node={d.repo} mono>
        <rect
          x="50"
          y="23"
          width="60"
          height="50"
          rx="8"
          fill="var(--surface-3)"
          stroke="var(--line-strong)"
          strokeWidth="1.6"
        />
        {/* A branch: trunk, fork, merge. The universal shape for a repo,
            and not a logo. */}
        <g
          fill="none"
          stroke="var(--accent-400)"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.9"
        >
          <path d="M66 37 v22" />
          <path d="M66 45 h14 a6 6 0 0 0 6-6 v-2" />
        </g>
        <g fill="var(--accent-fill)">
          <circle cx="66" cy="34" r="3.4" />
          <circle cx="66" cy="62" r="3.4" />
          <circle cx="86" cy="34" r="3.4" />
        </g>
      </Stage>

      <Arrow from={B_X + CARD.w + 16} to={P.x - 14} mid={MID} label={d.steps.deploy} />

      {/* --- 3. the machine ----------------------------------------------- */}
      <g id="deploy-host">
        <rect
          x={P.x}
          y={P.y}
          width={P.w}
          height={P_H}
          rx="18"
          fill="var(--surface)"
          stroke="var(--line-strong)"
          strokeWidth="1.5"
        />
        <text x="554" y="64" className="deploy__host">
          {d.host.title}
        </text>
        {/* The small print the room does not need and one person in it will
            want. Muted, mono, and under the name where it belongs. */}
        <text x="554" y="84" className="deploy__fine">
          {d.host.hardware}
        </text>

        {/* Three rack units. Enough to say "a server", not enough to
            compete with anything. */}
        <g id="deploy-rack" fill="var(--surface-2)" stroke="var(--line)" strokeWidth="1">
          <rect x="886" y="44" width="44" height="12" rx="2" />
          <rect x="886" y="60" width="44" height="12" rx="2" />
          <rect x="886" y="76" width="44" height="12" rx="2" />
        </g>
        <g fill="var(--accent-fill)">
          <circle cx="892" cy="50" r="2" />
          <circle cx="892" cy="66" r="2" />
          <circle cx="892" cy="82" r="2" />
        </g>

        <path d="M554 100 H926" stroke="var(--line)" strokeWidth="1" />

        {/* --- the VM --------------------------------------------------- */}
        <g id="deploy-vm">
          <rect
            x={VM.x}
            y={VM.top}
            width={VM.w}
            height={VM_H}
            rx="14"
            fill="var(--surface-2)"
            stroke="var(--line)"
            strokeWidth="1.2"
          />
          <text x="578" y={VM.top + 26} className="deploy__tier">
            {d.vm}
          </text>

          {/* --- Docker ------------------------------------------------- */}
          <g id="deploy-docker">
            <rect
              x={DOCKER.x}
              y={DOCKER.top}
              width={DOCKER.w}
              height={DOCKER_H}
              rx="12"
              fill="var(--surface-3)"
              fillOpacity="0.5"
              stroke="var(--line-strong)"
              strokeWidth="1.2"
              strokeDasharray="5 4"
            />
            <text x="598" y={DOCKER.top + 24} className="deploy__tier deploy__tier--runtime">
              {d.runtime}
            </text>

            {d.containers.map((c, i) => (
              <Container key={c.name} container={c} y={chipY(i)} />
            ))}

            <text x="598" y={FINE_Y} className="deploy__fine">
              {d.deployStep}
            </text>
          </g>
        </g>
      </g>
    </svg>
  )
}

/** One stage of the flow before the machine: a frame, a mark, a name and a
 *  line under it. Same surface, same hairline, same radius as a layer card
 *  on the cake — this is the deck's one box. */
function Stage({
  id,
  x,
  cardY,
  node,
  mono = false,
  children,
}: {
  id: string
  x: number
  /** Vertical placement, derived from the machine's height by layout() —
   *  which is why it is a prop rather than a module constant. */
  cardY: number
  node: { title: string; sub: string }
  /** The sub-line is a string you would type — a git ref — so it is set
   *  like one. */
  mono?: boolean
  children: React.ReactNode
}) {
  return (
    <g id={id} transform={`translate(${x} ${cardY})`}>
      <rect
        x="0"
        y="0"
        width={CARD.w}
        height={CARD.h}
        rx="14"
        fill="var(--surface)"
        stroke="var(--line)"
        strokeWidth="1.2"
      />
      {children}
      <text x="80" y="109" className="deploy__name">
        {node.title}
      </text>
      <text x="80" y="129" className={`deploy__sub${mono ? ' deploy__sub--mono' : ''}`}>
        {node.sub}
      </text>
    </g>
  )
}

/** One step of the flow. The line is what the audience follows, so it takes
 *  the lifted red; the label rides above it in the same mono the layer cake
 *  uses for a shape. */
function Arrow({
  from,
  to,
  mid,
  label,
}: {
  from: number
  to: number
  /** The flow's baseline, derived by layout(). */
  mid: number
  label: string
}) {
  return (
    <g className="deploy__step">
      <path
        d={`M${from} ${mid} H${to}`}
        fill="none"
        stroke="var(--accent-400)"
        strokeWidth="2"
        markerEnd="url(#deploy-head)"
      />
      <text x={(from + to) / 2} y={mid - 14} className="deploy__stepLabel">
        {label}
      </text>
    </g>
  )
}

/** A running container. The red square is the same mark the layer cake puts
 *  on an expanded bullet, so the two diagrams read as one family. */
function Container({
  container,
  y,
}: {
  container: { name: string; role: string }
  y: number
}) {
  const cy = y + CHIP.h / 2
  return (
    <g className="deploy__container">
      <rect
        x={CHIP.x}
        y={y}
        width={CHIP.w}
        height={CHIP.h}
        rx="10"
        fill="var(--surface)"
        stroke="var(--line-strong)"
        strokeWidth="1.2"
      />
      <rect x={CHIP.x + 18} y={cy - 3} width="6" height="6" rx="1" fill="var(--accent-fill)" />
      <text x={CHIP.x + 36} y={cy + 5} className="deploy__containerName">
        {container.name}
      </text>
      <text x={CHIP.x + CHIP.w - 18} y={cy + 5} className="deploy__containerRole">
        {container.role}
      </text>
    </g>
  )
}
