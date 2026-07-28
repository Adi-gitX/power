<!-- Generated from prompts/tester.md by `pnpm --filter @power/agents build`. Edit the prompt, not this file. -->

<example_end_to_end_test>
A browser test drives the real interface against the real backend. Run these
only after the layers beneath pass.

**Selector priority, in order:** a `data-testid` attribute; then an accessible
role with its name; then visible text; then CSS, as a last resort. CSS selectors
tied to layout classes break on every styling change and produce failures that
look like application defects. If interactive elements have no test ids, adding
them is inside your fix scope — see `<fix_scope>`.

**Assert on observable state, never on your own log lines.** A `print` after a
click proves the script reached that line. It does not prove the click did
anything.

```python
"""End-to-end: the note-taking flow. Covers R1, R2, R3, R12.

Preconditions: unit and integration suites pass. Run against the same base URL
a real user would use.
"""
import os
import uuid
from playwright.async_api import expect

BASE_URL = os.environ["APP_BASE_URL"].rstrip("/")
TAG = f"TEST_{uuid.uuid4().hex[:8]}"

page.on("console", lambda msg: print(f"CONSOLE[{msg.type}]: {msg.text}"))
page.on("pageerror", lambda err: print(f"PAGEERROR: {err}"))

await page.set_viewport_size({"width": 1280, "height": 900})

# --- R1: sign up and land on the notes page -------------------------------
await page.goto(f"{BASE_URL}/signup")
await page.fill('[data-testid="signup-email"]', f"{TAG}@example.test")
await page.fill('[data-testid="signup-password"]', "correct-horse-battery")
await page.click('[data-testid="signup-submit"]')

await page.wait_for_url("**/notes**", timeout=15_000)
await expect(page.locator('[data-testid="note-list"]')).to_be_visible()

# Empty state, not a blank page. This is the "empty" boundary in the UI.
await expect(page.locator('[data-testid="notes-empty-state"]')).to_be_visible()

# --- R2: create a note and see it in the list -----------------------------
await page.click('[data-testid="new-note-button"]')
await page.fill('[data-testid="note-title-input"]', f"{TAG} groceries")
await page.fill('[data-testid="note-body-input"]', "milk, bread, coffee")
await page.click('[data-testid="note-save-button"]')

rows = page.locator('[data-testid="note-row"]')
await expect(rows).to_have_count(1)
await expect(rows.first).to_contain_text(f"{TAG} groceries")
await expect(page.locator('[data-testid="notes-empty-state"]')).to_have_count(0)

# --- R3: it survives a reload. This is the assertion that proves the note
# reached the server rather than living in client state. -------------------
await page.reload()
await expect(page.locator('[data-testid="note-row"]')).to_have_count(1)
await expect(page.locator('[data-testid="note-row"]').first).to_contain_text(f"{TAG} groceries")

# --- R2 ordering: needs two notes; one note cannot distinguish an ordering
# from no ordering. --------------------------------------------------------
await page.click('[data-testid="new-note-button"]')
await page.fill('[data-testid="note-title-input"]', f"{TAG} second")
await page.click('[data-testid="note-save-button"]')

await expect(page.locator('[data-testid="note-row"]')).to_have_count(2)
await expect(page.locator('[data-testid="note-row"]').first).to_contain_text(f"{TAG} second")

# --- R12: validation is surfaced to the user, and nothing is created ------
await page.click('[data-testid="new-note-button"]')
await page.fill('[data-testid="note-title-input"]', "")
await page.click('[data-testid="note-save-button"]')

await expect(page.locator('[data-testid="note-title-error"]')).to_be_visible()
await expect(page.locator('[data-testid="note-title-error"]')).to_contain_text("required")
await page.click('[data-testid="note-cancel-button"]')
await expect(page.locator('[data-testid="note-row"]')).to_have_count(2)

# --- Open a note and confirm the detail view shows the real body ----------
await page.locator('[data-testid="note-row"]').last.click()
await expect(page.locator('[data-testid="note-detail-title"]')).to_have_text(f"{TAG} groceries")
await expect(page.locator('[data-testid="note-detail-body"]')).to_contain_text("milk, bread, coffee")

# --- Only now, a screenshot, as supporting evidence for the report --------
await page.screenshot(path="/tmp/notes-detail.png", full_page=False)

print("E2E complete: R1 pass, R2 pass, R3 pass, R12 pass")
```

Notes on why this is shaped the way it is. Console and page-error listeners are
attached before the first navigation, because a client-side exception is
frequently the real cause of a failure that otherwise looks like a missing
element. The reload assertion exists specifically to distinguish "saved" from
"rendered locally" — without it, an implementation that never calls the API
passes. Counts are asserted after both success and rejection, so a validation
test also proves nothing was written. The screenshot is evidence attached to a
conclusion the assertions already reached; it is never the assertion itself.

**If the script produces no output and no error, it did not run.** Check that
you actually invoked the function you defined rather than only declaring it.
Reporting results from a script that never executed is the most damaging error
available to you at this stage.
</example_end_to_end_test>
