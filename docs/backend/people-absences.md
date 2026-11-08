# Private absences and neutral availability

[PEOPLE-03 / #307](https://github.com/Corely-AI/corely/issues/307) extends the
existing [staff directory](people.md) and [working patterns](people-availability.md).
Authorized managers record an already-approved absence at `/people/staff/:id`.
This slice does not implement employee submission/approval workflows, payroll,
statutory leave balances, automatic reassignment or customer communications.

## Ownership and ranges

People owns absence identity, private reason/notes and append-only revisions in
`ext.kv`, module `people`, scope `workspace:<id>:absences`, keyed by absence ID.
Every record carries the actual workspace and staff ID. Commands reuse the
existing People workspace transaction lock and Booking resource lock. No schema,
table, migration, duplicate staff resource or competing Booking schedule is added.

- Full days use valid civil dates and an IANA timezone. The first date is inclusive;
  the return date is exclusive. Boundaries use the first real instant of each
  civil date: DST produces 23/25-hour days, and wholly skipped dates are rejected.
- Partial days use explicit UTC instants with a timezone retained for context.
  The editor labels these inputs **UTC**, including overnight and repeated times.
  It never guesses which occurrence of a repeated local time was intended.
- Ranges must be positive and at most 366 days. Equal/reversed boundaries and
  invalid dates/timezones are rejected. Approved intervals use half-open overlap
  checks: touching endpoints are allowed; overlapping future intervals for the
  same staff are rejected, including concurrent commands and corrections.
- Managers may record an ongoing absence but cannot change an ended absence.
  Corrections and cancellation append expected-version revisions. A cancelled
  record cannot be reopened; a newly approved absence requires a new record.
  A record has at most 256 revisions; active changes reserve one revision and
  storage headroom for cancellation within the extension-storage limit. There is
  no statutory entitlement engine.

Corrections become operationally effective at the recording clock. Each previous
revision continues to describe elapsed occupancy until that clock; new intervals
apply from then forward. Cancellation releases future blocks while keeping elapsed
blocks and every private revision. An initial ongoing record includes its stated
start. An idempotent replay reauthorizes and returns the current record, rather
than replaying a saved private response.

## Availability and operational projection

People subtracts approved absence intervals from its existing pattern windows.
Booking continues to own resource hours, service buffers, holds, allocations and
reservations, and intersects its rules with those neutral People windows. The
existing resource locks serialize absence changes against public confirmation,
new allocations/holds and rescheduling. Ordinary resources without a linked People
profile retain their existing behavior. Disabling People management does not
remove previously configured constraints.

`GET /people/staff/:id/unavailability?from=<UTC>&to=<UTC>` requires current workspace
membership, `people.directory.read` and the enabled People app. Positive query
ranges are capped at 62 days. The result contains staff/resource IDs, evaluated
clock, absence ID, version, clipped UTC intervals and `unavailable` status only.
Booking's public/internal constraint projection still returns windows only.
Neither path returns private reasons, notes, actor identities or file references.

The manager's existing Working patterns section now evaluates absence blocks
when identifying affected commitments. It reports live conflicting booking/hold
IDs, including unfinished occupancy, and links to Booking for review. Recording,
correcting or cancelling absence never moves, cancels or changes an appointment.
No automated message or AI action is introduced.

## Authorization and persistence

All operations independently resolve current Identity membership/grants, actual
workspace membership, People enablement and the owning staff/absence relationship.
They recheck authority after obtaining the transaction lock. Explicit DENY wins
against wildcard ALLOW; frontend menu/role labels are not authority.

| Operation                                     | Required permissions in addition to workspace membership and People enablement                           |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Neutral unavailable intervals                 | `people.directory.read`                                                                                  |
| Absence list and revision history             | `people.directory.read`, `people.private.read`                                                           |
| Record, correct or cancel an approved absence | Above plus `people.profile.manage`, `people.private.manage`                                              |
| Attachment list or byte download              | Private absence read plus `people.documents.read`, owning absence and attachment relation                |
| Add an attachment                             | Attachment read plus `people.profile.manage`, `people.private.manage`; active staff and approved version |

Commands require the shared idempotency header. A changed payload cannot reuse
its actor/workspace key. Absence state, neutral audit metadata,
`people.absence.changed` outbox event and the ID/hash-only replay marker commit
in one transaction. Events carry lifecycle/version, staff/resource, interval,
previous interval and effective clock. They contain no private reason, notes,
filename, document ID or bytes. Private history is read only through the private
record endpoint; export/audit permissions do not replace private-field grants.
No absence export, audit retrieval, search index or AI retrieval path is added.

All absence/attachment HTTP responses use `private, no-store`. The client uses
mounted component memory, outside persisted query/offline caches. User/workspace,
permission and record changes discard editors, pending actions and late responses.
Unchanged retries retain their command key. Failed drafts remain until explicit
reload; the manual workflow has no AI dependency. Copy is available in EN/DE/VI.

## Personnel file boundary and proxy policy

Documents remains the owner of files/storage. A narrow public Documents port
creates a **new** private document/file and an immutable workspace/absence binding
in its own extension namespace, in the caller's transaction. Existing generic
files cannot be attached or converted, so previously issued generic signed links
cannot become access to these personnel attachments.

Personnel document IDs permanently reserve the `personnel-` prefix. Generic
Document/File/Link persistence adapters reject or filter that namespace, including
metadata, linked lists, completion, signed URLs, proxy bytes and global/public file
lookups. A mistakenly set public flag or legacy generic link cannot declassify a
personnel document. The existing Issue attachment/transcription bridges also reject
these IDs, preventing an indirect byte/AI-context path. New general document/file
entry points must preserve this namespace boundary; this is not a universal audit
of legacy document consumers.

Attachments are created from bounded base64 content: PDF, PNG, JPEG or text, up to
1 MiB and ten files per absence. Type validation is an allowlist, not a malware or
content inspection guarantee. Storage object paths contain generated IDs, never
private filenames/reasons. The dedicated list returns metadata only after the
private/document grants and owning relation pass.

**No signed upload or download URL is issued for personnel files.** Downloads use
an authenticated proxy: check current permissions and absence relation, resolve the
bound document/file, fetch bytes, then recheck current authority before returning.
Responses force attachment disposition, octet-stream, `nosniff` and `no-store`.
Revocation prevents the next proxy response; it cannot retract bytes already saved
by an authorized user. Cancellation retains authorized access to historical files.

File/Document/binding metadata, attachment audit and replay commit together.
Object storage is outside PostgreSQL transactions: a later database/audit failure
can leave an inaccessible generated-key object in the private bucket. It has no
committed document, relation or URL, and retry creates a fresh object. Storage
orphan reconciliation/retention remains an operational follow-up; no purge policy
or regulatory compliance is claimed. Broad generic Documents behavior and its
existing signed-link TTL are unchanged for ordinary documents.

See the [delivery record](../tasks/307-private-absences.md) for executed checks,
rendered evidence and repository-wide verification limits.
