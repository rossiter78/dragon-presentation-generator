/* ==========================================================================
   The ring.  GRAPHIC — data comes from the item.
   --------------------------------------------------------------------------
   N peers on a circle, every one wired to every other, and messages crossing
   between them as lights. The shape fits any claim about a mesh: services
   talking directly, a team without a manager, a protocol with no broker.

   THE MIDDLE IS EMPTY, and that is the whole drawing. There is no
   supervisor, no router, no dispatcher — a message goes from one peer to
   another and nothing in the centre decides that it should. A hub would be
   easier to draw and would be a lie about the architecture, so the centre
   stays empty and the mesh does the talking.

   THE PEERS ARE UNNAMED on purpose. Naming them invites the room to work out
   which is which instead of seeing the shape, and the shape is the point: a
   team, not a pile of boxes. If your argument needs names, it probably needs
   a different diagram.

   THIS ONE MOVES, and it is the only shipped graphic that does. Motion here
   IS the content: messages in flight are the thing a mesh does, and a still
   mesh of hairlines says "these could talk", not "these are talking". The
   lights are slow, they never all fire at once, and there is nothing to read
   on them, so they carry no reading cost while you speak. Decoration that
   animates a thing the room has already understood should come out; this
   is not that.

   HAND-AUTHORED SVG with stable IDs — DESIGN.md §6. Motion is SMIL
   `animateMotion` down a straight path between two node edges: no layout,
   no JavaScript timer, identical on every rehearsal, and it keeps running
   in the PDF export's still frame without leaving anything half-drawn.

   EVERYTHING IS DERIVED FROM `count`. Change it to six and the circle
   re-spaces itself, the mesh redraws with fifteen edges instead of ten, and
   the message paths follow. Nothing here needs a second edit.
   ========================================================================== */

import { graphic } from '../deck/content-types'
import type { GraphicItem } from '../deck/content-types'
import './ring.css'

/** One message, in flight.
 *
 *  `from` and `to` index the ring clockwise from twelve o'clock. Seconds,
 *  both of them.
 *
 *  NO TWO DURATIONS SHOULD DIVIDE INTO EACH OTHER. That is what stops the
 *  traffic settling into a visible rhythm, and it is the one property to
 *  preserve when you add a message. Ratios like 2.5 and 5.0 will sync up
 *  within a minute and the ring starts to look like a metronome. */
export interface RingMessage {
  from: number
  to: number
  dur: number
  delay: number
}

export interface AgentRingData {
  /** How many peers. Three is the fewest that reads as a mesh rather than a
   *  pair; above seven the nodes crowd and the lines turn to hatching. */
  count: number
  messages: RingMessage[]
}

/** Build a ring graphic with its data checked. Drop it in a section's items
 *  exactly like a screenshot — it takes a beat and sits in the figure
 *  column. */
export function agentRing(opts: {
  alt: string
  caption: string
  cue?: string
  scale?: number
  data: AgentRingData
}): GraphicItem {
  return graphic('agent-ring', opts)
}

/* --- the circle ----------------------------------------------------------
   First node at twelve o'clock, then evenly around. */
const C = 280 // centre, both axes
const R = 188 // how far out the peers sit
const NODE = 46 // a peer's radius
const GAP = 12 // clearance between a node's edge and a line touching it

type Point = { x: number; y: number }

function ringNodes(count: number): Point[] {
  return Array.from({ length: count }, (_, i) => {
    const a = (-90 + i * (360 / count)) * (Math.PI / 180)
    return { x: C + R * Math.cos(a), y: C + R * Math.sin(a) }
  })
}

/** Every pair, once. Ten lines for five peers — the mesh is drawn in full
 *  because "every one of them can reach every other" is the claim. */
function ringEdges(count: number): [number, number][] {
  const edges: [number, number][] = []
  for (let i = 0; i < count; i++) {
    for (let j = i + 1; j < count; j++) edges.push([i, j])
  }
  return edges
}

/** The straight run between two peers, trimmed at both ends so a line —
 *  or a light — starts at the edge of a node and not under it. */
