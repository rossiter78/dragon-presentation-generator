/* ==========================================================================
   The layer cake.  PATTERN — data comes from the section.
   --------------------------------------------------------------------------
   A stack of named layers that builds from the floor up, with expandable
   detail on the number keys. For the slide that answers "how is this put
   together?" without turning into a wall of boxes and arrows.

   KEYBOARD ONLY. There is nothing to click and no hover affordance, because a
   pointer is the one input you do not reliably have on stage — and because a
   cursor moving across a projector is invisible to the room, so a hover
   reveal looks to the audience like the screen changed for no reason.

   Beats build the diagram. Number keys expand a layer, in the order the
   layers are declared: key 1 is the first, and `Esc` or `0` closes. The
   expanded layer brightens and the rest dim, so the room's eye follows the
   change without you having to say "look at the third box down". Use this
   during Q&A instead of talking over a static diagram.

   FOUR ROWS, BOTTOM-UP: one `data`, one `logic`, then as many `surface` and
   `client` cards as you declare. If your architecture does not fit that
   shape, this is the wrong pattern and you want a bespoke graphic.
   ========================================================================== */

import { AnimatePresence, motion } from 'motion/react'
import type { SectionMeta } from '../deck/content-types'
import { cue, section } from '../deck/content-types'
import { useBeat, useDetail } from '../stage/StageProvider'
import './layers.css'

/** Where a layer sits in the stack. The four rows are drawn bottom-up:
 *  `data` on the floor, `logic` above it, `surface` above that, and
 *  `client` on top. There is exactly one `data` and one `logic` row; the
 *  other two take as many cards as you give them. */
export type LayerRole = 'data' | 'logic' | 'surface' | 'client'

export interface Layer {
  id: string
  name: string
  role: LayerRole
  /** Beat index at which this layer appears. The stack is empty at beat 0
   *  and builds from the data up. */
  appearsAt: number
  /** A word or two for the shape of the thing — "tables", "HTTP", "tools". */
  shape: string
  /** One fragment. Never a sentence. */
  detail: string
  /** Expanded by its number key. Fragments, max ~8 words each.
   *
   *  OPTIONAL. Leave it off for a layer that needs no elaboration — its key
   *  then still highlights the card and dims the others, which is the useful
   *  half of the gesture anyway. Do not delete a `points` array and expect
   *  the key to be inert; it will still spotlight the layer. */
  points?: string[]
}

export interface LayerCakeData {
  /** ORDER IS THE KEY MAPPING: index 0 is key 1. `cakeSection()` derives
   *  `detailKeys` from this list, so the presenter window's crib sheet and
   *  the actual bindings cannot drift apart. */
  layers: Layer[]
  /** The bracketed aside that appears beside the stack — the one thing the
   *  diagram cannot say by its own geometry. */
  peer: string
  /** Beat at which that aside arrives. */
  peerBeat: number
}

/** Build a layer-cake section with its data checked.
 *
 *  BEATS ARE DERIVED from the layers: the section needs one keypress per
 *  `appearsAt` value plus the peer beat, and this counts them rather than
 *  asking you to. Give a layer `appearsAt: 3` and the beat exists.
 *
 *  `detailKeys` is derived too — the number keys the presenter window
 *  prints are the layer names, in order, which is the only way that crib
 *  sheet stays honest. */
export function cakeSection(meta: {
  id: string
  title: string
  eyebrow?: string
  budgetMinutes: number
  notes: string[]
  data: LayerCakeData
  open?: string
  cues?: string[]
}): SectionMeta {
  const last = Math.max(
    meta.data.peerBeat,
    ...meta.data.layers.map((l) => l.appearsAt),
  )
  const cues =
    meta.cues ??
    Array.from({ length: last }, (_, i) => {
      const arriving = meta.data.layers.filter((l) => l.appearsAt === i + 1)
      if (i + 1 === meta.data.peerBeat && !arriving.length) return 'The aside. Let it sit.'
      return arriving.map((l) => l.name).join(' · ') || 'Next.'
    })

  return section({
    id: meta.id,
    title: meta.title,
    eyebrow: meta.eyebrow,
    budgetMinutes: meta.budgetMinutes,
    notes: meta.notes,
    detailKeys: meta.data.layers.map((l) => l.name),
    content: {
      kind: 'cake',
      open: meta.open ?? 'Empty stack. Nothing built yet.',
      items: cues.map(cue),
      data: meta.data,
    },
  })
}

