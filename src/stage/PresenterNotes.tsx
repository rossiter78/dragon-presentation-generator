/* ==========================================================================
   Presenter notes — the second-screen view.
   --------------------------------------------------------------------------
   Opened with S (or the Notes chip). Drag it to your laptop display, put the
   deck on the projector. This is the one thing PowerPoint gives you for free
   that a web presentation otherwise loses, and it is about a hundred lines.

   It also carries a TIME BUDGET, which matters more here than it would in a
   deck: a scrolling presentation has no slide count staring at you, so it
   quietly invites overrun. 40 minutes including Q&A is roughly 28 minutes of
   talk. The bar turns amber when you pass the budget for the section you are
   actually standing in.
   ========================================================================== */

import { useEffect, useState } from 'react'
import { SECTIONS } from '../content/talk'
import { CHANNEL } from './channel'
import type { StageSnapshot } from './StageProvider'
import './notes.css'

const TOTAL_BUDGET = SECTIONS.reduce((n, s) => n + s.budgetMinutes, 0)

function clock(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000))
  const m = String(Math.floor(total / 60)).padStart(2, '0')
  const s = String(total % 60).padStart(2, '0')
  return `${m}:${s}`
}

export function PresenterNotes() {
  const [state, setState] = useState<StageSnapshot>({
    sectionIndex: 0,
    beat: 0,
    mode: 'present',
    startedAt: null,
    detail: null,
  })
  const [now, setNow] = useState(Date.now())
  const [channel, setChannel] = useState<BroadcastChannel | null>(null)

  useEffect(() => {
    const ch = new BroadcastChannel(CHANNEL)
    ch.onmessage = (e: MessageEvent) => {
      if (e.data?.type === 'state') setState(e.data.payload as StageSnapshot)
    }
    ch.postMessage({ type: 'hello' })
    setChannel(ch)
    return () => ch.close()
  }, [])

  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 500)
    return () => window.clearInterval(t)
  }, [])

  /* The notes window is a separate browser window with its own focus and its
     own event loop — the deck's keydown listener cannot see keys pressed
     here. It needs its own, relaying over the same channel the buttons use,
     or the arrow keys silently do nothing whenever this window has focus
     (which, on stage, is most of the time). */
  useEffect(() => {
    if (!channel) return
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const forward = [' ', 'ArrowRight', 'ArrowDown', 'PageDown', 'n']
      const back = ['ArrowLeft', 'ArrowUp', 'PageUp', 'Backspace', 'p']
      if (forward.includes(e.key)) {
        e.preventDefault()
        channel.postMessage({ type: 'next' })
      } else if (back.includes(e.key)) {
        e.preventDefault()
        channel.postMessage({ type: 'prev' })
      } else if (e.key === 'Enter') {
        e.preventDefault()
        channel.postMessage({ type: 'replay' })
      } else if (/^[0-9]$/.test(e.key)) {
        e.preventDefault()
        channel.postMessage({ type: 'detail', key: e.key })
      } else if (e.key === 'Escape') {
        channel.postMessage({ type: 'detail', key: '0' })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [channel])

  const section = SECTIONS[state.sectionIndex]
  const nextSection = SECTIONS[state.sectionIndex + 1]
  const elapsed = state.startedAt ? now - state.startedAt : 0
  const spent = SECTIONS.slice(0, state.sectionIndex).reduce(
    (n, s) => n + s.budgetMinutes,
    0,
  )
  const dueBy = (spent + section.budgetMinutes) * 60_000
  const over = elapsed > dueBy

  /* A keypress is now worth a whole section, so this is the next SECTION —
     never the next beat, which arrives on its own and which you therefore
     cannot be about to trigger. */
  const nextCue = nextSection ? nextSection.title : 'End of deck'
  const building = state.beat < section.beats.length - 1

  return (
    <div className="notes">
      <header className="notes__head">
        <div>
          <p className="notes__eyebrow">
            {section.eyebrow ? `${section.eyebrow} · ` : ''}
            {state.sectionIndex + 1}/{SECTIONS.length}
          </p>
          <h1 className="notes__title">{section.title}</h1>
        </div>
        <div className="notes__timer" data-over={over || undefined}>
          <span className="notes__clock">{clock(elapsed)}</span>
          <span className="notes__budget">
            section due {clock(dueBy)} · {TOTAL_BUDGET} min total
          </span>
        </div>
      </header>

      <div className="notes__progress">
        <span
          className="notes__progressFill"
          data-over={over || undefined}
          style={{ width: `${Math.min(100, (elapsed / (TOTAL_BUDGET * 60_000)) * 100)}%` }}
        />
      </div>

      {section.demo && (
        <section className="notes__demo">
          <p className="notes__label">Live demo here</p>
          <p>{section.demo}</p>
        </section>
      )}

      <section className="notes__now">
        <p className="notes__label">
          {building
            ? `Building — ${state.beat + 1} of ${section.beats.length}`
            : `On screen now — all ${section.beats.length}`}
        </p>
        <p className="notes__cue">{section.beats[state.beat]?.cue}</p>
      </section>

      <section className="notes__next">
        <p className="notes__label">Next keypress — next section</p>
        <p className="notes__cueNext">{nextCue}</p>
      </section>

      {section.detailKeys && (
        <section className="notes__keys">
          <p className="notes__label">Number keys — expand on the deck</p>
          <ul>
            {section.detailKeys.map((k, i) => (
              <li key={k} data-on={state.detail === i || undefined}>
                <kbd>{i + 1}</kbd> {k}
              </li>
            ))}
            <li>
              <kbd>Esc</kbd> close
            </li>
          </ul>
        </section>
      )}

      <p className="notes__replay">
        <kbd>Enter</kbd>{' '}
        {section.replayable
          ? 'replays the exchange'
          : 'rebuilds this section from the start'}
      </p>

      <section className="notes__body">
        <p className="notes__label">Speaker notes</p>
        <ul>
          {section.notes.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      </section>

      <footer className="notes__foot">
        <button onClick={() => channel?.postMessage({ type: 'prev' })}>← Back</button>
        <button
          className="notes__primary"
          onClick={() => channel?.postMessage({ type: 'next' })}
        >
          Next →
        </button>
        <span className="notes__hint">
          Arrow keys work in either window — whichever has focus.
        </span>
      </footer>
    </div>
  )
}
