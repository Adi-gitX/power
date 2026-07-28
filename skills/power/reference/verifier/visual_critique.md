<!-- Generated from prompts/verifier.md by `pnpm --filter @power/agents build`. Edit the prompt, not this file. -->

<visual_critique>
Score the presentation from 1 to 5. This is a single `visual_score` in the
output, but you arrive at it by judging four dimensions and taking the honest
overall impression — weighted toward whichever dimension most damages the
experience, not the arithmetic mean. A product that is consistent, polished, and
completely illegible does not average out to fine.

Say what drove the score. **A number with no justification is not a critique**,
and it gives the implementer nothing to act on.

---

**Dimension 1 — Layout and hierarchy.** Can a first-time user tell what this
page is for and what to do next, without reading everything?

- **1** — No discernible hierarchy. Everything is the same size and weight.
  Elements are jammed against each other or floating in space with no
  relationship. The primary action is indistinguishable from secondary ones, or
  absent from the first screen entirely.
- **2** — Some structure, badly applied. Headings exist but do not correspond to
  importance. Spacing is arbitrary and inconsistent between sections. You can
  find the primary action, but only by reading every element.
- **3** — Functional. Clear heading structure, the primary action is findable,
  grouping is mostly sensible. Unremarkable and occasionally cramped or
  unbalanced, but nobody gets lost.
- **4** — Deliberate. Spacing is consistent and generous enough to breathe.
  Visual weight tracks actual importance. The eye lands on the right thing
  first. Related things are grouped and unrelated things are separated.
- **5** — The layout does the explaining. A first-time user knows what to do
  without instructions. Rhythm and alignment are consistent across screens, and
  the structure holds up on both a wide and a narrow viewport.

**Dimension 2 — Visual consistency.** Does this look like one product?

- **1** — Components with the same job look different in different places.
  Multiple unrelated fonts, clashing colours, buttons in four shapes. Looks
  assembled from parts.
- **2** — Broadly one palette, but spacing, corner radii, and shadows vary
  arbitrarily; some screens are visibly from a different era of the build.
- **3** — Consistent within each screen, with minor drift across screens.
  Nothing jarring.
- **4** — One system throughout: a coherent palette, consistent type scale,
  uniform component treatment, predictable interactive states.
- **5** — The system is evident and it has a point of view. The choices look
  chosen rather than defaulted.

**Dimension 3 — Typography and readability.** Can you comfortably read it?

- **1** — Text unreadable: too small, too low contrast, or set against a
  background that fights it. Grey-on-grey. Body text under 12px. Lines running
  the full width of a wide screen.
- **2** — Readable with effort. Contrast is marginal in places, line length or
  line height is uncomfortable, and the type scale has no clear steps.
- **3** — Fine. Adequate contrast, sane sizes, no strain.
- **4** — Considered. A clear type scale, comfortable measure and leading, and
  contrast that holds for body text, secondary text, and placeholders alike.
- **5** — Typography carries the hierarchy on its own, and holds up at small
  sizes and in dense regions like tables.

Check the low-contrast cases specifically: placeholder text, disabled controls,
secondary labels, and text over images. These are where contrast failures
concentrate and they are invisible if you only look at headings.

**Dimension 4 — Polish and state design.** What happens in the states that are
not the demo?

- **1** — No loading states, no empty states, no error states. Blank rectangles
  and raw error strings. Misalignment visible without measuring. Overflow and
  clipping.
- **2** — Some states handled, mostly with a raw spinner or a bare "No data".
  Interactive elements have no hover or focus treatment.
- **3** — The states exist and are unremarkable. Hover states present, focus
  visible, nothing clipped.
- **4** — Empty states say something useful and offer the next action. Errors are
  human-readable and appear next to the thing that failed. Loading is
  non-jarring. Focus states are deliberate.
- **5** — The unhappy paths are as designed as the happy one, and the details
  hold up under inspection: alignment, optical spacing, transitions that clarify
  what changed rather than decorate.

---

**Calibration.** The bar for `pass` is 3.5. That is deliberately
placed above "functional but plain": **3 is a working, unremarkable interface,
and it does not clear the bar.** Do not treat 3 as average-and-therefore-fine.
Do not inflate to 4 because you can see the effort that went in. Do not deflate
to 2 because it is not to your taste — the rubric asks whether it works for a
user, not whether you would have designed it this way. Half-points are allowed
and useful: 3.5 is exactly the bar, and if you land there, be sure you mean it.

Every dimension that scored 3 or below should produce at least one entry in
`issues[]`, with a `where` and an `expected`. A low score with no corresponding
issue leaves the implementer guessing at what to change.
</visual_critique>
