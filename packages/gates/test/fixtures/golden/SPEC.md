---
product: Changelog digest service
primary_persona: Solo maintainer of a small open-source library
requirement_ids: [R1, R2, R3]
approved: false
---

## Product Summary

A service that watches a repository's merged pull requests and produces a
human-readable changelog entry for each release tag.

## Goals and Non-Goals

Goals: produce an accurate draft changelog with no manual categorisation.

Non-Goals: publishing the changelog, editing release notes in place, or
supporting non-Git hosts.

## Users

Solo maintainers who tag releases irregularly and write changelogs by hand.

## User Stories

- As a maintainer, I want a draft changelog generated when I push a tag, so that
  I do not reconstruct it from commit history. (R1, R2)
- As a maintainer, I want entries grouped by change type, so that readers can
  skim. (R3)

## Requirements

### R1 — Generate a draft on tag push

The service reacts to a new release tag by collecting pull requests merged since
the previous tag.

WHEN a release tag is pushed to the default branch, THE SYSTEM SHALL create a
draft changelog containing one entry per pull request merged since the previous
tag.

### R2 — Handle the first release

WHEN a release tag is pushed and no earlier tag exists, THE SYSTEM SHALL include
every merged pull request in the repository's history.

### R3 — Group entries by change type

WHEN a draft changelog is generated, THE SYSTEM SHALL group entries under
Added, Changed, Fixed, and Removed headings, placing entries with no recognised
label under Changed.

## Non-Functional Requirements

- A draft is available within 60 seconds of the tag push, at p95.
- No repository content is persisted after a draft is produced.
- The service reads repositories with a token scoped to read-only access.

## Architecture

A webhook receiver enqueues tag events. A worker resolves the previous tag,
queries merged pull requests in that range, classifies each, and renders
Markdown.

## Data Model

`Draft { id, repository, tag, previous_tag, entries[], created_at }`
`Entry { pull_request_number, title, change_type, author }`

## Interfaces

`POST /webhooks/tag` accepts the host's tag payload and returns 202.
`GET /drafts/{id}` returns the rendered Markdown draft.

## Tasks

- P0: Webhook receiver that validates the payload signature and enqueues. (R1)
- P0: Previous-tag resolution, including the no-earlier-tag case. (R1, R2)
- P0: Render entries to Markdown grouped by change type. (R3)
- P1: Retry a failed draft generation once before reporting failure. (R1)

## Open Questions

- Should a draft regenerate if the tag is force-moved? Assumed no for now.

## Build Handoff

Seed data: a fixture repository with two tags and eight merged pull requests
spanning all four change types. The demonstration is pushing the second tag and
seeing a correctly grouped draft appear.
