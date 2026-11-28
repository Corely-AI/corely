# Operational recovery rehearsal

Related to [REL-03 / #333](https://github.com/Corely-AI/corely/issues/333). The
recovery drill uses synthetic data in disposable PostgreSQL 17.6. The currently
published deployment and any existing backup policy require separate verification.

## Diagnose an interrupted action

Capture the workspace from authenticated support context, the owning surface, the time
range and the action or event identifier. Keep raw requests, attachment URLs, personnel
notes, AI prompts, and provider response bodies out of support records. Check current
authoritative state before retrying.

| Symptom                                     | Check and recover                                                                                                                                                                                                                                                                                            |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Booking status is unclear                   | Reopen the scoped Booking/OpenBuk record and verify its current version. Re-run availability checks before proposing a move. If a customer update is associated with the booking, confirm its separate delivery status.                                                                                      |
| A decision succeeded and application failed | Use the Requests or owning domain review flow. Recheck the decision, reviewer permission and the current version, then retry the same application through its guarded command.                                                                                                                               |
| An outbox delivery is delayed               | Inspect event ID/type, status, attempts and `availableAt`. Check `outbox.tick.start`, `outbox.tick.end` and `outbox.event.failed` by event ID or the logged `correlationKey`. The key is a shortened SHA-256 of the existing correlation ID. Report only the event ID and failure code in support artifacts. |
| An AI action is interrupted                 | Use the manual owner flow if the provider is unavailable. Reopen the exact preview before confirming a stale action. Check the durable task or appointment state before any retry. Keep correction effort and provider usage aggregate, with prompts and personnel fields excluded from support evidence.    |

The API hosts the outbox runner. `PENDING` means retry is scheduled for
`availableAt`. `PROCESSING` means a claimed lease is active until
`lockedUntil`. `SENT` means the registered handler returned successfully.
`FAILED` is terminal for the runner. Examine delivery receipts in the owning domain
before interpreting a timeout, since an external action could already have taken effect.

The runner emits fixed `HANDLER_FAILED`, `HANDLER_TIMEOUT`, `NO_HANDLER` and
`LEASE_EXTENSION_FAILED` diagnostics and keeps the retry state separate. Existing
historical errors and events can still include sensitive fields. Access them only through
authorized operational tools. Compare recipient, exact approved payload and durable
idempotency receipt before an operator retries a terminal delivery. Use the owning
operation with its original identity when it supports replay. Leave terminal events
unchanged when delivery is ambiguous or a handler has no verified deduplication.
Restoring an older database does not undo external effects.

## Restore and verify in isolation

1. Identify the snapshot, source commit, migration status, storage version and recovery
   point. Provision a fenced target and keep customer deliveries and background runners
   disabled during restore and verification.
2. Restore into a new database using the approved provider restore path, or the checked
   PostgreSQL backup tools for a disposable drill. Keep the original source available
   during validation. Verify migration history and test representative scoped reads.
3. Compare representative restored records, their versions, related audit records and
   outbox state against the snapshot. Reconcile subsequent writes and externally
   completed effects before any promotion. Abort if ownership, records or history do
   not match. For managed database or application rollback follow the authorized
   release and backup procedures for that environment.
4. Set the next owner/action before resuming ingress or runner activity. Record duration,
   recoverable point, discrepancy and any child data still requiring restore. Apply
   production recovery objectives agreed by the service owner.

The local rehearsal created two dedicated databases on loopback, applied
`pnpm prisma:migrate` on the source, and used `pg_dump --no-owner --no-privileges -Fc`
and `pg_restore --exit-on-error --no-owner --no-privileges`. No external sender was
configured. The exercise captured a synthetic task at version 1, its pending delivery
at attempt 1, and its audit record. After a version-2 completion changed the event
and appended audit, the restored database contained the original task version,
pending event, original audit and both migration records. The source retained version 2.
The snapshot took 3.62 seconds. Restore plus checks took 34.89 seconds. The separation
between the snapshot marker and post-snapshot write verification was 5.59 seconds.
The local rehearsal target was restoration and verification in under two minutes with
all pre-snapshot fixtures intact. This drill covers a small database rollback rehearsal.
Application cutover, durable file storage, provider recovery and production objectives
remain to be exercised.

## Handle personnel records, files and AI inputs

People and Documents own record and file authorization and lifecycle. Recheck purpose,
workspace and current permissions for every support read. Use neutral availability for
operational diagnosis and avoid including private reasons or records in event and audit
exports. Route deletion and export to the owning service and review both database and
object storage, including restored copies. Before accepting real pilot data, obtain
an approved retention schedule and deletion/export handling for personnel records,
attachments, object/backups and operational logs. Confirm AI provider settings, terms,
retention and any regional processing requirements with the responsible reviewers.
These checks depend on the chosen deployment and provider configuration.

See [operational access](../platform/operational-access.md),
[AI policy](../ai/ai-copilot.md), and [Prisma backup and baseline](prisma-baseline.md).
