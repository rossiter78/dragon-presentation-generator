# Brand assets

Drop your own here and point `src/deck/talk.config.ts` at them.

| File | Used by | Notes |
|---|---|---|
| `mark.svg` | the corner mark on every slide | Square. Also what `make-qr.mjs` puts in the middle of a QR code. |
| `favicon.svg` | the browser tab and presenter window | Usually the same art as `mark.svg`. |
| `wordmark-dark.svg` | a `logo` on an individual section | Optional, wide, **and not shipped** — `make-wordmark.mjs` generates it from a wordmark you supply. Until you do, pointing a section's `logo` at it renders nothing. |

The two files shipped here are **placeholders**, drawn in this repo and
belonging to nobody. Replace them.

## Tinting, and why the placeholder is drawn with holes

`talk.config.ts` can paint the corner mark in the theme's own accent instead
of the colour it was drawn in:

```ts
logo: { src: 'brand/mark.svg', alt: '…', tint: true }
```

It is **off by default**, because your logo is your logo. The shipped
placeholder turns it on, so that switching theme moves the mark with it
rather than leaving a blue square on a red deck.

The mechanism is a CSS mask, and the consequence is worth understanding
before you turn it on: **a mask reads a file's alpha and throws its colour
away.** A mark drawn as two opaque colours — a coloured plate with a
letterform painted on top — masks down to its outline, and the letterform
disappears. `mark.svg` is therefore drawn as ONE path with the letter
knocked out as a real hole (`fill-rule="evenodd"`), which is why it survives
the treatment with its design intact and why the hole shows the slide
behind it.

So: `tint: true` suits a single-colour mark with real holes. Leave it off
for anything with more than one colour in it, and the file renders exactly
as you drew it.

The colour inside `mark.svg` still matters in one place — `make-qr.mjs`
inlines the file onto a white panel in the middle of a QR code, where no
theme reaches it. It is graphite so that it reads there.

`favicon.svg` is never tinted: it is drawn by the browser in the tab strip,
outside the page, where no token can reach it. It carries a
`prefers-color-scheme` media query instead, so it is dark on a light tab
strip and light on a dark one.

## Vendored, never hot-linked

These are served from `public/`, bundled into `dist/`, and loaded from the
same origin as the deck.

The deck must **never** reach out to a network to draw itself. An earlier
version of `Chrome.tsx` fell back to a logo URL on the author's website when
the local file was missing, which is a network dependency that fires exactly
when you forgot to copy the file — which is to say, while you are standing in
front of a room on a network you do not control. It was deleted.

If `mark.svg` is missing now, the mark simply does not render. Set
`logo.src` to `null` in the talk config for a deliberately unbranded deck.

## Licensing, if you are publishing your talk

A logo is a trademark, not code, and your repo's licence does not cover it.
If you push a talk repo publicly, either use a mark you own or leave these
placeholders in place.
