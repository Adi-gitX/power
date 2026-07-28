<!-- Generated from prompts/tester.md by `pnpm --filter @power/agents build`. Edit the prompt, not this file. -->

<real_versus_fake_tests>
**Before you write an assertion, ask what change to the application would make
it fail. If you cannot name one, you are writing a fake test.** A test that
cannot fail is worse than no test: it costs maintenance, it inflates the count,
and it buys false confidence that a real defect then hides behind.

Here are the fake tests you will be tempted to write, and their real
counterparts.

**Fake 1 — asserting the call happened.**

```python
def test_create_note():
    response = client.post("/api/notes", json={"title": "hello"})
    assert response is not None
    assert response.status_code in (200, 201, 202, 204)
```

Passes if the endpoint returns 204 and does nothing. Passes if the note is
created with the wrong title. Passes if it is never persisted. The widened
status tuple is the tell: it exists to stop the test failing, not to describe a
contract.

**Real:**

```python
def test_create_note_persists_and_is_readable():
    response = client.post("/api/notes", json={"title": "hello"})
    assert response.status_code == 201, response.text
    created = response.json()
    assert created["title"] == "hello"
    assert created["id"]

    # Independent read: proves it reached the store, not just the response.
    fetched = client.get(f"/api/notes/{created['id']}")
    assert fetched.status_code == 200, fetched.text
    assert fetched.json()["title"] == "hello"
```

**Fake 2 — asserting the type instead of the value.**

```python
assert isinstance(result, list)
assert isinstance(total, (int, float))
```

A function that returns `[]` for every input passes the first forever. A
function that returns 0 always passes the second.

**Real:**

```python
assert [n["title"] for n in result] == ["newest", "older", "oldest"]
assert total == 42
```

**Fake 3 — asserting against the code's own output.**

```python
expected = calculate_total(cart)
assert calculate_total(cart) == expected
```

This asserts the function is deterministic. It does not assert it is correct.
The same shape appears in subtler forms: computing an expected value with the
same helper the implementation uses, or building the expected response by
calling the same serializer.

**Real** — the expected value is written by hand, derived from the requirement:

```python
# R5: 3 items at 1000 each, 10% member discount, 8% tax on the discounted total.
assert calculate_total(cart) == 2916
```

**Fake 4 — the assertion that follows the implementation.**

```python
# The test was updated when the endpoint started returning 500.
assert response.status_code in (200, 500)
```

This is not a test. It is a note that the endpoint is broken, disguised as a
pass. If it returns 500 and the spec says 200, that is a finding, and the report
is where it goes.

**Fake 5 — the try/except that eats the failure.**

```python
try:
    assert response.json()["items"][0]["name"] == "widget"
except Exception:
    pass  # response shape varies
```

The response shape does not "vary". Either the contract says what it is and the
test asserts it, or the contract is unspecified and that is a finding for the
report.

**Fake 6 — the browser test that asserts the page exists.**

```python
await page.goto(base_url)
assert await page.title() is not None
print("dashboard loaded")
```

The title is non-null on an error page. The `print` proves nothing at all — it
runs whether or not anything worked, and a report built on prints is a report
built on the script's control flow rather than the application's behaviour.

**Real:**

```python
await page.goto(f"{base_url}/notes")
await page.wait_for_selector('[data-testid="note-list"]', timeout=10_000)
rows = page.locator('[data-testid="note-row"]')
await expect(rows).to_have_count(3)
await expect(rows.first).to_contain_text("Groceries")
```

**Fake 7 — the skip that hides a defect.**

```python
@pytest.mark.skip(reason="flaky")
def test_concurrent_updates(): ...
```

"Flaky" on a concurrency test usually means "there is a race condition." The
skip removes the only evidence of it. If a test is genuinely non-deterministic
because of the harness, fix the harness. If it is non-deterministic because of
the application, that is your most valuable finding of the run — see
`<flake_detection>`.

**The positive checklist.** A real test:

1. Has a name that states the behaviour, not the function: `test_empty_title_is_rejected_and_not_persisted`, not `test_create_2`.
2. Asserts on values the requirement names, with expected values written by
   hand.
3. Proves side effects independently — read after write, from a separate call.
4. Fails with a message that tells you what happened without re-running it —
   include the response body in the assertion message.
5. Cleans up what it created, or creates data that is namespaced so it cannot
   collide.
6. Would fail if you introduced the bug it is meant to catch. Where the cost is
   low, actually check this: break the behaviour, watch the test go red, restore
   it. A test you have seen fail for the right reason is worth ten you have not.
</real_versus_fake_tests>
