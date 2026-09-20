/* ==========================================================================
   The A/B replay.  PATTERN — data comes from the section.
   --------------------------------------------------------------------------
   One input, two recipients, two different outcomes — both correct. The
   shape fits any claim of the form "it depends who you ask": two models on
   one prompt, two services on one request, two teams on one brief.

   A SCRIPTED REPLAY, not a live session, and that is the point:

     - No venue network, no service latency, no "hang on, let me scroll up".
     - Rehearsable — identical every single time you run it.
     - Replayable mid-question, with Enter, without reaching for a mouse.

   Show the real thing in the room afterwards if you want. On stage, during
   the argument, this is the one that lands in fifteen seconds.

   FIVE BEATS, fixed: the message is sent, both sides think, both call a
   tool, both return a result, and the punchline lands. `chatSection()`
   wires them. The symmetry is deliberate — the two panes must move in step
   or the room starts reading them as a sequence instead of a comparison.
   ========================================================================== */

import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import type { SectionMeta } from '../deck/content-types'
import { cue, section } from '../deck/content-types'
import { useBeat, useStage } from '../stage/StageProvider'
import './chat.css'

/** One side of the comparison. Everything here is a fragment — the two
 *  panes sit side by side at half width, and a sentence in either one
 *  breaks the symmetry that makes the comparison readable. */
export interface Thread {
  /** Who is answering. */
  agent: string
  /** How you addressed them — a handle, an endpoint, a model id. */
  handle: string
  /** Two letters for the avatar. */
  initials: string
  /** What they are allowed to touch. The claim of the slide usually lives
   *  in the difference between the two scopes. */
  scope: string
  /** What they called. Monospace. */
  tool: string
  /** The arguments, as written. Monospace, and short enough to read from
   *  the back — this is a label, not a payload dump. */
  toolArgs: string
  /** What came back. */
  outcome: string
  /** The second-order consequence, if there is one. */
  outcomeDetail: string
}

export interface ChatReplayData {
  /** The input, sent to both sides unchanged. Short — the whole point is
   *  that these few words are identical, and the room has to see that at a
   *  glance. */
  prompt: string
  /** Exactly two. A third pane does not fit at projector width, and a
   *  comparison of three is a table, not a replay. */
  threads: readonly [Thread, Thread]
  /** The badges that sit ON the gutter between the panes — the captions
   *  that make the comparison readable. The top one arrives with the
   *  message, the bottom one with the two results. Two or three words each:
   *  they sit on the divider and there is no room for more. */
  seamTop: string
  seamBottom: string
  /** The line the whole slide exists to deliver. */
  punchline: string
  /** Fragments that land with the punchline. Two is plenty. */
  chips: readonly string[]
}

/** Build an A/B replay section with its data checked.
 *
 *  `replayable` is set for you: this pattern is the reason Enter re-runs a
 *  section, and the presenter window prints that hint off this flag. */
export function chatSection(meta: {
  id: string
  title: string
  eyebrow?: string
  budgetMinutes: number
  notes: string[]
  data: ChatReplayData
  open?: string
  cues?: [string, string, string, string, string]
}): SectionMeta {
  const cues = meta.cues ?? [
    'Send it. Same words to both.',
    'Both thinking.',
    'The tool calls. Point at the difference in scope.',
    'Both results. Both correct.',
    'The punchline. Say it and stop.',
  ]
  return section({
    id: meta.id,
    title: meta.title,
    eyebrow: meta.eyebrow,
    budgetMinutes: meta.budgetMinutes,
    notes: meta.notes,
    replayable: true,
    content: {
      kind: 'chat',
      open: meta.open ?? 'Two empty threads. The input is not sent yet.',
      items: cues.map(cue),
      data: meta.data,
    },
  })
}

const SENT = 1
const THINKING = 2
const TOOL = 3
const RESULT = 4
const PUNCHLINE = 5