function run(nodes: Point[], from: number, to: number) {
  const a = nodes[from]
  const b = nodes[to]
  const len = Math.hypot(b.x - a.x, b.y - a.y)
  const ux = (b.x - a.x) / len
  const uy = (b.y - a.y) / len
  const t = NODE + GAP
  return {
    x1: a.x + ux * t,
    y1: a.y + uy * t,
    x2: b.x - ux * t,
    y2: b.y - uy * t,
  }
}

export function AgentRing({ data }: { data?: unknown }) {
  const { count, messages } = data as AgentRingData
  const nodes = ringNodes(count)
  const edges = ringEdges(count)

  return (
    <svg
      className="ring"
      viewBox="0 0 560 560"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <filter id="ring-soft" x="-120%" y="-120%" width="340%" height="340%">
          <feGaussianBlur stdDeviation="10" />
        </filter>
        <filter id="ring-spark" x="-300%" y="-300%" width="700%" height="700%">
          <feGaussianBlur stdDeviation="3.2" />
        </filter>
      </defs>

      {/* --- who can reach whom ------------------------------------------ */}
      <g id="ring-mesh" stroke="var(--line-strong)" strokeWidth="1.2" opacity="0.55">
        {edges.map(([i, j]) => {
          const r = run(nodes, i, j)
          return <path key={`${i}-${j}`} d={`M${r.x1} ${r.y1} L${r.x2} ${r.y2}`} />
        })}
      </g>

      {/* --- the peers ---------------------------------------------------- */}
      <g id="ring-agents">
        {nodes.map((n, i) => (
          <g key={i} className="ring__agent">
            {/* The glow breathes on its own clock — a different delay per
                node, so the ring never pulses in unison and never reads as
                one thing blinking. */}
            <circle
              className="ring__glow"
              cx={n.x}
              cy={n.y}
              r={NODE + 6}
              fill="var(--accent-fill)"
              filter="url(#ring-soft)"
              style={{ animationDelay: `${i * 0.94}s` }}
            />
            <circle
              cx={n.x}
              cy={n.y}
              r={NODE}
              fill="var(--surface-2)"
              stroke="var(--line-strong)"
              strokeWidth="1.5"
            />
            <circle
              cx={n.x}
              cy={n.y}
              r={NODE - 17}
              fill="none"
              stroke="var(--accent-400)"
              strokeWidth="1.5"
              opacity="0.6"
            />
            <circle cx={n.x} cy={n.y} r="9" fill="var(--accent-fill)" />
          </g>
        ))}
      </g>

      {/* --- messages in flight ------------------------------------------- */}
      <g id="ring-traffic">
        {messages.map((m, i) => (
          <Light key={i} nodes={nodes} {...m} />
        ))}
      </g>
    </svg>
  )
}

/** One message, crossing.
 *
 *  Three circles on the same line. A red halo and a near-white core travel
 *  together — that pairing is what makes a dot read as a LIGHT rather than
 *  as a bead sliding down a wire — and a dim dot follows a breath behind
 *  them so the thing has a direction at a glance.
 *
 *  Each fades in as it leaves and out as it lands, so nothing ever pops
 *  into existence mid-ring. */
function Light({
  nodes,
  from,
  to,
  dur,
  delay,
}: RingMessage & { nodes: Point[] }) {
  const r = run(nodes, from, to)
  const d = `M${r.x1} ${r.y1} L${r.x2} ${r.y2}`
  const spec = { dur: `${dur}s`, repeatCount: 'indefinite' as const }

  /** Motion and its opacity envelope, applied to whatever circle asks for
   *  them. `lag` puts the trail behind the head. */
  const fly = (lag: number, values: string) => (
    <>
      <animateMotion {...spec} begin={`${delay + lag}s`} path={d} />
      <animate
        attributeName="opacity"
        values={values}
        keyTimes="0;0.14;0.82;1"
        begin={`${delay + lag}s`}
        {...spec}
      />
    </>
  )

  return (
    <g className="ring__light">
      <circle r="2.4" fill="var(--accent-300)" opacity="0">
        {fly(0.14, '0;0.4;0.4;0')}
      </circle>
      <circle r="7" fill="var(--accent-300)" filter="url(#ring-spark)" opacity="0">
        {fly(0, '0;0.9;0.9;0')}
      </circle>
      <circle r="2.8" fill="var(--text)" opacity="0">{fly(0, '0;1;1;0')}</circle>
    </g>
  )
}