export function LayerCake({ meta }: { meta: SectionMeta }) {
  /* The one cast, guaranteed by cakeSection(). */
  const { layers: LAYERS, peer, peerBeat: PEER_BEAT } = meta.content
    .data as LayerCakeData
  const beat = useBeat()
  const detail = useDetail()
  const readMode = detail === -1

  const clients = LAYERS.filter((l) => l.role === 'client')
  const surfaces = LAYERS.filter((l) => l.role === 'surface')
  const logic = LAYERS.find((l) => l.role === 'logic')!
  const data = LAYERS.find((l) => l.role === 'data')!

  const card = (layer: Layer) => {
    const index = LAYERS.indexOf(layer)
    const open = readMode || detail === index
    return (
      <LayerCard
        key={layer.id}
        layer={layer}
        number={index + 1}
        visible={beat >= layer.appearsAt}
        open={open}
        dimmed={!readMode && detail !== null && detail !== index}
        peer={beat >= PEER_BEAT && layer.role === 'client'}
      />
    )
  }

  return (
    <div className="cake">
      <h2 className="cake__title">{meta.title}</h2>

      <div className="cake__stack">
        <div className="cake__row cake__row--clients">{clients.map(card)}</div>

        {/* Mounted from beat 0 and revealed with opacity, never mounted on
            its beat. It sits between the client row and everything below
            it, so arriving late pushed three rows of the diagram down by
            36px — the one remaining reflow in the deck after the fragments
            were held, and the most visible place to have one, because the
            audience is reading the stack while it moves. */}
        <motion.div
          className="cake__peer"
          initial={false}
          animate={{
            opacity: beat >= PEER_BEAT ? 1 : 0,
            scaleX: beat >= PEER_BEAT ? 1 : 0.9,
          }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          aria-hidden={beat < PEER_BEAT}
        >
          <span className="cake__bracket" aria-hidden="true" />
          <p className="cake__peerText">{peer}</p>
        </motion.div>

        <div className="cake__row cake__row--surfaces">{surfaces.map(card)}</div>

        <div className="cake__row cake__row--logic">{card(logic)}</div>

        <div className="cake__row cake__row--data">{card(data)}</div>
      </div>
    </div>
  )
}

function LayerCard({
  layer,
  number,
  visible,
  open,
  dimmed,
  peer,
}: {
  layer: Layer
  number: number
  visible: boolean
  open: boolean
  dimmed: boolean
  peer: boolean
}) {
  return (
    <motion.div
      className="layer"
      data-role={layer.role}
      data-open={open || undefined}
      data-dimmed={dimmed || undefined}
      data-peer={peer || undefined}
      initial={false}
      /* Opacity is animated here rather than set in CSS: motion writes an
         inline style, which would win over a stylesheet rule and silently
         cancel the dimming. One owner for the property, and it is this. */
      animate={{
        opacity: visible ? (dimmed ? 0.3 : 1) : 0,
        y: visible ? 0 : 14,
      }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
    >
      <span className="layer__head">
        {/* The key that expands this card. Small, dim, and always present, so
            you never have to remember the mapping mid-sentence. */}
        <span className="layer__key" aria-hidden="true">
          {number}
        </span>
        <span className="layer__name">{layer.name}</span>
        <span className="layer__shape">{layer.shape}</span>
      </span>
      <span className="layer__detail">{layer.detail}</span>

      {/* `points` is optional: a layer may carry no elaboration at all, and
          an empty card must not be an empty <motion.span> with a border on
          it. Highlighting still works — that is what `open` does to the card
          itself — so a key press on a bullet-less layer spotlights it. */}
      <AnimatePresence initial={false}>
        {open && layer.points && layer.points.length > 0 && (
          <motion.span
            className="layer__more"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.34, ease: [0.16, 1, 0.3, 1] }}
          >
            <span className="layer__moreInner">
              {layer.points.map((p) => (
                <span key={p} className="layer__bullet">
                  {p}
                </span>
              ))}
            </span>
          </motion.span>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
