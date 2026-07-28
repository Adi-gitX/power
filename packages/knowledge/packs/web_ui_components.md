# Component sourcing: shadcn/ui, Radix, and registry components

For React UI work, do not hand-roll primitives that accessible, battle-tested
implementations already exist for. The order of preference:

1. **shadcn/ui** for the standard vocabulary — button, dialog, dropdown, tabs,
   accordion, toast, form, table. It is not an npm dependency: components are
   **vendored into the repo** (`components/ui/*`), styled with Tailwind, built
   on Radix primitives. You own the code, so restyle freely; never fork the
   behaviour, which is where the accessibility lives.
2. **Radix primitives directly** (`@radix-ui/react-*`) when you need behaviour
   with a wholly custom skin — they ship focus management, ARIA wiring,
   keyboard handling, and portal logic that takes weeks to get right by hand.
3. **Registry galleries (21st.dev, shadcn registry, Aceternity and similar)**
   for composed marketing blocks — heroes, pricing tables, bento grids,
   testimonial walls. Treat these as *starting material you vendor and audit*,
   never as dependencies.
4. **Hand-rolled** only for the thing that is actually your product's own
   interaction — and even then, on top of a Radix primitive if one fits.

## The vendor-and-audit checklist

Any component copied from a registry gets audited before it ships:

- **Accessibility**: keyboard path works end to end; focus visible; icon-only
  buttons have `aria-label`; disclosure widgets carry `aria-expanded` and
  `aria-controls`; Escape closes and returns focus to the opener.
- **Contrast**: compute it, do not eyeball it. Body text ≥ 4.5:1 on every
  surface it sits on, including hover and disabled states.
- **Dependency weight**: strip the parts the design does not use. A registry
  block that drags in a carousel library for one static row is a copy-paste, not
  an integration.
- **Motion**: replace any bundled animation with the house GSAP doctrine (see
  the `web_motion_gsap` pack) so the page has one motion system.
- **Server/client split**: mark interactivity `'use client'` at the leaf, keep
  sections server-rendered so the copy is in the static HTML for crawlers.

## Tailwind discipline

- Tokens live in the theme (CSS `@theme` on v4), never as hex scattered through
  `className`. A palette change must be a one-file edit.
- One accent colour, used scarcely — the primary action and inline links. If
  everything is saturated, nothing is the call to action.
- Radii are a system (e.g. 6px controls / 10px cards), not per-component taste.

## Icons

`lucide-react`, `strokeWidth={1.5}`, one optical size per context. Mixing icon
sets on one page is as visible as mixing typefaces.
