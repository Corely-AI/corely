# 310 reviewed request handoffs

[Issue #310](https://github.com/Corely-AI/corely/issues/310) is part of
[Corely Requests #284](https://github.com/Corely-AI/corely/issues/284).
Branch `310-reviewed-request-handoffs` is stacked on
[#539 (`309-typed-operational-requests`)](https://github.com/Corely-AI/corely/pull/539).
Retarget and recheck after #309 integrates into `development`.

## Scope and decisions

An assigned reviewer with current workspace access can approve, reject or return
the submitted version. The requester can edit and resubmit a returned request.
The history shows each submission and decision. Returned edits stay private
until the next submission.

An approved absence stays pending until the assigned reviewer also has People
management permission and applies it with an explicit time zone. People checks
the current staff link, profile, range and existing approved absences. The People
record, Requests application status and outbox events commit in the same database
transaction. A failed handoff is visible and retryable. Equipment and general
requests record decisions. The decision inbox and reminders belong to #311.

Requests loads the narrow Approval Policies module. Approvals re-exports the
same policy service alongside its existing services. This removes the module
cycle found when the Requests, Tasks, published procedure linking and reviewed
operations branches are composed.

## Verification

Five disposable PostgreSQL integration tests and six People and Approvals unit
tests passed. The API and web builds and both scoped typechecks passed. The browser
used synthetic fixtures in a locally built Backoffice to check reviewer-only
actions, validation, Escape cancellation, separate approval and application, a
failed handoff and successful retry, and requester history. German and Vietnamese
status labels were checked. The browser fixtures simulate the API, and the
PostgreSQL tests separately exercise real application writes and event persistence.

- [Approved and pending in People at 1280 × 900](310-assets/approved-pending-desktop.jpg)
- [Failed application and retry at 390 × 844](310-assets/apply-retry-mobile.jpg)