export function ChatReplay({ meta }: { meta: SectionMeta }) {
  /* The one cast, guaranteed by chatSection(). */
  const data = meta.content.data as ChatReplayData
  const beat = useBeat()
  const { replayToken } = useStage()
  const [replay, setReplay] = useState<number | null>(null)
  const timers = useRef<number[]>([])
  const seen = useRef(replayToken)

  useEffect(
    () => () => {
      timers.current.forEach(window.clearTimeout)
    },
    [],
  )

  /* Enter re-runs the exchange. Keyboard only — there is no button, because
     a control you can only reach with a pointer is a control you cannot use
     while holding a clicker. */
  useEffect(() => {
    if (replayToken === seen.current) return
    seen.current = replayToken
    timers.current.forEach(window.clearTimeout)
    timers.current = []
    setReplay(0)
    const script = [SENT, THINKING, TOOL, RESULT, PUNCHLINE]
    script.forEach((level, i) => {
      timers.current.push(window.setTimeout(() => setReplay(level), 700 * (i + 1)))
    })
    timers.current.push(
      window.setTimeout(() => setReplay(null), 700 * (script.length + 2)),
    )
  }, [replayToken])

  const level = replay ?? beat

  return (
    <div className="chat">
      <h2 className="chat__title">{meta.title}</h2>

      <div className="chat__grid">
        {/* Seam badges sit ON the gutter between the panes, clear of both —
            the comparison is the point, so nothing may cover either thread. */}
        <span
          className="chat__seam chat__seam--top"
          data-on={level >= SENT || undefined}
          aria-hidden="true"
        >
          {data.seamTop}
        </span>

        <ThreadPane thread={data.threads[0]} prompt={data.prompt} level={level} />

        <div className="chat__spine" aria-hidden="true">
          <span className="chat__spineLine" />
        </div>

        <ThreadPane thread={data.threads[1]} prompt={data.prompt} level={level} />

        <span
          className="chat__seam chat__seam--bottom"
          data-on={level >= RESULT || undefined}
          aria-hidden="true"
        >
          {data.seamBottom}
        </span>
      </div>

      <AnimatePresence>
        {level >= PUNCHLINE && (
          <motion.div
            className="chat__close"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          >
            <p className="chat__punchline">{data.punchline}</p>
            <ul className="chips">
              {data.chips.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function ThreadPane({
  thread,
  prompt,
  level,
}: {
  thread: Thread
  prompt: string
  level: number
}) {
  return (
    <article className="thread" data-live={level >= TOOL || undefined}>
      <header className="thread__head">
        <span className="thread__avatar">{thread.initials}</span>
        <span className="thread__id">
          <strong>{thread.agent}</strong>
          <small>{thread.handle}</small>
        </span>
        <span className="thread__scope" title="Credential scope">
          {thread.scope}
        </span>
      </header>

      <div className="thread__body">
        <AnimatePresence initial={false}>
          {level >= SENT && (
            <Bubble key="sent" side="out">
              {prompt}
            </Bubble>
          )}

          {level >= THINKING && level < TOOL && (
            <Bubble key="think" side="in" muted>
              <span className="thread__dots" aria-label="thinking">
                <i />
                <i />
                <i />
              </span>
            </Bubble>
          )}

          {level >= TOOL && (
            <motion.div
              key="tool"
              className="thread__tool"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            >
              <span className="thread__toolDot" />
              <code>{thread.tool}</code>
              <code className="thread__toolArgs">{thread.toolArgs}</code>
            </motion.div>
          )}

          {level >= RESULT && (
            <Bubble key="result" side="in">
              <strong className="thread__outcome">{thread.outcome}</strong>
              <span className="thread__detail">{thread.outcomeDetail}</span>
            </Bubble>
          )}
        </AnimatePresence>
      </div>
    </article>
  )
}

function Bubble({
  side,
  muted,
  children,
}: {
  side: 'in' | 'out'
  muted?: boolean
  children: React.ReactNode
}) {
  return (
    <motion.div
      className="bubble"
      data-side={side}
      data-muted={muted || undefined}
      initial={{ opacity: 0, y: 12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  )
}
