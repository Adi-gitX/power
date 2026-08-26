# ADR 0003 — Bounded, counted retries; block-and-explain over loop-and-burn

**Status:** accepted · 2026-07-27

**Decision:** every feedback edge is counted by the reducer and capped at 2.
On the third failure the run enters `blocked` with the gate's specifics, and a
human decides. Retries carry the exact violations and demand a fix, not a redo
("RETRY, not a redo") — redo-on-retry was measured as the biggest cost
multiplier.

**Consequences:** a run can end "blocked", and that is a feature: a blocked run
that explains itself is worth more than a green run that lowered its own bar.
The reducer refuses illegal transitions (including approving an ungated spec),
so recipes and engines cannot drift around the rules.
