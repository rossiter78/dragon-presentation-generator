/* ==========================================================================
   THE TALK. This is the file you write; everything else is the engine.
   --------------------------------------------------------------------------
   Replace what is below with your own deck. Nothing outside src/content/
   and src/deck/talk.config.ts should need an edit.

   What ships here is an example talk ABOUT the engine, so it doubles as
   documentation you can drive with the arrow keys: every section
   demonstrates the feature it describes. Run `npm run dev`, press → a few
   times, then read this file alongside it.

   ---------------------------------------------------------------------
   THE COPY RULE, and it is the important one.

   What goes on screen is a FRAGMENT, not a sentence. Six words is a good
   target, twelve is the ceiling. The audience cannot read a paragraph and
   listen to you at the same time — they will do one or the other, and
   reading wins. Full sentences belong in `notes`, where only you see them.

   You will be tempted to break this on the slide where the point is
   complicated. That is the slide where it matters most.

   ---------------------------------------------------------------------
   BEATS ARE DERIVED, NOT COUNTED. `section()` builds the beat list from the
   items, so a beat can never drift out of sync with what renders at it. Add
   an item, you get a beat; the progress rail, the presenter window and the
   time budget all follow. Never write a beat count by hand anywhere.
   ========================================================================== */

import { figure, line, section } from '../deck/content-types'
import type { SectionMeta } from '../deck/content-types'
import type { GraphicMap, RendererMap } from '../deck/registry'

/* The typed builders for the patterns this deck uses. Each pattern owns its
   own data shape — see the component file for what each field means. */
import { agentRing } from '../components/AgentRing'
import { caveatSection } from '../components/Caveat'
import { chatSection } from '../components/ChatReplay'
import { cakeSection } from '../components/LayerCake'

/* ==========================================================================
   EXTENDING THE ENGINE.
   --------------------------------------------------------------------------
   A talk that needs a renderer or a diagram the engine does not ship adds it
   here. `App.tsx` merges these over the built-in tables, so you never edit
   engine code to show a bespoke slide — and `assertRegistry()` fails loudly
   at startup if a section names something that is not in either.

   Both are empty in this example, which is the common case.

       import { LayerCake3D } from './LayerCake3D'
       export const EXTRA_RENDERERS: RendererMap = { layers3d: LayerCake3D }

   Registering a name that already exists REPLACES the built-in, which is how
   you keep `kind: 'body'` in your content while swapping the renderer.
   ========================================================================== */

export const EXTRA_RENDERERS: RendererMap = {}
export const EXTRA_GRAPHICS: GraphicMap = {}

/* Eyebrows. Set on the FIRST section of each part, so the room is told which
   quarter of the argument it has walked into; leave it off everywhere else,
   where it is noise. */
const PART_1 = 'Part 1 · The idea'
const PART_2 = 'Part 2 · The patterns'

