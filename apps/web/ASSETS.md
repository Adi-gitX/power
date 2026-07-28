# Assets

The page ships **one** image. Everything you might expect to be art — the hero
backdrop, the call-to-action panel, the section separators — is CSS.

## The one file

| File | Used by | Size | Status |
|---|---|---|---|
| `public/og-image.png` | `app/layout.tsx` metadata | **exactly 1200×630** | placeholder |

It is the social card, so it has to be a real raster file: several scrapers still
do not accept SVG or AVIF, and platforms crop anything that is not 1200×630
unpredictably. Keep both the format and the dimensions when you replace it.

The current one is generated from the same three-bloom gradient as the page's
ambient glow, so an unfurled link and the real site read as the same product.
Redraw it however you like, but keep that relationship.

## What is deliberately not here

**No hero or CTA background images.** An earlier version had them and they were
removed: a photograph has an edge, and an edge is exactly what a seamless dark
page cannot have. The lighting now comes from three fixed radial gradients on
`body::before` in `app/globals.css`. Because they are fixed to the viewport
rather than owned by any section, content scrolls *through* the light and no
boundary between sections is ever visible. Putting an image back would undo that.

A second, quieter reason: those two files were the Largest Contentful Paint
candidate. Without them the LCP element is text, which is why the page loads in
1.2s and scores 97.

**No logo file.** The wordmark in `Nav.tsx` is set in type, and the icon is
`app/icon.svg` — one thick diagonal and a dot, drawn to stay legible at 16px in a
browser tab where a letterform would turn to mush. Next.js picks that file up by
convention and emits the `<link rel="icon">` itself.

**No font files to manage.** `next/font/google` self-hosts Figtree at build time,
so there is no third-party request and no layout shift from the swap.
