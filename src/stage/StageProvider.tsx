/* ==========================================================================
   The stage layer.
   --------------------------------------------------------------------------
   This is the part that makes a scrolling page presentable.

   The core idea: scroll position does NOT drive the argument.

   A trackpad on a lectern, a clicker that sends PageDown, and an unknown
   projector between you and the audience are three good reasons never to let
   scroll offset decide when a reveal fires.

   ONE KEYPRESS PER SECTION. A section builds itself on arrival: its beats
   reveal in order at a fixed CADENCE, about a quarter of a second apart, and
   stop when the section is whole. Your keypress moves to the next section,
   never to the next beat. The staged reveal is what the content is for — the
   layer cake assembling itself reads far better than the finished diagram
   dropped on screen — but paying for it with a keypress per fragment means a
   hundred and twenty-one presses across the talk, and counting clicks is not
   what you should be doing while speaking.

   So: the cascade is automatic, the slide change is deliberate.

   Advancing mid-cascade goes to the NEXT SECTION rather than completing the
   current one. That is the whole point — one press means one slide, always,
   with no hidden state deciding what a press means this time.

   Two modes:
     present  scroll-snap on, sections cascade on arrival  (you, on stage)
     read     snap off, everything revealed at once        (the link you send)
   ========================================================================== */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import type { ReactNode, RefObject } from 'react'
import { SECTIONS } from '../content/talk'
import type { SectionMeta } from '../deck/content-types'
import { CHANNEL } from './channel'
import { TALK } from '../deck/talk.config'

export type Mode = 'present' | 'read'

/** Milliseconds between the beats of a section as it builds itself.
 *
 *  250ms against a 0.5s reveal means each fragment starts while the one
 *  before it is still arriving, which reads as one cascade rather than a
 *  queue of separate events. Tune with `?cadence=ms`; `?cadence=0` builds
 *  every section instantly. */
const CADENCE_MS = 250

/** Grace before the first beat fires, so a section that was scrolled to has
 *  landed before it starts building. Roughly the smooth-scroll duration. */
const LEAD_IN_MS = 450

/** Shape broadcast to the presenter-notes window. */
export interface StageSnapshot {
  sectionIndex: number
  beat: number
  mode: Mode
  startedAt: number | null
  /** Which numbered detail is expanded, if any. */
  detail: number | null
  /** Enter presses so far. The mirror replays the chat exchange on a change. */
  replayToken: number
  /** The deck window's CSS size, so the mirror can lay out at the projector's
   *  size and scale down, rather than reflowing into a thumbnail. */
  viewport: { width: number; height: number }
}

/** `?mirror=1` is the deck as a passenger — the small replica inside the
 *  presenter window. It renders the same sections but drives nothing: no
 *  keys, no cadence, no broadcasts. It applies the deck's snapshots and
 *  nothing else, so there is only ever one deck deciding what happens. */
const MIRROR = new URLSearchParams(window.location.search).get('mirror') === '1'

interface StageValue {
  sections: SectionMeta[]
  sectionIndex: number
  beat: number
  mode: Mode
  /** Index of the expanded detail in the active section, or null. Driven by
   *  the number keys — there is no pointer path to this. */
  detail: number | null
  /** Increments when Enter is pressed. Scripted animations watch it. */
  replayToken: number
  /** Milliseconds between beats as a section builds itself. 0 = no cascade. */
  cadence: number
  /** Set the cascade speed. Rebuilds the current section to show the change,
   *  and writes the value back to the URL so a reload keeps it. */
  setCadence: (ms: number) => void
  /** The compiled-in default, for a "reset" affordance in the menu. */
  defaultCadence: number
  scrollerRef: RefObject<HTMLDivElement | null>
  registerSection: (index: number, el: HTMLElement | null) => void
  next: () => void
  prev: () => void
  goToSection: (index: number) => void
  setMode: (m: Mode) => void
}

const StageContext = createContext<StageValue | null>(null)

/** Read by every Beat to decide whether it is revealed yet. */
const SectionIndexContext = createContext<number>(-1)

