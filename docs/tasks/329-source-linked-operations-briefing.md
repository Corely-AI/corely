# 329. Source-linked morning operations briefing

## Tracking and outcome

[Issue #329](https://github.com/Corely-AI/corely/issues/329) belongs to [Connected Operations #288](https://github.com/Corely-AI/corely/issues/288).
The branch targets [Today #552](https://github.com/Corely-AI/corely/pull/552) at
`9eff2bcf76c69968714ad2101e8ae70d313f9f63`. Its other dependencies are
[authorized Copilot #542](https://github.com/Corely-AI/corely/pull/542) and the manager
availability exceptions ticket [#327](https://github.com/Corely-AI/corely/issues/327).

## Reuse

- Today supplies permission-filtered schedule, task, decision and coverage records.
  The briefing accepts actionable records from fresh sources and reports missing, restricted,
  stale or partial sources separately.
- The existing Copilot text provider selects ordinals from neutral facts. The server rechecks
  the workspace, date, timezone and chosen facts after selection. Booking and Requests
  links open existing record routes. The Tasks link filters the existing list to the exact
  authorized task.
- The user can mark a briefing useful or needing review. Existing observability captures
  briefing outcomes, review duration, latency and input/output token counts for cost analysis.

## Verification

Eleven targeted tests cover fixed source and briefing fixtures, role-specific projection,
expired and partial records, changed access, note content, provider failure and feedback.
Eleven Task lifecycle tests passed on a migrated PostgreSQL database, including scoped
lookup by task ID. API typecheck and API and Backoffice builds passed.

## UI/UX evidence

A desktop staff fixture generated a briefing with Enter, recorded feedback and opened
the exact Task. When the selected source changed, the old clip disappeared. A mobile
fixture used Today after provider failure and the disabled capability made no model request.

- [Briefing with freshness and source availability, desktop 1440 × 960](./evidence/329/desktop-briefing.png)
- [Manual fallback after provider failure, German mobile 390 × 844](./evidence/329/mobile-fallback.png)

The fixtures use an in-process text provider and synthetic browser responses. The application
reuses the existing commands and database schema.
