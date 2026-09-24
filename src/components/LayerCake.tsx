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

   Beats build the diagram. Number keys expand a piece, counted from the
   floor up and left to right within a layer: key 1 is the floor, and `Esc`
   or `0` closes. The expanded piece brightens and the rest dim, so the room's
   eye follows the change without you having to say "look at the third box
   down". Use this during Q&A instead of talking over a static diagram.

   ANY NUMBER OF LAYERS, BOTTOM-UP. A layer is one full-width piece or
   several side by side — split it by giving it more than one piece. If what
   you are drawing is not a stack, this is the wrong pattern and you want a
   bespoke graphic.
   ========================================================================== */

import { AnimatePresence, motion } from 'motion/react'
import type { SectionMeta } from '../deck/content-types'
import { cue, section } from '../deck/content-types'
import { useBeat, useDetail } from '../stage/StageProvider'
import './layers.css'

/** One box in the stack. A layer that is not split has exactly one. */
export interface LayerPiece {
  id: string
  name: string
  /** A word or two for the shape of the thing — "tables", "HTTP", "tools". */
  shape: string
  /** One fragment. Never a sentence. */
  detail: string
  /** Expanded by its number key. Fragments, max ~8 words each.
   *
   *  OPTIONAL. Leave it off for a piece that needs no elaboration — its key
   *  then still highlights the card and dims the others, which is the useful
   *  half of the gesture anyway. Do not delete a `points` array and expect
   *  the key to be inert; it will still spotlight the piece. */
  points?: string[]
}

export interface Layer {
  /** Side by side, left to right. Two or more pieces split the layer. */
  pieces: LayerPiece[]
  /** Beat index at which this layer appears. OPTIONAL: by default a layer
   *  arrives on its own beat, floor first — layer 1 on beat 1, layer 2 on
   *  beat 2. Give two layers the same number to land them together. */
  appearsAt?: number
}

export interface LayerCakeData {
  /** FLOOR FIRST: index 0 is the bottom of the stack. The number keys walk
   *  the pieces in this order, left to right within a layer, and
   *  `cakeSection()` derives `detailKeys` from it — so the presenter
   *  window's crib sheet and the actual bindings cannot drift apart. */
  layers: Layer[]
}

const appearsAt = (layer: Layer, index: number) => layer.appearsAt ?? index + 1

/** Build a layer-cake section with its data checked.
 *
 *  BEATS ARE DERIVED from the layers: the section needs one keypress per
 *  distinct `appearsAt`, and this counts them rather than asking you to.
 *
 *  `detailKeys` is derived too — the number keys the presenter window
 *  prints are the piece names, in key order, which is the only way that
 *  crib sheet stays honest. */
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
  const { layers } = meta.data
  const last = Math.max(...layers.map(appearsAt))
  const cues =
    meta.cues ??
    Array.from({ length: last }, (_, i) => {
      const arriving = layers.filter((l, index) => appearsAt(l, index) === i + 1)
      return arriving.flatMap((l) => l.pieces.map((p) => p.name)).join(' · ') || 'Next.'
    })

  return section({
    id: meta.id,
    title: meta.title,
    eyebrow: meta.eyebrow,
    budgetMinutes: meta.budgetMinutes,
    notes: meta.notes,
    detailKeys: layers.flatMap((l) => l.pieces.map((p) => p.name)),
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
  const { layers } = meta.content.data as LayerCakeData
  const beat = useBeat()
  const detail = useDetail()
  const readMode = detail === -1

  /* Key order is floor-up, but the stack is drawn top-down, so number the
     pieces before reversing the rows. */
  let key = 0
  const rows = layers.map((layer, index) => ({
    layer,
    visible: beat >= appearsAt(layer, index),
    pieces: layer.pieces.map((piece) => ({ piece, index: key++ })),
  }))

  return (
    <div className="cake">
      <h2 className="cake__title">{meta.title}</h2>

      <div className="cake__stack">
        {rows.reverse().map(({ layer, visible, pieces }) => (
          <div className="cake__row" key={layer.pieces[0].id}>
            {pieces.map(({ piece, index }) => (
              <LayerCard
                key={piece.id}
                piece={piece}
                number={index + 1}
                visible={visible}
                open={readMode || detail === index}
                dimmed={!readMode && detail !== null && detail !== index}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

function LayerCard({
  piece,
  number,
  visible,
  open,
  dimmed,
}: {
  piece: LayerPiece
  number: number
  visible: boolean
  open: boolean
  dimmed: boolean
}) {
  return (
    <motion.div
      className="layer"
      data-open={open || undefined}
      data-dimmed={dimmed || undefined}
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
        <span className="layer__name">{piece.name}</span>
        <span className="layer__shape">{piece.shape}</span>
      </span>
      <span className="layer__detail">{piece.detail}</span>

      {/* `points` is optional: a piece may carry no elaboration at all, and
          an empty card must not be an empty <motion.span> with a border on
          it. Highlighting still works — that is what `open` does to the card
          itself — so a key press on a bullet-less piece spotlights it. */}
      <AnimatePresence initial={false}>
        {open && piece.points && piece.points.length > 0 && (
          <motion.span
            className="layer__more"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.34, ease: [0.16, 1, 0.3, 1] }}
          >
            <span className="layer__moreInner">
              {piece.points.map((p) => (
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
