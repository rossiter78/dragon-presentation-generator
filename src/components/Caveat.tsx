/* ==========================================================================
   The honest limitation.  PATTERN — data comes from the section.
   --------------------------------------------------------------------------
   The shape: a claim you are about to undercut, the ways it fails, what is
   still true in spite of them, and a line that hands the problem on. Any
   talk that makes a strong claim needs one of these somewhere.

   Nothing here expands, on any input. Every other section rewards a keypress
   with more detail; this one puts everything on screen, because a limitation
   you have to unfold reads as a limitation you were hiding.

   It is also why read mode exists: the credibility of a talk tends to live in
   this block, and it has to survive someone opening the link a week later
   without you there to say it out loud.

   THREE BEATS, and they are yours to schedule: the claim is there on
   arrival, the failures land on 1, the defences on 2, the closing line on 3.
   Give `caveatSection()` three cues and it wires them.
   ========================================================================== */

import type { SectionMeta } from '../deck/content-types'
import { cue, section } from '../deck/content-types'
import { Beat } from '../stage/Beat'
import './caveat.css'

/** What a caveat section carries. Fragments throughout — this block is read
 *  under pressure, by a room deciding whether to trust you. */
export interface CaveatData {
  /** The limitation, stated flatly. One sentence is allowed here — it is the
   *  heading of the block, and hedging it defeats the point. */
  claim: string
  /** How it fails. Fragments. Three is usually right; five is a different
   *  slide. */
  failures: string[]
  /** What survives the failures. A label and a line each. */
  defences: { label: string; text: string }[]
  /** Where your responsibility stops and someone else's starts. */
  close: string
}

/** Build a caveat section with its data checked.
 *
 *  `cues` are the three keypresses after arrival — failures, defences,
 *  close. Defaults are deliberately flat directions rather than echoes of
 *  the copy: at 200 words a minute you want "let it land", not the sentence
 *  you can already see. */
export function caveatSection(meta: {
  id: string
  title: string
  eyebrow?: string
  budgetMinutes: number
  notes: string[]
  data: CaveatData
  open?: string
  cues?: [string, string, string]
}): SectionMeta {
  const [c1, c2, c3] = meta.cues ?? [
    'The failures. Do not soften them.',
    'What is still true.',
    'Hand it on, and stop.',
  ]
  return section({
    id: meta.id,
    title: meta.title,
    eyebrow: meta.eyebrow,
    budgetMinutes: meta.budgetMinutes,
    notes: meta.notes,
    content: {
      kind: 'caveat',
      open: meta.open ?? 'The claim, alone. Let the room read it.',
      items: [cue(c1), cue(c2), cue(c3)],
      data: meta.data,
    },
  })
}

export function Caveat({ meta }: { meta: SectionMeta }) {
  /* The one cast, right next to the builder that guarantees it. Everything
     upstream of here was type-checked by caveatSection(). */
  const data = meta.content.data as CaveatData

  return (
    <div className="caveat">
      <div className="caveat__block">
        <span className="caveat__flag">Known limitation</span>

        {/* The section's own title, as an h2.
            EVERY RENDERER MUST DO THIS. The rail, the presenter window and
            the PDF's contents all label a section by `meta.title`, and
            verify.mjs asserts that the heading the audience sees is the
            same string. A pattern that shows only its own copy makes your
            second screen disagree with the projector — which you discover
            on stage, looking at the wrong slide name. */}
        <h2 className="caveat__title">{meta.title}</h2>

        {/* The claim carries the weight, so it keeps the large type. It is
            a <p> rather than the heading because it is not the section's
            name — it is the section's argument. */}
        <p className="caveat__claim">{data.claim}</p>

        <Beat at={1} hold>
          <ul className="caveat__failures">
            {data.failures.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </Beat>
      </div>

      <Beat at={2} hold>
        <div className="caveat__defences">
          {data.defences.map((d) => (
            <div key={d.label} className="caveat__defence">
              <p className="caveat__defenceLabel">{d.label}</p>
              <p className="caveat__defenceText">{d.text}</p>
            </div>
          ))}
        </div>
      </Beat>

      <Beat at={3} delay={0.05} hold>
        <p className="caveat__close">{data.close}</p>
      </Beat>
    </div>
  )
}
