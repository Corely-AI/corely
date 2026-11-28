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

## Verification

See the linked draft PR for verified checks and browser evidence.