export const SECTIONS: SectionMeta[] = [
  /* ========================================================================
     The opening card. `kind: 'title'` — one hero line and nothing competing
     with it. Beat 0 is the title alone; each item arrives on a keypress.
     ===================================================================== */
  section({
    id: 'title',
    title: 'Your talk is typed data',
    content: {
      kind: 'title',
      open: 'Title alone. Say hello, then advance.',
      items: [
        line('A deck that will not surprise you on stage', {
          cue: 'Let it land before you advance.',
        }),
        line('Keyboard-driven · offline · verified', { lead: true }),
      ],
    },
    budgetMinutes: 1,
    notes: [
      'This example deck is documentation you can drive. Every section demonstrates the thing it describes.',
      'Press R for read mode, S for the presenter window, ? for the key legend. Arrow keys or space to advance.',
      'Replace src/content/talk.ts with your own and the rest of the repo is the engine.',
    ],
  }),

  /* ========================================================================
     A plain `body` section: heading, then one fragment per beat. This is the
     workhorse and most of a real deck will look like it.
     ===================================================================== */
  section({
    id: 'one-keypress',
    eyebrow: PART_1,
    title: 'One keypress per section',
    content: {
      kind: 'body',
      open: 'Empty section. The heading only.',
      items: [
        line('A section builds itself on arrival', {
          sub: ['Beats cascade', 'No clicking through bullets'],
        }),
        line('You advance sections, not lines', {
          cue: 'This is the whole interaction model. Say it plainly.',
        }),
        line('Nothing needs a pointer', {
          sub: ['A clicker has two buttons', 'That is the budget'],
        }),
        line('The deck never waits on you mid-thought', { lead: true }),
      ],
    },
    budgetMinutes: 2,
    notes: [
      'The cascade is tunable with ?cadence=ms — 0 builds everything instantly, which is what the PDF export uses.',
      'Reveal-per-bullet is the default in every other deck tool and it is why presenters end up nodding at their laptop between sentences.',
      'Objection you will get: "what if I want to reveal one line at a time?" Answer: you can, the beats are there — but the default should be the thing you want 90% of the time.',
    ],
  }),

  /* ========================================================================
     A body section carrying a FIGURE. Any figure or graphic puts the section
     into the split layout automatically, and `wide` gives it a wider column.

     This one uses `pending` rather than `src` — a screenshot not taken yet.
     It renders as a labelled empty frame at the right size, so the layout on
     stage is the real one and the gap is impossible to miss in rehearsal.
     Replace `pending` with an imported asset and it becomes a real figure:

         import shot from './my-screenshot.png'
         figure(shot, { alt: '…', caption: '…' })
     ===================================================================== */
  section({
    id: 'figures',
    title: 'Screenshots are beats too',
    content: {
      kind: 'body',
      open: 'Words only. The frame is empty.',
      items: [
        line('A shot lands on its own keypress'),
        figure(null, {
          pending: 'your-screenshot.png',
          alt: 'A pending figure frame, sized as the real shot will be',
          caption: 'A missing image is a labelled gap, not a broken deck',
          cue: 'Point at the frame. This is what a to-do looks like.',
        }),
        line('Proof goes AFTER the claim it proves', {
          sub: ['Narration goes between lines'],
        }),
        line('The order here is the order on stage', { lead: true }),
      ],
    },
    budgetMinutes: 2,
    wide: true,
    /* `demo` marks a slide where something live happens. It is PRESENTER
       WINDOW ONLY — the audience never sees a "demo" badge, so skipping one
       costs you nothing and nobody knows. The screenshots on a demo slide
       are the BACKUP: you do the live thing first, and these beats are what
       you fall back to when the venue declines to cooperate. */
    demo: 'Show a real screenshot landing on its beat. If the file is missing, the pending frame IS the demo.',
    notes: [
      'Interleaving is a directing decision and it belongs in the content file, not in a renderer.',
      'Every pending frame is a to-do with a filename on it. Take the shots before rehearsal, not before the talk.',
      'scale: 1–100 sizes a figure. Omit it on anything the room has to READ — those want every pixel of the default.',
    ],
  }),

  /* ========================================================================
     A GRAPHIC — a hand-authored SVG that redraws at the projector's size and
     can animate, rather than a screenshot. It takes a beat and sits in the
     figure column exactly like a shot.

     This one is the only shipped graphic that moves, and it is worth
     understanding why it is allowed to: the messages in flight ARE the
     content. See the header of AgentRing.tsx.
     ===================================================================== */
  section({
    id: 'graphics',
    title: 'Diagrams that redraw, not pictures of diagrams',
    content: {
      kind: 'body',
      open: 'Words only. The ring is not up yet.',
      items: [
        line('Authored SVG, sized by the room'),
        agentRing({
          alt: 'Five peers on a circle, fully meshed, with messages crossing between them',
          caption: 'Every peer reaches every other. Nothing in the middle decides.',
          cue: 'Let the traffic run for a few seconds before you talk over it.',
          data: {
            count: 5,
            /* Durations that do not divide into one another — that is what
               stops the traffic settling into a visible rhythm. */
            messages: [
              { from: 0, to: 2, dur: 2.9, delay: 0 },
              { from: 3, to: 1, dur: 3.4, delay: 0.8 },
              { from: 4, to: 2, dur: 2.3, delay: 1.7 },
              { from: 1, to: 0, dur: 3.1, delay: 2.6 },
              { from: 2, to: 4, dur: 2.7, delay: 3.7 },
              { from: 0, to: 3, dur: 3.3, delay: 4.9 },
              { from: 4, to: 1, dur: 2.5, delay: 6.1 },
            ],
          },
        }),
        line('Motion only when motion is the point', {
          sub: ['A looping gesture steals the eye', 'And gives nothing back'],
        }),
        line('Change the count, the diagram re-lays itself', { lead: true }),
      ],
    },
    budgetMinutes: 2,
    wide: true,
    notes: [
      'Set count to 6 in this file and the circle re-spaces, the mesh redraws with 15 edges, and the message paths follow. Nothing else needs an edit.',
      'SMIL animateMotion rather than a JS timer: identical on every rehearsal, and it survives the PDF export as a still frame without leaving anything half-drawn.',
      'The peers are deliberately unnamed. Naming them makes the room work out which is which instead of seeing the shape.',
    ],
  }),

  /* ========================================================================
     A PATTERN: a section that draws its own shape from a data block rather
     than listing fragments. Built with the pattern's own typed builder, so
     the data is checked even though the engine cannot know its shape.

     Press Enter on this one to replay the exchange.
     ===================================================================== */
  chatSection({
    id: 'ab-replay',
    eyebrow: PART_2,
    title: 'Same input, two answers, both right',
    budgetMinutes: 3,
    data: {
      prompt: 'add this to my contacts',
      threads: [
        {
          agent: 'Narrow',
          handle: '@scoped-assistant',
          initials: 'NA',
          scope: 'crm:contacts',
          tool: 'add_contact',
          toolArgs: '{ source: "photo" }',
          outcome: 'Contact created in the CRM',
          outcomeDetail: 'Company created too — it did not exist',
        },
        {
          agent: 'Broad',
          handle: '@general-assistant',
          initials: 'BR',
          scope: 'workspace:contacts',
          tool: 'add_workspace_contact',
          toolArgs: '{ folder: "Personal" }',
          outcome: 'Added to workspace contacts',
          outcomeDetail: 'Ready for autocomplete in mail',
        },
      ],
      seamTop: 'identical input',
      seamBottom: 'Two results · Both correct',
      punchline: 'Scope resolves the ambiguity, not the prompt.',
      chips: ['Context lives in the tool, not the words', 'You chose by choosing who to ask'],
    },
    notes: [
      'A scripted replay, not a live call: no network, no latency, no "hang on, let me scroll up". Identical every rehearsal.',
      'Enter replays it mid-question. That is the whole reason the replay exists — you will be asked to run it again.',
      'The shape fits any "it depends who you ask" claim: two models on one prompt, two services on one request.',
    ],
  }),

  /* ========================================================================
     Another pattern. Number keys 1–n expand a layer; Esc or 0 closes.
     `detailKeys` for the presenter window is DERIVED from the layer list, so
     the crib sheet on your second screen cannot drift out of step with the
     actual bindings.
     ===================================================================== */
  cakeSection({
    id: 'layers',
    title: 'A stack you can open on stage',
    budgetMinutes: 3,
    data: {
      peer: 'The agent is a peer of the UI, not a layer under it.',
      peerBeat: 5,
      layers: [
        {
          id: 'data',
          name: 'Data',
          role: 'data',
          appearsAt: 1,
          shape: 'tables',
          detail: 'One schema, one owner',
          points: ['Migrations in the repo', 'No second source of truth'],
        },
        {
          id: 'logic',
          name: 'Logic',
          role: 'logic',
          appearsAt: 2,
          shape: 'functions',
          detail: 'Rules live once',
          points: ['Every surface calls the same code', 'No logic in a controller'],
        },
        {
          id: 'api',
          name: 'API',
          role: 'surface',
          appearsAt: 3,
          shape: 'HTTP',
          detail: 'For things you wrote',
          points: ['Versioned', 'Authenticated per user'],
        },
        {
          id: 'tools',
          name: 'Tools',
          role: 'surface',
          appearsAt: 3,
          shape: 'MCP',
          detail: 'For things that reason',
          points: ['Same rules as the API', 'Never a deputy credential'],
        },
        {
          id: 'app',
          name: 'App',
          role: 'client',
          appearsAt: 4,
          shape: 'PWA',
          detail: 'For hands',
        },
        {
          id: 'agent',
          name: 'Agent',
          role: 'client',
          appearsAt: 4,
          shape: 'chat',
          detail: 'For sentences',
        },
      ],
    },
    notes: [
      'Press 1–6 to expand a layer. The rest dim, so the room follows your eye without you saying "the third box down".',
      'This is the Q&A slide. Stand on it and answer with the keys instead of talking over a static diagram.',
      'The presenter window prints the key mapping, derived from this list — so it is always right.',
    ],
  }),

  /* ========================================================================
     The honest-limitation pattern. Nothing here expands on any input: a
     limitation you have to unfold reads as a limitation you were hiding.
     ===================================================================== */
  caveatSection({
    id: 'caveat',
    title: 'Where this stops',
    budgetMinutes: 2,
    data: {
      claim: 'This engine is a good deck and a bad slide editor.',
      failures: [
        'No WYSIWYG — you write TypeScript',
        'No collaborative editing',
        'Rebuilding a talk means rebuilding the file',
      ],
      defences: [
        {
          label: 'Still worth it',
          text: 'A restructure that breaks a renderer is a compile error, not a blank panel in rehearsal.',
        },
        {
          label: 'Still verifiable',
          text: 'verify.mjs walks every beat and asserts what actually rendered.',
        },
      ],
      close: 'If your talk wants none of that, use Slidev or Marp and skip the engine.',
    },
    notes: [
      'Say this one out loud rather than letting them read it. Volunteering the limitation is what buys the rest of the talk.',
      'The genuine alternatives are reveal.js, Slidev and Marp — all mature, all actively maintained. Name them.',
      'The four things they do not have: content as typed data, behavioural verification, keyboard-only by rule, and time budgets on the second screen.',
    ],
  }),

  /* ========================================================================
     The close. A body section with no figures, which keeps it narrow and
     centred on the last thing you want said.
     ===================================================================== */
  section({
    id: 'close',
    title: 'Make it yours',
    content: {
      kind: 'body',
      open: 'Nothing up yet. This is the pause before the close.',
      items: [
        line('Edit src/content/talk.ts', {
          sub: ['Nothing else has to change'],
        }),
        line('Rename it in src/deck/talk.config.ts'),
        line('npm run build && npm run verify', {
          cue: 'Name the command. Then stop talking.',
        }),
        line('The engine never knows what your talk is about', { lead: true }),
      ],
    },
    budgetMinutes: 1,
    notes: [
      'Total budget for this example is about 16 minutes, which is deliberately more than it takes — the point is that the presenter window turns amber when you overrun.',
      'Set budgetMinutes honestly. A 40-minute slot is about 28 minutes of talk.',
      'Last line is the thesis. Say it and stop.',
    ],
  }),
]
