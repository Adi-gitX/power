# Motion with GSAP, without the failure modes

GSAP is the house animation system for web work: one library for tweens, scroll
choreography (`ScrollTrigger`), split-text reveals (`SplitText`), and SVG morphs
(`MorphSVGPlugin`) — all in the public `gsap` package since 3.13, no paid tier.
Do not mix in a second motion library; two systems on one page never feel like
one page.

Every rule below was earned by breaking it and measuring the damage.

## Rule 1 — markup ships visible; animate FROM hidden

Always `gsap.from()`, never markup that starts at `opacity: 0` waiting for
JavaScript to rescue it.

```js
// The element is visible in the HTML. If this never runs, the page still reads.
gsap.from(el, { opacity: 0, y: 24, duration: 0.7, ease: 'power3.out',
  scrollTrigger: { trigger: el, start: 'top 85%', once: true } });
```

An entrance that starts hidden is a bet that an observer will fire. We shipped
that bet once: sections declared `opacity: 0`, the observer did not fire under
`content-visibility: auto`, and everything below the hero rendered blank. Script
failure must degrade to *no animation*, never to *no content*.

## Rule 2 — reduced motion through `gsap.matchMedia`, not overrides

```js
gsap.matchMedia().add('(prefers-reduced-motion: no-preference)', () => {
  // register every tween inside; return a cleanup if needed
});
```

Inside `matchMedia`, reduced motion means the tween is never registered and the
element simply sits in its natural visible state. There is nothing to force back
with `!important`, no hydration race. Combined with Rule 1 this makes the
accessible path and the no-JS path the same path.

## Rule 3 — pin with `position: sticky`, not ScrollTrigger's `pin`

For a pinned hero or scrubbed scene, give the section its height in CSS
(`h-[700vh]` via a media query, so mobile never has it) and hold the stage with
`position: sticky; top: 0`. Drive the animation with a ScrollTrigger that scrubs
against the section but pins nothing.

ScrollTrigger's `pin` rewrites the DOM to hold the element, and a layout the
server rendered one way and hydration rewrites another way is a Cumulative
Layout Shift machine — we measured **CLS 1.43** doing exactly this, then **0**
after moving the geometry into CSS. Layout is CSS's job; GSAP moves pixels
inside a box whose size never changes.

## Rule 4 — SplitText must revert, and never split under reduced motion

```js
const split = new SplitText(el, { type: 'lines', mask: 'lines' });
gsap.from(split.lines, { yPercent: 115, stagger: 0.09, ... });
return () => split.revert();   // React must never see the split DOM on re-render
```

Register the whole thing inside `matchMedia` so reduced-motion users never even
get divided text nodes — screen readers and find-in-page see one intact heading.

## Rule 5 — scrubbed state belongs to scroll, not to time

If an effect is driven by scroll position (a cross-fade, a per-line reveal),
compute it from progress in the ScrollTrigger callback so scrolling backwards
runs it backwards. Reserve time-based tweens for entrances that happen once.

## Rule 6 — sequence states that are different pictures

Cross-fade two layers only when they are two versions of the same picture. If
they are different pictures (moving text vs a composed heading), a cross-fade
puts both on screen at half opacity and produces mush; sequence them instead —
first out, a beat of empty stage, second in. Verify by scrubbing the whole range
and asserting no frame shows both layers above ~0.15 opacity.

## Numbers that read well

- Entrances: 0.6–0.9s, `power3.out`/`power4.out`, travel ≤ 30px.
- Staggers: 60–110ms between siblings; a grid arriving together reads as a slab.
- `once: true` on scroll reveals — re-animating on every pass makes a page
  restless.
- Scrub with `scrub: 1` (a little smoothing), not `scrub: true`.
