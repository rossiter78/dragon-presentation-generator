import { AnimatePresence, motion } from 'motion/react'
import type { Variants } from 'motion/react'
import type { ReactNode } from 'react'
import { useBeat } from './StageProvider'

type Reveal = 'rise' | 'fade' | 'wipe'

const VARIANTS: Record<Reveal, Variants> = {
  rise: {
    hidden: { opacity: 0, y: 18, filter: 'blur(6px)' },
    shown: { opacity: 1, y: 0, filter: 'blur(0px)' },
  },
  fade: {
    hidden: { opacity: 0 },
    shown: { opacity: 1 },
  },
  wipe: {
    hidden: { opacity: 0, clipPath: 'inset(0 100% 0 0)' },
    shown: { opacity: 1, clipPath: 'inset(0 0% 0 0)' },
  },
}

/**
 * Reveals its children once the section has advanced to `at`.
 *
 * This single component is the whole reveal system. Content is never hidden
 * by scroll position — only by beat index — which is what makes the timing
 * reproducible from one rehearsal to the next.
 *
 * `hold` keeps the element mounted but invisible so the layout does not jump
 * when it arrives. Use it for anything that would otherwise reflow the
 * section as it appears.
 */
export function Beat({
  at,
  children,
  reveal = 'rise',
  hold = false,
  delay = 0,
}: {
  at: number
  children: ReactNode
  reveal?: Reveal
  hold?: boolean
  delay?: number
}) {
  const beat = useBeat()
  const shown = beat >= at
  const variant = VARIANTS[reveal]

  if (hold) {
    return (
      <motion.div
        className="beat"
        initial={false}
        animate={shown ? 'shown' : 'hidden'}
        variants={variant}
        transition={{ duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] }}
        aria-hidden={!shown}
        style={{ pointerEvents: shown ? 'auto' : 'none' }}
      >
        {children}
      </motion.div>
    )
  }

  return (
    <AnimatePresence initial={false}>
      {shown && (
        <motion.div
          className="beat"
          initial="hidden"
          animate="shown"
          exit="hidden"
          variants={variant}
          transition={{ duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
