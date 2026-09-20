import { useStage } from './StageProvider'

/**
 * Right-hand rail: one marker per section, sub-ticks for beats in the active
 * one. Doubles as navigation — click a marker to jump, which is what you want
 * when someone asks a question about a section you already passed.
 */
export function ProgressRail() {
  const { sections, sectionIndex, beat, goToSection, mode } = useStage()

  return (
    <nav className="rail" aria-label="Sections">
      {sections.map((s, i) => {
        const active = i === sectionIndex
        return (
          <button
            key={s.id}
            className="rail__item"
            data-active={active || undefined}
            data-done={i < sectionIndex || undefined}
            onClick={() => goToSection(i)}
            title={s.title}
            aria-current={active ? 'true' : undefined}
          >
            <span className="rail__label">{s.title}</span>
            <span className="rail__dot" />
            {active && mode === 'present' && (
              <span className="rail__beats">
                {s.beats.map((_, b) => (
                  <span key={b} className="rail__tick" data-on={b <= beat || undefined} />
                ))}
              </span>
            )}
          </button>
        )
      })}
    </nav>
  )
}
