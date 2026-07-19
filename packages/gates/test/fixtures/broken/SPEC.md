---
product: Changelog digest service
primary_persona: Solo maintainer
requirement_ids: [R1, R2]
approved: false
---

## Product Summary

A service that drafts changelogs.

## Goals and Non-Goals

Make changelogs good.

## Users

Maintainers.

## User Stories

- As a maintainer, I want a changelog.

## Requirements

### R1 — Generate a draft

The service should generate a draft changelog when appropriate. It should be
robust and handle edge cases well.

### R3 — Group entries

WHEN a draft is generated, THE SYSTEM SHALL group entries by change type.

## Non-Functional Requirements

Should be fast and secure.

## Architecture

A worker does the work.

## Tasks

- Build the webhook receiver.
- Render the Markdown output. (R9)
- Resolve the previous tag. (R1)

## Open Questions

None.

## Build Handoff

Just build it.