export function StageProvider({ children }: { children: ReactNode }) {
  const params = new URLSearchParams(window.location.search)
  const [mode, setMode] = useState<Mode>(
    params.get('mode') === 'read' ? 'read' : 'present',
  )
  /* Adjustable from the menu while the deck is running, and written back to
     the URL so it survives a reload — the same bargain ?contrast=high makes,
     and for the same reason: the moment you want to change this is two
     minutes before you start, in a room that is bigger or slower than the
     one you rehearsed in. */
  const [cadence, setCadenceState] = useState(() => {
    const raw = params.get('cadence')
    if (raw === null) return CADENCE_MS
    const ms = Number(raw)
    return Number.isFinite(ms) && ms >= 0 ? ms : CADENCE_MS
  })
  const [sectionIndex, setSectionIndex] = useState(0)
  const [beat, setBeat] = useState(0)
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const [detail, setDetail] = useState<number | null>(null)
  const [replayToken, setReplayToken] = useState(0)
  const [viewport, setViewport] = useState(() => ({
    width: window.innerWidth,
    height: window.innerHeight,
  }))
  /** Mirror only: false until the first snapshot lands. The sections are not
   *  rendered before then, so the replica never flashes the title slide, and
   *  the chat replay mounts already knowing the deck's replay count instead
   *  of mistaking the first sync for an Enter press. */
  const [synced, setSynced] = useState(!MIRROR)

  const scrollerRef = useRef<HTMLDivElement | null>(null)
  const sectionEls = useRef<(HTMLElement | null)[]>([])
  /** Suppresses the IntersectionObserver while a keyboard-driven scroll is
   *  in flight, so arriving at a section does not clobber the beat we just
   *  deliberately set (which matters when stepping BACKWARDS into the last
   *  beat of the previous section). */
  const programmatic = useRef(false)
  const channel = useRef<BroadcastChannel | null>(null)

  const registerSection = useCallback((index: number, el: HTMLElement | null) => {
    sectionEls.current[index] = el
  }, [])

  const lastBeatOf = useCallback(
    (i: number) => Math.max(0, (SECTIONS[i]?.beats.length ?? 1) - 1),
    [],
  )

  const scrollToSection = useCallback(
    (index: number, targetBeat: number) => {
      const el = sectionEls.current[index]
      if (!el) return
      programmatic.current = true
      setSectionIndex(index)
      setBeat(targetBeat)
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      window.setTimeout(() => {
        programmatic.current = false
      }, 800)
    },
    [],
  )

  /* One press, one section — in either mode, and whatever the cascade is
     doing when it lands. */
  const next = useCallback(() => {
    setStartedAt((s) => s ?? Date.now())
    if (sectionIndex < SECTIONS.length - 1) scrollToSection(sectionIndex + 1, 0)
  }, [sectionIndex, scrollToSection])

  const prev = useCallback(() => {
    // Land on the FULLY built previous section. Going back is something you
    // do to answer a question about a slide, and re-watching it assemble
    // while someone waits for their answer is theatre at the wrong moment.
    if (sectionIndex > 0) {
      scrollToSection(sectionIndex - 1, lastBeatOf(sectionIndex - 1))
    }
  }, [sectionIndex, lastBeatOf, scrollToSection])

  const goToSection = useCallback(
    (index: number) => scrollToSection(index, 0),
    [scrollToSection],
  )

  /* Changing the speed REBUILDS the section you are standing on, so the
     control shows you what it just did. Judging a cadence from a number is
     guesswork; judging it from the slide in front of you is not. */
  const setCadence = useCallback((ms: number) => {
    const clamped = Math.max(0, Math.min(2000, Math.round(ms)))
    setCadenceState(clamped)
    setBeat(0)

    // Keep the URL honest, without adding a history entry per drag step.
    const url = new URL(window.location.href)
    if (clamped === CADENCE_MS) url.searchParams.delete('cadence')
    else url.searchParams.set('cadence', String(clamped))
    window.history.replaceState(null, '', url)
  }, [])

  /* --- the cadence ------------------------------------------------------
     The section builds itself. Each beat schedules the one after it, so the
     cascade needs no loop and no interval to tear down: it simply stops when
     `beat` reaches the last one, and restarts from 0 when the section
     changes under it. Arriving at an already-built section (stepping back,
     where `prev` sets the last beat) schedules nothing at all. */
  useEffect(() => {
    // The mirror never builds on its own; every beat arrives from the deck.
    if (mode !== 'present' || MIRROR) return
    const last = lastBeatOf(sectionIndex)
    if (beat >= last) return
    // cadence=0 is "no cascade" — the whole section at once, for anyone who
    // finds the build distracting rather than useful.
    if (cadence <= 0) {
      setBeat(last)
      return
    }
    const wait = beat === 0 ? cadence + LEAD_IN_MS : cadence
    const t = window.setTimeout(() => setBeat((b) => Math.min(b + 1, last)), wait)
    return () => window.clearTimeout(t)
  }, [mode, cadence, sectionIndex, beat, lastBeatOf])

  /* --- scroll → active section ----------------------------------------- */
  useEffect(() => {
    const root = scrollerRef.current
    if (!root || MIRROR) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (programmatic.current) return
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
        if (!visible) return
        const index = sectionEls.current.indexOf(visible.target as HTMLElement)
        if (index < 0) return
        setSectionIndex((current) => {
          if (current !== index) setBeat(0)
          return index
        })
      },
      { root, threshold: [0.35, 0.6, 0.9] },
    )
    sectionEls.current.forEach((el) => el && observer.observe(el))
    return () => observer.disconnect()
  }, [])

  /* --- keyboard --------------------------------------------------------- */
  useEffect(() => {
    if (MIRROR) return
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return
      if (e.metaKey || e.ctrlKey || e.altKey) return

      switch (e.key) {
        // Most presentation clickers emit PageDown / PageUp.
        case ' ':
        case 'ArrowRight':
        case 'PageDown':
        case 'n':
          e.preventDefault()
          next()
          break
        case 'ArrowLeft':
        case 'PageUp':
        case 'Backspace':
        case 'p':
          e.preventDefault()
          prev()
          break
        case 'r':
          setMode((m) => (m === 'present' ? 'read' : 'present'))
          break
        case 'c': {
          const root = document.documentElement
          root.dataset.contrast =
            root.dataset.contrast === 'high' ? 'normal' : 'high'
          break
        }
        case 's':
          openPresenterWindow()
          break
        case 'f':
          if (document.fullscreenElement) void document.exitFullscreen()
          else void document.documentElement.requestFullscreen()
          break
        case 'Enter':
          // Replay THIS SECTION's build — rewind to beat 0 and let the
          // cadence run it again. Worth having when a question sends you
          // back to a diagram and you want it to assemble a second time,
          // and it also re-runs the scripted chat exchange.
          e.preventDefault()
          setBeat(0)
          setReplayToken((t) => t + 1)
          break
        case 'Escape':
          setDetail(null)
          break
        default:
          // 1–9 expand the matching numbered detail in this section; pressing
          // the same digit again closes it. Deterministic, reachable from a
          // clicker's keyboard, and visible to the audience as a change on
          // screen rather than as a cursor movement they cannot see.
          if (/^[1-9]$/.test(e.key)) {
            e.preventDefault()
            const index = Number(e.key) - 1
            setDetail((d) => (d === index ? null : index))
          } else if (e.key === '0') {
            setDetail(null)
          }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [next, prev])

  /* --- broadcast to the presenter window --------------------------------
     The notes window lives in a separate browser window on your second
     display. BroadcastChannel keeps the two in lockstep without a server,
     and lets the notes window drive the deck too — so you can advance from
     whichever window has focus. */
  const publish = useCallback(() => {
    if (MIRROR) return // a passenger has nothing to announce
    channel.current?.postMessage({
      type: 'state',
      payload: {
        sectionIndex,
        beat,
        mode,
        startedAt,
        detail,
        replayToken,
        viewport,
      } satisfies StageSnapshot,
    })
  }, [sectionIndex, beat, mode, startedAt, detail, replayToken, viewport])

  // The replica is laid out at the deck's size, so a resize — going
  // fullscreen on the projector, most of all — has to reach it.
  useEffect(() => {
    if (MIRROR) return
    const onResize = () =>
      setViewport({ width: window.innerWidth, height: window.innerHeight })
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // Handlers change every beat; the channel must not. Keep the live versions
  // in a ref so the socket is opened exactly once.
  const handlers = useRef({ next, prev, publish })
  handlers.current = { next, prev, publish }

  useEffect(() => {
    const ch = new BroadcastChannel(CHANNEL)
    channel.current = ch

    if (MIRROR) {
      // Listen to the deck's snapshots and to nothing else — above all not
      // to next/prev from the notes window, or two decks would both step.
      ch.onmessage = (e: MessageEvent) => {
        if (e.data?.type !== 'state') return
        const s = e.data.payload as StageSnapshot
        setSectionIndex(s.sectionIndex)
        setBeat(s.beat)
        setMode(s.mode)
        setDetail(s.detail)
        setReplayToken(s.replayToken)
        setSynced(true)
      }
      ch.postMessage({ type: 'hello' }) // ask the deck for where it is now
      return () => {
        ch.close()
        channel.current = null
      }
    }

    ch.onmessage = (e: MessageEvent) => {
      switch (e.data?.type) {
        case 'hello':
          handlers.current.publish() // notes window just opened
          break
        case 'next':
          handlers.current.next()
          break
        case 'prev':
          handlers.current.prev()
          break
        case 'replay':
          setBeat(0)
          setReplayToken((t) => t + 1)
          break
        case 'detail': {
          // Every key the deck handles is also handled in the notes window
          // and relayed here, so the two windows behave identically.
          const key = String(e.data.key)
          if (key === '0') setDetail(null)
          else if (/^[1-9]$/.test(key)) {
            const index = Number(key) - 1
            setDetail((d) => (d === index ? null : index))
          }
          break
        }
      }
    }
    return () => {
      ch.close()
      channel.current = null
    }
  }, [])

  useEffect(() => {
    publish()
  }, [publish])

  // Changing SECTION closes an open detail — you never want the last
  // slide's expansion still open when you arrive at the next one. Note the
  // dependency is the section, not the beat: beats now advance on their own
  // every few hundred milliseconds, and closing on every one of those would
  // make a detail opened during the cascade snap shut under your hand.
  // The mirror skips this: its detail comes from the deck, and clearing it
  // here would drop a detail that was already open when the notes opened.
  useEffect(() => {
    if (!MIRROR) setDetail(null)
  }, [sectionIndex])

  /* The mirror follows the deck's section by setting the scroller's offset
     directly. Not scrollIntoView: inside an iframe that also scrolls every
     ancestor, and would yank the presenter window to the replica each time
     the deck moved. Instant rather than smooth, because a replica you glance
     at should already be where the projector is. Runs after the sections
     mount, since `synced` gates them and child effects run first. */
  useEffect(() => {
    if (!MIRROR || !synced) return
    const root = scrollerRef.current
    const el = sectionEls.current[sectionIndex]
    if (!root || !el) return
    const top =
      el.getBoundingClientRect().top - root.getBoundingClientRect().top + root.scrollTop
    root.scrollTo({ top, behavior: 'instant' })
  }, [sectionIndex, synced])

  useEffect(() => {
    document.documentElement.dataset.mode = mode
  }, [mode])

  /* Published for verify.mjs and export-pdf.mjs, which have to know how long
     a section takes to build itself. Same rule as window.__deck: a timing
     constant mirrored by hand in a test is a timing constant that will
     drift, and the failure it causes looks like flake rather than drift. */
  useEffect(() => {
    window.__stage = { cadence, leadIn: LEAD_IN_MS, reveal: 500 }
  }, [cadence])

  const value = useMemo<StageValue>(
    () => ({
      sections: SECTIONS,
      sectionIndex,
      beat,
      mode,
      detail,
      replayToken,
      cadence,
      setCadence,
      defaultCadence: CADENCE_MS,
      scrollerRef,
      registerSection,
      next,
      prev,
      goToSection,
      setMode,
    }),
    [
      sectionIndex,
      beat,
      mode,
      detail,
      replayToken,
      cadence,
      setCadence,
      registerSection,
      next,
      prev,
      goToSection,
    ],
  )

  return (
    <StageContext.Provider value={value}>{synced ? children : null}</StageContext.Provider>
  )
}

export function useStage(): StageValue {
  const ctx = useContext(StageContext)
  if (!ctx) throw new Error('useStage must be used inside <StageProvider>')
  return ctx
}

export const SectionIndexProvider = SectionIndexContext.Provider

/** How many beats have been advanced in THIS section.
 *  In read mode everything is revealed, so it returns Infinity. */
export function useBeat(): number {
  const stage = useStage()
  const index = useContext(SectionIndexContext)
  if (stage.mode === 'read') return Number.POSITIVE_INFINITY
  if (index !== stage.sectionIndex) {
    // Sections you have already walked past stay built; ones ahead stay empty.
    return index < stage.sectionIndex ? Number.POSITIVE_INFINITY : 0
  }
  return stage.beat
}

/** Which numbered detail is expanded in THIS section (null if none).
 *  Returns -1 in read mode as a signal to expand everything: a reader has no
 *  keyboard cues and should not have to hunt for the detail. */
export function useDetail(): number | null | -1 {
  const stage = useStage()
  const index = useContext(SectionIndexContext)
  if (stage.mode === 'read') return -1
  if (index !== stage.sectionIndex) return null
  return stage.detail
}

export function openPresenterWindow() {
  const url = new URL(window.location.href)
  url.searchParams.set('notes', '1')
  url.searchParams.delete('mode')
  /* Named, so a second press focuses the window you already opened
     rather than spawning another. The name is per-talk for the same reason
     the channel is: two decks on one origin must not share a window.

     Full screen height, because the replica of the projector sits at the
     bottom, under the notes, and a window that cuts it off hides the one
     thing you opened it to glance at. A fixed height was tried (760) and
     lost the replica on every section; how tall the notes run is up to the
     talk, so ask the screen, not a constant. Placed at the screen's own
     origin (`availLeft` is non-standard but in every engine that matters)
     so the full height fits rather than being clamped short. */
  const { availWidth, availHeight } = window.screen
  const origin = window.screen as Screen & { availLeft?: number; availTop?: number }
  const features = [
    `width=${Math.min(1100, availWidth)}`,
    `height=${availHeight}`,
    `left=${origin.availLeft ?? 0}`,
    `top=${origin.availTop ?? 0}`,
  ].join(',')
  window.open(url.toString(), `${TALK.slug}-presenter`, features)
}
