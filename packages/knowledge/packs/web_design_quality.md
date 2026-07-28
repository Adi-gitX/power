# The modern-site quality bar

What separates a page that reads as designed from a scaffold with Tailwind
classes. Every rule here was applied and measured on a real build; the numbers
are the ones that page shipped with (desktop 97–99, mobile 99–100, CLS 0,
accessibility 100).

## Palette

- Build from a **tinted neutral**, not grey. A paper canvas that is never pure
  white (or a near-black that is never `#000`) with every grey carrying a little
  of the same hue is what stops a page reading as clinical.
- **One saturated accent.** It appears on the primary action and inline links,
  and almost nowhere else; scarcity is what makes it read as "the thing to
  click".
- **Compute every contrast pair.** WCAG AA: 4.5:1 for body text on every surface
  it sits on, 3:1 for large display text. Write the ratios down next to the
  tokens. "Looks fine" ships 4.2:1 and fails the audit.

## Type

- Two faces maximum: a display face for headings (a high-contrast serif earns an
  editorial register no all-sans page has) and a workhorse sans for everything
  else. Never use the display face below ~24px — high-contrast serifs turn to
  mush small.
- Self-host fonts at build time (`next/font` or equivalent): no third-party
  render-blocking request, no layout shift on swap.
- Real hierarchy: one `h1`, sections under `h2`, headline sizes that commit
  (clamp into the 3–5.5rem range on desktop), tight letter-spacing on display
  sizes (−0.01 to −0.02em).

## Surface and depth

- **Seamless beats sectioned.** One canvas from top to bottom; no background
  colour switches between sections. Depth comes from a half-step surface lift on
  cards, hairline borders tinted toward the canvas hue, and a *fixed* ambient
  gradient the content scrolls through — because it belongs to the viewport, no
  section boundary is ever visible.
- Hard edges (photos, colour bands) are commitments; every one creates a seam
  that must be deliberate.

## Content

- **Show, don't claim.** The strongest section on a product page demonstrates
  the product doing the hard thing — including failing and recovering, if
  handling failure is the pitch. A demo that only shows success skips the part
  the visitor actually doubts.
- Copy states facts the product can back. If the repo cannot prove a sentence,
  the sentence does not ship.

## Performance and structure (verify, don't assume)

- Static HTML carries all copy — `grep` the built output for the headline; if it
  is not there, crawlers do not see it.
- CLS 0 by construction: geometry decided by CSS media queries before first
  paint, never swapped in by hydration (see the GSAP pack's sticky-pin rule).
- Lazy-load animation libraries below the interaction fold; the LCP element
  should be text or a preloaded image.
- Benchmark against a **compressing** server. An uncompressed dev server reads
  ~20 Lighthouse points worse than any real host and sends you fixing phantom
  problems.
- Full keyboard pass and a `prefers-reduced-motion` pass before calling it done;
  anchor targets need `scroll-margin-top` when a fixed header exists.
