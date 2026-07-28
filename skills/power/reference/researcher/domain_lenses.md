<!-- Generated from prompts/researcher.md by `pnpm --filter @power/agents build`. Edit the prompt, not this file. -->

<domain_lenses>
The three standard lenses are the floor. Add a domain lens when the brief's
subject matter makes a whole category of constraint load-bearing. A domain lens
is not a new section in the output — **fold its findings into the existing
fields**, because the schema is what the gate checks and inventing a top-level
key fails the run.

Add a **regulatory lens** when the product touches: money movement or custody,
health or medical data, credit or lending decisions, children under 13, personal
data of EU or UK residents, employment or housing decisions, insurance, firearms,
alcohol, gambling, or professional advice (legal, medical, financial). What to
find: which regime applies, what it requires of a system like this one, and
whether it applies at the scale of v1 or only past a threshold. Thresholds are
the most useful thing you can bring back — "this applies above 100 transacting
users" changes the plan far more than "this regulation exists."

Where it goes: `feasibility.constraints[]`, with the regime named in
`constraint` and the practical consequence in `impact`.

Example:

> Constraint: holding and forwarding other people's royalty payments is likely
> money transmission under US state law, requiring per-state MTL registration.
> Impact: v1 must not take custody of funds; the viable pattern is to compute
> splits and hand off to a licensed processor's connected-account payout, or to
> output an instruction and let each user pay directly. Source: fetched FinCEN
> guidance page on money transmitter definitions, plus a fetched Stripe Connect
> docs page describing which flows shift the money transmission obligation.

Add a **risk lens** when a failure of the system harms someone: safety-critical
control, physical devices, irreversible financial action, publishing under a
user's identity, sending communications on a user's behalf, or deleting user
data. What to find: what the worst realistic failure is, whether existing
products in the space mitigate it and how, and whether that mitigation is a
product feature or an operational process. This usually lands in
`feasibility.constraints[]` as well, and sometimes in `prior_art[].gaps` when
the observation is "no existing tool guards against this."

Add a **compliance lens** — distinct from regulatory — when the product must
satisfy a *buyer's* checklist rather than a government's: SOC 2, HIPAA BAAs,
GDPR data processing agreements, accessibility conformance (WCAG level, Section
508), procurement requirements, app store review guidelines, or an enterprise
security questionnaire. Find which items are hard blockers at v1 versus later,
and which have a technical implication now. Accessibility is the common one with
a *design-time* implication: if WCAG AA is required, contrast ratios and keyboard
navigation are spec-level constraints, not a polish pass.

Add a **build-feasibility lens** when the goal names a specific stack, platform,
or runtime. What to find: does the named stack actually support the required
capability, at what version, and what is the current stable version. This is the
lens where stale training data does the most damage — framework APIs, model
names, SDK method signatures, and deprecations all move faster than any
knowledge cutoff. If the brief names a technology you are confident about,
that confidence is the signal to go verify it, not the reason to skip it.

Do not add a lens speculatively — a regulatory paragraph on a run where nothing
is regulated is padding with extra steps. If unsure whether one applies, spend
one search on the threshold question and let the answer decide.
</domain_lenses>
