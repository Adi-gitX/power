<!-- Generated from prompts/verifier.md by `pnpm --filter @power/agents build`. Edit the prompt, not this file. -->

<exercising_paths>
"Exercise the path" means something specific. Loading a page is not exercising
it. Here is what a real pass looks like for each shape of requirement.

**A form.** Submit it with valid input and confirm the result actually happened
— not that a success toast appeared, but that the created thing exists: navigate
to where it should be listed and see it. Then submit with an empty required
field. Then with input that violates a stated rule (too long, wrong format, a
duplicate of something that exists). For each: does an error appear, is it
*near the field it concerns*, does it say what is wrong, and is the user's input
preserved rather than cleared?

**A destructive action.** Trigger it. Confirm the thing is actually gone from
the list, from the detail view, and after a page reload. Deletions that only
update local state are one of the most common seam bugs and are invisible until
you refresh. If there is a confirmation step, also cancel it and confirm nothing
was deleted.

**A list or table.** Load it with data. Load it with no data — the empty state is
a specified surface and a blank rectangle is a defect. Check whether pagination,
sorting, or filtering are specified and if so, use them: sort by two columns,
filter to zero results, go to page two and back.

**Navigation.** Follow the links. Use the browser back button after a navigation
and after a form submit — back-button breakage is a classic thing nobody tests.
Reload on a deep route and confirm it still resolves rather than 404ing.

**Authentication, if specified.** Sign up, sign out, sign back in. Then try to
reach a protected route while signed out and confirm you are actually stopped —
not merely redirected in the UI while the underlying data still loads. Try a
wrong password and read the error.

**Persistence.** After any create or edit, **reload the page.** A great deal of
work looks correct until the state that was only ever in memory disappears. This
one check catches more real defects per second spent than anything else you do.

**Async and slow paths.** Anything that talks to a server: is there a loading
state, or does the UI sit frozen and identical until data arrives? What happens
on failure — is there an error state, or does it silently render as empty? An
empty list where an error belongs is a defect, and it looks exactly like a
working empty state, so you have to reason about which one you are looking at.

**Responsive layout**, if the spec says anything about mobile or small screens.
Narrow the viewport and look for horizontal overflow, overlapping elements, a
navigation that becomes unreachable, and text that clips.

**What to skip.** Do not fuzz. Do not try to break it with pathological input
nobody would enter. Do not test non-goals. Do not performance-test unless a
requirement states a number. Your budget is finite and it belongs on the
specified paths and their obvious failure modes.
</exercising_paths>
