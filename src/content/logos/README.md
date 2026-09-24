# Your logos

Put your organisation's logo files here when you start a new presentation —
typically two:

- a **symbol only** version (square) — for the corner mark and the favicon
- a **full logo** with the company name (wide) — for a section's `logo`

Everything in this folder except this README and the `placeholder-*.svg`
files is **git-ignored**. A logo is a trademark, not code, and the repo's
licence does not cover it, so yours stays on your machine rather than in the
history.

| File | Used by | Notes |
|---|---|---|
| `placeholder-mark.svg` | the corner mark on every slide | Square. Also what `make-qr.mjs` puts in the middle of a QR code by default. |
| `placeholder-favicon.svg` | the browser tab and presenter window | Usually the same art as the mark. |
| `wordmark-dark.svg` | a `logo` on an individual section | Optional, wide, not shipped — `make-wordmark.mjs` generates it here from a wordmark you supply. |

The placeholders were drawn for this repo and belong to nobody. Replace them.

## Wiring them in

In `src/deck/talk.config.ts`, point the two lines at the top at your files:

```ts
const mark = new URL('../content/logos/my-symbol.svg', import.meta.url).href
const favicon = new URL('../content/logos/my-symbol.svg', import.meta.url).href
```

Keep that exact shape with a literal path — it is what Vite recognises and
bundles into `dist/`. (It is not a plain `import` because Node also loads
the config file, and Node cannot import an `.svg`.) Then set `tint: false`
(see below) and `alt` to your organisation's name.

For a section logo, import the file in `src/content/talk.ts` the same way
you import a figure, and pass it as `logo: { src: wordmark, alt: '…' }`.

A missing file does not stop the build — Vite only warns — and the corner
mark then simply does not render. Because this folder is git-ignored, that
is what a fresh clone looks like until you put your logos back. Read the
`vite build` output, or look at the corner.

## Tinting, and why the placeholder is drawn with holes

`talk.config.ts` can paint the corner mark in the theme's own accent instead
of the colour it was drawn in, with `tint: true`. It is meant to be **off**
for a real logo, because your logo is your logo. The shipped placeholder
turns it on, so that switching theme moves the mark with it.

The mechanism is a CSS mask, and **a mask reads a file's alpha and throws
its colour away.** A mark drawn as two opaque colours — a coloured plate
with a letterform painted on top — masks down to its outline, and the
letterform disappears. The placeholder is drawn as ONE path with the letter
knocked out as a real hole (`fill-rule="evenodd"`), which is why it survives.

So: `tint: true` suits a single-colour mark with real holes. Leave it off
for anything with more than one colour, and the file renders as drawn.

The favicon is never tinted: the browser draws it in the tab strip, outside
the page, where no token reaches it. The placeholder carries a
`prefers-color-scheme` media query instead.

## Vendored, never hot-linked

The deck must **never** reach out to a network to draw itself. An earlier
version fell back to a logo URL on the author's website when the local file
was missing — a dependency that fires exactly when you forgot the file,
which is to say while you are in front of a room on a network you do not
control. It was deleted. Set `logo.src` to `null` for an unbranded deck.
