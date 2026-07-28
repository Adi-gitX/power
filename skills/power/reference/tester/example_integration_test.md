<!-- Generated from prompts/tester.md by `pnpm --filter @power/agents build`. Edit the prompt, not this file. -->

<example_integration_test>
An integration test against the real service and the real store. The pattern
that matters is **write, then read back through an independent call** — a create
response proves the handler ran, not that anything was stored.

```python
"""Integration tests for the notes API. Covers R1, R2, R3, R7.

Runs against the real service at the configured base URL with a real database.
No mocks: the point of this layer is to catch persistence and wiring bugs that
mocks hide by construction.
"""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ["APP_BASE_URL"].rstrip("/")   # no default: fail loudly
TAG = f"TEST_{uuid.uuid4().hex[:8]}"                # namespaced so runs cannot collide


@pytest.fixture(scope="session")
def user_a():
    return _signup(f"{TAG}_a@example.test")


@pytest.fixture(scope="session")
def user_b():
    return _signup(f"{TAG}_b@example.test")


def _signup(email: str) -> requests.Session:
    session = requests.Session()
    response = session.post(f"{BASE_URL}/api/auth/signup",
                            json={"email": email, "password": "correct-horse-battery"})
    assert response.status_code == 201, f"signup failed: {response.status_code} {response.text}"
    session.headers["Authorization"] = f"Bearer {response.json()['token']}"
    return session


@pytest.fixture(autouse=True, scope="session")
def cleanup(user_a):
    yield
    listing = user_a.get(f"{BASE_URL}/api/notes", params={"limit": 200})
    for note in listing.json():
        if note["title"].startswith(TAG):
            user_a.delete(f"{BASE_URL}/api/notes/{note['id']}")


class TestNoteLifecycle:
    def test_create_persists_and_is_independently_readable(self, user_a):
        # R1: WHEN a signed-in user submits a note with a non-empty title,
        # THE SYSTEM SHALL persist it.
        created = user_a.post(f"{BASE_URL}/api/notes", json={"title": f"{TAG} groceries"})
        assert created.status_code == 201, created.text
        body = created.json()
        assert body["title"] == f"{TAG} groceries"
        note_id = body["id"]

        fetched = user_a.get(f"{BASE_URL}/api/notes/{note_id}")
        assert fetched.status_code == 200, fetched.text
        assert fetched.json()["title"] == f"{TAG} groceries"

    def test_empty_title_is_rejected_and_nothing_is_written(self, user_a):
        before = len(user_a.get(f"{BASE_URL}/api/notes").json())

        response = user_a.post(f"{BASE_URL}/api/notes", json={"title": ""})
        assert response.status_code == 400, response.text
        assert "title" in response.text.lower()

        after = len(user_a.get(f"{BASE_URL}/api/notes").json())
        assert after == before, "a rejected create still wrote a row"

    def test_list_orders_by_most_recently_updated(self, user_a):
        # R2: two notes are required — with one note, any ordering passes.
        first = user_a.post(f"{BASE_URL}/api/notes", json={"title": f"{TAG} first"}).json()
        second = user_a.post(f"{BASE_URL}/api/notes", json={"title": f"{TAG} second"}).json()

        ids = [n["id"] for n in user_a.get(f"{BASE_URL}/api/notes").json()]
        assert ids.index(second["id"]) < ids.index(first["id"])

        user_a.patch(f"{BASE_URL}/api/notes/{first['id']}", json={"title": f"{TAG} first edited"})
        ids = [n["id"] for n in user_a.get(f"{BASE_URL}/api/notes").json()]
        assert ids.index(first["id"]) < ids.index(second["id"]), "editing did not reorder the list"

    def test_update_persists_and_leaves_other_fields_intact(self, user_a):
        created = user_a.post(f"{BASE_URL}/api/notes",
                              json={"title": f"{TAG} original", "body": "keep me"}).json()

        updated = user_a.patch(f"{BASE_URL}/api/notes/{created['id']}",
                               json={"title": f"{TAG} renamed"})
        assert updated.status_code == 200, updated.text

        fetched = user_a.get(f"{BASE_URL}/api/notes/{created['id']}").json()
        assert fetched["title"] == f"{TAG} renamed"
        assert fetched["body"] == "keep me", "an unrelated field was clobbered by the update"

    def test_delete_removes_it(self, user_a):
        created = user_a.post(f"{BASE_URL}/api/notes", json={"title": f"{TAG} doomed"}).json()
        assert user_a.delete(f"{BASE_URL}/api/notes/{created['id']}").status_code in (200, 204)
        assert user_a.get(f"{BASE_URL}/api/notes/{created['id']}").status_code == 404


class TestAuthorization:
    # R7: WHEN a user who does not own a note requests it, THE SYSTEM SHALL
    # respond 404 and SHALL NOT disclose that the note exists.

    def test_other_user_cannot_read_and_existence_is_not_disclosed(self, user_a, user_b):
        note = user_a.post(f"{BASE_URL}/api/notes", json={"title": f"{TAG} private"}).json()

        response = user_b.get(f"{BASE_URL}/api/notes/{note['id']}")
        assert response.status_code == 404, response.text
        assert "private" not in response.text, "404 body leaked the note contents"

    @pytest.mark.parametrize("verb", ["patch", "delete"])
    def test_other_user_cannot_write(self, user_a, user_b, verb):
        note = user_a.post(f"{BASE_URL}/api/notes", json={"title": f"{TAG} private"}).json()
        response = getattr(user_b, verb)(f"{BASE_URL}/api/notes/{note['id']}", json={"title": "x"})
        assert response.status_code == 404, response.text

        still_there = user_a.get(f"{BASE_URL}/api/notes/{note['id']}").json()
        assert still_there["title"] == f"{TAG} private"

    def test_unauthenticated_request_is_rejected(self):
        response = requests.get(f"{BASE_URL}/api/notes")
        assert response.status_code == 401, response.text


class TestBoundaries:
    def test_unicode_title_round_trips_exactly(self, user_a):
        title = f"{TAG} café مرحبا 🌍 note"
        created = user_a.post(f"{BASE_URL}/api/notes", json={"title": title}).json()
        assert user_a.get(f"{BASE_URL}/api/notes/{created['id']}").json()["title"] == title

    def test_title_at_limit_is_accepted_and_over_limit_is_rejected(self, user_a):
        at_limit = f"{TAG}" + "x" * (200 - len(TAG))
        assert user_a.post(f"{BASE_URL}/api/notes", json={"title": at_limit}).status_code == 201

        over = at_limit + "x"
        response = user_a.post(f"{BASE_URL}/api/notes", json={"title": over})
        assert response.status_code == 400, (
            f"expected rejection of a {len(over)}-character title, got {response.status_code}; "
            "check for silent truncation"
        )

    def test_malformed_body_is_a_client_error_not_a_crash(self, user_a):
        response = user_a.post(f"{BASE_URL}/api/notes",
                               data="not json",
                               headers={"Content-Type": "application/json"})
        assert 400 <= response.status_code < 500, response.text

    def test_duplicate_concurrent_create_does_not_produce_a_server_error(self, user_a):
        # A double-clicked submit button. Either both succeed or one is a clean
        # 409 — a raw constraint violation surfacing as a 500 is a defect.
        payload = {"title": f"{TAG} idempotency", "client_token": uuid.uuid4().hex}
        first = user_a.post(f"{BASE_URL}/api/notes", json=payload)
        second = user_a.post(f"{BASE_URL}/api/notes", json=payload)
        assert first.status_code == 201, first.text
        assert second.status_code in (201, 409), second.text
```

Three details worth copying. The base URL comes from the environment with no
default, so a misconfiguration fails immediately instead of silently testing the
wrong system. Every assertion carries the response body in its message, so a
failure is diagnosable from the report without re-running anything. And test
data is namespaced with a per-run token, so parallel runs and leftover rows
cannot make a passing suite look red.
</example_integration_test>
