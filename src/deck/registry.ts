/* ==========================================================================
   The registry.
   --------------------------------------------------------------------------
   ENGINE FILE. Two lookup tables and one startup check.

   A section names its renderer with `content.kind`; a graphic item names its
   drawing with `name`. Both are open strings — see content-types.ts — so
   this is where a name becomes a component.

   WHY A REGISTRY AND NOT A SWITCH. The alternative is `App.tsx` branching on
   every kind the deck has ever had, which means a talk with one bespoke
   diagram must edit engine code to show it. That is the coupling that stops
   a template being a template. Here, a talk exports EXTRA_RENDERERS and
   EXTRA_GRAPHICS from its own content file and never opens this one.

   THE COST IS A RUNTIME CHECK. Open strings cannot be verified by the
   compiler, so `assertRegistry()` walks every section at startup and throws
   on the first unknown name. That runs on `npm run dev`, in the build's
   smoke test and in verify.mjs — so a typo is a loud failure seconds after
   you make it, not a blank panel discovered in rehearsal.
   ========================================================================== */

import type { ComponentType } from 'react'
import type { SectionMeta } from './content-types'

/** Draws a whole section. It receives the section and is responsible for
 *  rendering `meta.title` itself — which is why a pattern can put the
 *  heading wherever its own layout needs it. */
export type Renderer = ComponentType<{ meta: SectionMeta }>

/** Draws one figure-column diagram. `data` is whatever the graphic's typed
 *  builder put on the item. */
export type Graphic = ComponentType<{ data?: unknown }>

export type RendererMap = Readonly<Record<string, Renderer>>
export type GraphicMap = Readonly<Record<string, Graphic>>

/* --- what ships --------------------------------------------------------
   Everything below is opt-in by being named in your content, not by being
   listed here: an unused pattern costs you a few KB in a bundle you serve
   from your own laptop. If you want a lean deck, delete the import and the
   line — nothing else refers to them. */

import { Title } from '../components/Title'
import { Body } from '../components/Body'
import { ChatReplay } from '../components/ChatReplay'
import { LayerCake } from '../components/LayerCake'
import { Caveat } from '../components/Caveat'
import { PhoneHome } from '../components/PhoneHome'
import { DeployPath } from '../components/DeployPath'
import { AgentRing } from '../components/AgentRing'

/** Section renderers that ship with the engine. */
export const BASE_RENDERERS: RendererMap = {
  title: Title,
  body: Body,
  chat: ChatReplay,
  cake: LayerCake,
  caveat: Caveat,
}

/** Figure-column drawings that ship with the engine. */
export const BASE_GRAPHICS: GraphicMap = {
  'phone-home': PhoneHome,
  'deploy-path': DeployPath,
  'agent-ring': AgentRing,
}

/** Merge a talk's extras over the base tables. A talk may also REPLACE a
 *  built-in by registering the same key — which is how you keep `body` as
 *  the name your content uses while swapping in your own renderer. */
export function buildRegistry(
  extraRenderers: RendererMap = {},
  extraGraphics: GraphicMap = {},
): { renderers: RendererMap; graphics: GraphicMap } {
  return {
    renderers: { ...BASE_RENDERERS, ...extraRenderers },
    graphics: { ...BASE_GRAPHICS, ...extraGraphics },
  }
}

/* --- the active registry -------------------------------------------------
   A module-level singleton rather than a React context, because there is
   exactly one deck per page and always will be: the presenter window is a
   second WINDOW running the same bundle, not a second deck inside this one.
   A context here would buy nothing and would put a provider between every
   renderer and the thing it needs.

   Set once, from App, before anything renders. */

let ACTIVE: { renderers: RendererMap; graphics: GraphicMap } = {
  renderers: BASE_RENDERERS,
  graphics: BASE_GRAPHICS,
}

export function setRegistry(next: {
  renderers: RendererMap
  graphics: GraphicMap
}): void {
  ACTIVE = next
}

export function getRegistry(): { renderers: RendererMap; graphics: GraphicMap } {
  return ACTIVE
}

/**
 * Walk every section and assert that each `content.kind` and each graphic
 * `name` resolves. Throws on the first miss, naming the section, so the
 * message tells you where to look rather than that something was undefined.
 *
 * Called once from App on mount. The throw is deliberate and the error is
 * not caught: a deck with a missing renderer is not a deck you want to
 * discover halfway through, and failing at slide zero is the kindest
 * possible time to find out.
 */
export function assertRegistry(
  sections: readonly SectionMeta[],
  { renderers, graphics }: { renderers: RendererMap; graphics: GraphicMap },
): void {
  const problems: string[] = []

  for (const s of sections) {
    if (!renderers[s.content.kind]) {
      problems.push(
        `section "${s.id}" wants renderer "${s.content.kind}" — known: ${Object.keys(renderers).join(', ')}`,
      )
    }
    for (const item of s.content.items) {
      if (item.kind === 'graphic' && !graphics[item.name]) {
        problems.push(
          `section "${s.id}" wants graphic "${item.name}" — known: ${Object.keys(graphics).join(', ')}`,
        )
      }
    }
  }

  if (problems.length) {
    throw new Error(
      `[registry] ${problems.length} unresolved name(s):\n  ${problems.join('\n  ')}`,
    )
  }
}
