import { SECTIONS, EXTRA_RENDERERS, EXTRA_GRAPHICS } from './content/talk'
import { Chrome } from './stage/Chrome'
import { ProgressRail } from './stage/ProgressRail'
import { Section } from './stage/Section'
import { StageProvider, useStage } from './stage/StageProvider'
import { assertRegistry, buildRegistry, setRegistry } from './deck/registry'

/**
 * The deck is SECTIONS, rendered.
 *
 * There is no per-section wiring here and there must never be any: a
 * section's `content.kind` picks its renderer through the registry, so
 * adding a slide is one edit in content/talk.ts and nothing in the engine
 * changes. A talk that needs a renderer the engine does not ship exports
 * EXTRA_RENDERERS from its content file — still not an edit here.
 *
 * The registry is built and checked ONCE, at module scope, before React
 * mounts anything. Doing it here rather than in an effect means a bad name
 * throws while the screen is still blank, which is a stack trace you can
 * read, rather than half a deck and one empty panel.
 */
const registry = buildRegistry(EXTRA_RENDERERS, EXTRA_GRAPHICS)
assertRegistry(SECTIONS, registry)
setRegistry(registry)

function Deck() {
  const { scrollerRef } = useStage()
  return (
    <>
      <div className="scroller" ref={scrollerRef}>
        {SECTIONS.map((meta, i) => {
          const Render = registry.renderers[meta.content.kind]
          return (
            <Section key={meta.id} index={i}>
              <Render meta={meta} />
            </Section>
          )
        })}
      </div>
      <ProgressRail />
      <Chrome />
    </>
  )
}

export default function App() {
  return (
    <StageProvider>
      <Deck />
    </StageProvider>
  )
}
