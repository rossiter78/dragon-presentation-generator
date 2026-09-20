# Working in this repo

A presentation engine. **The talk is typed data; the stage layer never knows
what it is about.** Preserving that split is the point of the whole codebase.

Read [DESIGN.md](DESIGN.md) before changing behaviour. It records decisions
that were already paid for once, and re-litigating them costs more than
reading it.

## The split, and how to not break it

| Engine — same in every talk | Per talk |
|---|---|
| `src/stage/` — beats, keyboard, modes, presenter window | `src/content/talk.ts` |
| `src/deck/` — the content contract, the registry, the config shape | `src/content/*.png` |
| `src/components/` — renderers, patterns, graphics | `src/deck/talk.config.ts` values |
| `src/theme/` — token sets | `public/brand/` |
| `verify.mjs`, `export-pdf.mjs` | |

**The test for any change:** could a different talk, about a different
subject, use this without editing it? If not, it belongs in `src/content/`.

Specifically:

- **No component imports from `src/content/`.** Patterns take their data from
  the section (`meta.content.data`) or the item (`item.data`). Each pattern
  exports a typed builder beside its component — `chatSection()`,
  `agentRing()` — so authoring stays checked while the engine's types stay
  open. The cast happens once, inside the pattern that owns the shape.
- **Names resolve through `src/deck/registry.ts`**, never a `switch` in
  `App.tsx`. `content.kind` and `GraphicItem.name` are open strings on
  purpose; `assertRegistry()` catches a bad one at startup.
- **No identity strings outside `src/deck/talk.config.ts`.** Title, slug,
  PDF filename, channel name, logo path. They were scattered across six files
  once; do not start again.
- **No colour outside `src/theme/`.** Every colour is a token. If a component
  needs one that does not exist, add the token.

## Rules that are not negotiable

- **Beats are derived, never counted.** `section()` builds the beat list from
  the items. Nothing mirrors a count by hand — not the rail, not the
  presenter window, not the verifier.
- **Fragments on screen, sentences in `notes`.** Six words good, twelve the
  ceiling. This is the rule most worth defending when it is inconvenient.
- **Keyboard only.** No hover affordance, no pointer-only control. A cursor
  on a projector is invisible to the room.
- **Offline always.** Nothing fetched at runtime — not a font, not a logo.
- **One owner per animated property.** `motion` writes inline styles that beat
  stylesheet rules. A property animated in a component must not also be set
  in CSS.
- **Motion must carry the claim**, not illustrate one the words already made.

## Verifying

```bash
npm run build          # tsc -b runs first — type errors stop here
npm run preview        # :4173, --strictPort on purpose
npm run verify         # second terminal; walks every beat in real Chromium
```

`verify.mjs` is the real test — it asserts what *rendered*, not what is in the
DOM, because everything is mounted from beat 0 and revealed with opacity. It
prints the deck title it found: if that is not the deck you meant to test, you
have another server on 4173.

Do not add a check that cannot fail. A skipped assertion that says so is
better than one pointed at an arbitrary section, which reads as coverage and
is not.

## When adding a pattern

1. Component in `src/components/`, its CSS beside it.
2. Export its data interface and a typed builder from the same file.
3. Register it in `src/deck/registry.ts`.
4. Render `meta.title` as an `h1`/`h2` — the rail, the presenter window and
   the PDF all label the section by it, and `verify.mjs` asserts the heading
   on screen matches.
5. Use it in the example deck, so it is exercised by `npm run verify`.
