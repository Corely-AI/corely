# Issues Module

## Overview

The Issues module enables field/customer/manufacturer sites to report problems with text, voice notes, and images. Issues are tracked with a defined status workflow, activity timeline, and audit/outbox events for integration.

## Data Model (Prisma)

Tables live in the **crm** schema:

- `Issue`
  - `id`, `tenantId`, `title`, `description`
  - `status` (IssueStatus), `priority` (IssuePriority)
  - `siteType`, `siteId`
  - `customerPartyId`, `manufacturerPartyId`
  - `assigneeUserId`, `reporterUserId`
  - `resolvedAt`, `resolvedByUserId`, `closedAt`
  - `createdAt`, `updatedAt`

- `IssueComment`
  - `id`, `tenantId`, `issueId`, `body`
  - `createdAt`, `createdByUserId`

- `IssueAttachment`
  - `id`, `tenantId`, `issueId`, `commentId`
  - `documentId`, `kind`, `mimeType`, `sizeBytes`, `durationSeconds`
  - `transcriptText`, `transcriptSegmentsJson`
  - `transcriptionStatus`, `transcriptionError`
  - `createdAt`, `createdByUserId`

- `IssueActivity`
  - `id`, `tenantId`, `issueId`, `type`, `metadataJson`
  - `createdAt`, `createdByUserId`

## Status Workflow

Status values:

- `NEW` → `TRIAGED`
- `TRIAGED` → `IN_PROGRESS` | `WAITING` | `RESOLVED`
- `IN_PROGRESS` → `WAITING` | `RESOLVED`
- `WAITING` → `IN_PROGRESS` | `RESOLVED`
- `RESOLVED` → `CLOSED` | `REOPENED`
- `CLOSED` → `REOPENED`
- `REOPENED` → `TRIAGED` | `IN_PROGRESS` | `WAITING`

Transition enforcement is handled in the domain rules (`issue.rules.ts`). Invalid transitions throw `Issues:InvalidStatusTransition`.

## Permissions Matrix (v1)

| Action        | Reporter | Assignee | Manager/Lead |
| ------------- | -------- | -------- | ------------ |
| Create issue  | ✅       | ✅       | ✅           |
| Add comment   | ✅       | ✅       | ✅           |
| Change status | ❌       | ✅       | ✅           |
| Resolve       | ✅       | ✅       | ✅           |
| Assign owner  | ❌       | ❌       | ✅           |

Policies live in `services/api/src/modules/issues/policies` and rely on `ctx.roles` + ownership checks.

## Transcription Behavior

- Attachments are stored via the Documents module (document ID + metadata in the Issue module).
- **Vietnamese-first**: language hint `"vi"` is passed to the STT provider.
- **Sync path**: if audio is small (`<= 5MB`) and the API has OpenAI configured, the issue is transcribed inline.
  - If `description` is empty, transcript becomes the description.
  - Otherwise a system comment is created.
  - A `issue.transcription.completed` outbox event is emitted.
- **Async path**: larger audio or failed sync transcriptions enqueue `issue.transcription.requested`.
  - Worker downloads the audio via documents storage, transcribes, updates attachment transcript fields, and emits `issue.transcription.completed`.

## Failure Modes & Retries

- **Unsupported audio format / size** → request rejected with `Common:ValidationFailed`.
- **STT provider errors** → `ExternalServiceError` with retryable flag; worker will retry outbox deliveries with backoff.
- **Missing document/file** → worker marks transcription as FAILED on the attachment.

## Outbox Events

Events emitted by the module:

- `issue.created`
- `issue.status.changed`
- `issue.comment.added`
- `issue.resolved`
- `issue.assigned`
- `issue.transcription.requested`
- `issue.transcription.completed`

Outbox events are written in the same transaction as state changes when possible.
