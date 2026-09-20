# Brand assets

Drop your own here and point `src/deck/talk.config.ts` at them.

| File | Used by | Notes |
|---|---|---|
| `mark.svg` | the corner mark on every slide | Square. Also what `make-qr.mjs` puts in the middle of a QR code. |
| `favicon.svg` | the browser tab and presenter window | Usually the same art as `mark.svg`. |
| `wordmark-dark.svg` | a `logo` on an individual section | Optional. Wide. Generate one with `make-wordmark.mjs`. |

The two files shipped here are **placeholders**, drawn in this repo and
belonging to nobody. Replace them.

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
