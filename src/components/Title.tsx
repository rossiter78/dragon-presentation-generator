import type { SectionMeta } from '../deck/content-types'
import { Beat } from '../stage/Beat'
import './title.css'

/**
 * The opening card. Nothing but type — no diagram, no motion beyond the
 * reveal itself. The title has to carry on its own, and anything moving next
 * to it steals from it.
 *
 * Beat 0 is the title alone. Everything else in `items` arrives one beat at
 * a time, exactly like every other section.
 *
 * `hold` on both, for the reason spelled out in Body.tsx: the card is
 * centred, so mounting the subtitle on its beat would lift the title off
 * its mark just as the room finishes reading it. Here it is the worst
 * possible place for that — it is the first thing they see.
 */
export function Title({ meta }: { meta: SectionMeta }) {
  return (
    <div className="title">
      <Beat at={0} reveal="fade" hold>
        <h1 className="title__h">{meta.title}</h1>
      </Beat>

      {meta.content.items.map((item, i) =>
        item.kind === 'line' ? (
          <Beat key={item.text} at={i + 1} delay={0.05} hold>
            <p className="title__sub" data-lead={item.lead || undefined}>
              <span className="title__mark" aria-hidden="true" />
              {item.text}
            </p>
          </Beat>
        ) : null,
      )}
    </div>
  )
}
