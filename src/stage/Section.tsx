import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { SectionIndexProvider, useStage } from './StageProvider'
import './stage.css'

/**
 * A full-height snap target. Registers itself with the stage so the observer
 * and the keyboard navigation can find it, and publishes its own index down
 * to every <Beat> inside it.
 */
export function Section({
  index,
  children,
}: {
  index: number
  children: ReactNode
}) {
  const { sections, registerSection, sectionIndex } = useStage()
  const ref = useRef<HTMLElement | null>(null)
  const meta = sections[index]

  useEffect(() => {
    registerSection(index, ref.current)
    return () => registerSection(index, null)
  }, [index, registerSection])

  return (
    <SectionIndexProvider value={index}>
      <section
        ref={ref}
        id={meta.id}
        className="section"
        data-active={sectionIndex === index || undefined}
        data-wide={meta.wide || undefined}
        aria-label={meta.title}
      >
        <div className="section__inner">
          {meta.eyebrow && <p className="eyebrow">{meta.eyebrow}</p>}
          {children}
        </div>
      </section>
    </SectionIndexProvider>
  )
}
