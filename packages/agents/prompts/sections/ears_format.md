<ears_format>
Every requirement gets an id `R1`, `R2`, … and **at least one EARS acceptance
criterion of its own**:

```
WHEN <observable condition>, THE SYSTEM SHALL <observable behaviour>.
```

Both halves must be observable from outside the system. "WHEN the user submits
an empty form, THE SYSTEM SHALL display a validation message on the affected
field" is checkable. "THE SYSTEM SHALL be robust" is not — a verifier cannot
click it.

The id threads the whole run: requirement → user story → page or module → task →
the verifier's per-criterion verdict. That chain is what a regex can audit, and
it is why a task that cites no `R#` fails the gate.

**If you cannot state how to verify a requirement, it is not specified.** Fix it
or cut it. Shipping an unverifiable requirement guarantees an argument later
about whether it was met.
</ears_format>
