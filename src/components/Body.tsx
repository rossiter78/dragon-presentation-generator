/* ==========================================================================
   The workhorse section.
   --------------------------------------------------------------------------
   Heading at beat 0, then one item per beat: a fragment, or a screenshot.

   Two layouts, chosen by the content rather than declared by the author. A
   section with no figures is a single column of large type. A section with
   figures splits: the words hold a narrow column on the left, the shots take
   the rest of the width — which is why those sections also set `wide` and
   get a wider inner container. A screenshot of a phone conversation is
   unreadable from the back of a room at body-text width.

   EVERYTHING is revealed with `hold`, so its space is reserved from the
   moment you arrive. The alternative is the layout jumping under the
   audience mid-sentence, which is worse than a little empty space.

   This applies to the fragments and not only to the figures, and the
   difference is not cosmetic. A section is `align-content: center`, so
   mounting a line on its beat grows the column and re-centres everything
   above it — every fragment already on screen slides upward each time a
   new one lands. Measured across this deck before the fix: 25 of 27
   sections moved visible text, the worst by 115px, 1159px in total. The
   audience is reading those lines while they move.

   With `hold` the column is its final size from beat 0 and a reveal is
   pure opacity and transform, which do not reflow. The cost is that early
   beats sit high in a block sized for the finished section rather than
   centred on their own — which is what a slide does anyway, and is a
   fixed, calm layout instead of a moving one.
   ========================================================================== */

import type { CSSProperties } from 'react'
import type { FigureItem, GraphicItem, LineItem, SectionMeta } from '../deck/content-types'
import { scaleFactor } from '../deck/content-types'
import { Beat } from '../stage/Beat'
import { getRegistry } from '../deck/registry'
import './body.css'

/** An item's `scale` (1–100) as the inline custom property body.css reads.
 *  Set on the <figure>, which is where `--shot-h` is derived, so it reaches
 *  the screenshot, the pending frame and the drawings' own stylesheets
 *  alike. Undefined when the item did not ask for one: no inline style at
 *  all, and the CSS default of 1 stands.
 *
 *  `data-scaled` rides along because the two cases are not the same rule.
 *  An unscaled figure is CAPPED and otherwise left at its natural size; a
 *  scaled one is SIZED. See body.css — the distinction is what lets a small
 *  asset like the QR be made bigger as well as smaller. */
function scaleProps(scale: number | undefined) {
  const factor = scaleFactor(scale)
  if (factor === undefined) return {}
  return {
    'data-scaled': '',
    style: { '--shot-scale': String(factor) } as CSSProperties,
  }
}

export function Body({ meta }: { meta: SectionMeta }) {
  const items = meta.content.items
  /* Both kinds take the right-hand column, so either one puts the section
     into the split layout. */
  const hasAside = items.some((i) => i.kind === 'figure' || i.kind === 'graphic')

  return (
    <div className="body" data-split={hasAside || undefined}>
      <div className="body__words">
        <h2 className="body__title">{meta.title}</h2>
        <div className="body__lines">
          {items.map((item, i) =>
            item.kind === 'line' ? (
              <Beat key={item.text} at={i + 1} hold>
                <Line item={item} />
              </Beat>
            ) : null,
          )}
        </div>

        {/* Furniture, not a beat: no <Beat> wrapper, so it is simply there
            from the moment you arrive. BASE_URL rather than an import — it
            lives in public/brand/ with the other brand assets. */}
        {meta.logo && (
          <img
            className="body__logo"
            src={`${import.meta.env.BASE_URL}${meta.logo.src}`}
            alt={meta.logo.alt}
          />
        )}
      </div>

      {hasAside && (
        <div className="body__figures">
          {items.map((item, i) =>
            item.kind === 'figure' || item.kind === 'graphic' ? (
              <Beat key={item.alt} at={i + 1} reveal="fade" hold>
                {item.kind === 'figure' ? (
                  <Shot item={item} />
                ) : (
                  <Drawing item={item} />
                )}
              </Beat>
            ) : null,
          )}
        </div>
      )}
    </div>
  )
}

/** One fragment. `lead` is the claim of the section — red mark, full-strength
 *  text, and there is at most one per section. */
function Line({ item }: { item: LineItem }) {
  return (
    <p className="line" data-lead={item.lead || undefined}>
      <span className="line__mark" aria-hidden="true" />
      <span className="line__text">{item.text}</span>
      {item.sub && (
        <span className="line__sub">
          {item.sub.map((s) => (
            <span key={s}>{s}</span>
          ))}
        </span>
      )}
    </p>
  )
}

/** An authored diagram. Same figure furniture as a screenshot — same
 *  column, same caption, same beat — but it draws itself, so it takes no
 *  frame of its own and no `img`. The `.shot` class is deliberately NOT on
 *  it: verify.mjs counts `.shot` against the deck's figure count. */
/** A `graphic` item names its drawing rather than importing a component
 *  into the content file — the talk stays data (DESIGN.md §9), and the
 *  drawing stays code. The name is resolved through the registry, so a talk
 *  can add its own without this file knowing about it.
 *
 *  assertRegistry() has already run by the time anything renders, so `Draw`
 *  cannot be undefined here. The guard is kept anyway: it costs one line,
 *  and a blank panel on stage with no explanation is the exact failure this
 *  whole registry exists to prevent. */
function Drawing({ item }: { item: GraphicItem }) {
  const { graphics } = getRegistry()
  const Draw = graphics[item.name]
  if (!Draw) return <figure className="graphic" data-missing={item.name} />
  return (
    <figure className="graphic" {...scaleProps(item.scale)}>
      <div className="graphic__art" role="img" aria-label={item.alt}>
        <Draw data={item.data} />
      </div>
      <figcaption className="graphic__caption">{item.caption}</figcaption>
    </figure>
  )
}

/** A screenshot, or a labelled frame where one is still to be taken. The
 *  placeholder is deliberately loud: a missing shot should be obvious in
 *  rehearsal, not discovered on stage. */
function Shot({ item }: { item: FigureItem }) {
  return (
    <figure className="shot" {...scaleProps(item.scale)}>
      {item.src ? (
        <img className="shot__img" src={item.src} alt={item.alt} />
      ) : (
        <div className="shot__pending" role="img" aria-label={item.alt}>
          <code>{item.pending}</code>
          <span>screenshot still to be taken</span>
        </div>
      )}
      <figcaption className="shot__caption">{item.caption}</figcaption>
    </figure>
  )
}
