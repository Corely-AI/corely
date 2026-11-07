# People staff directory

The PEOPLE-01 slice ([#305](https://github.com/Corely-AI/corely/issues/305)) adds
workspace staff profiles to the administration client at `/people/staff`.
The reusable screens are exported from `@corely/web-features/modules/people`.
The People manifest contributes discovery/menu metadata through the existing app
registry. Enable the People app through the existing platform app controls to
include it in the configured menu; permissions remain independently required.
Working patterns are extended by [PEOPLE-02](./people-availability.md).
These slices do not establish pilot readiness or implement absence, self-service,
payroll, exports, attachments, or AI tools.

## Ownership and persistence

People owns only the employment-directory delta: a stable staff ID within its
actual tenant/workspace, display name, job title, manager staff ID, team/location
labels, archive state, versions, and optional explicit identity links. Staff need
no login account. Team and location are small labels here; this does not create
parallel team, physical-resource or address master data.

- Identity validates an existing active account's tenant and active workspace membership.
- Party validates an active individual in the actual tenant. Party is tenant-owned
  and has no workspace column; no synthetic Party workspace ownership is invented.
- Booking validates an active `STAFF` resource in the actual tenant/workspace.
  Unscoped legacy resources and room/equipment resources cannot be staff links.
- Those owners expose narrow existence lookups through their public exports.
  People never queries their tables or copies their contacts, notes or resources.

The small module uses existing `ext.kv` storage, `moduleId = people`, under separate
`workspace:<workspaceId>:profiles`, `:private`, and `:commands` scopes and the actual
`tenantId`. It adds no schema/table or migration. It does not use a workspace ID
as a substitute tenant ID. Private rows contain personal email, personal phone
and notes only. File references are rejected until owner-level attachment access
is implemented in its own feature.

All People writers acquire the same tenant/workspace PostgreSQL transaction lock
before checking links and versions. Profile/private changes, replay markers,
audit entries and outbox events commit or roll back together. Ordinary/private
updates carry their expected versions. Commands require an idempotency key,
scoped to the authenticated actor and workspace; reuse with another payload is
rejected. Replay stores a record ID and fingerprint, then reauthorizes and returns
its current neutral projection; it never stores a privileged response DTO.

Account/Party/resource associations are unique among staff in the workspace,
including archived profiles. Reporting managers must be active local staff and
cannot form cycles. Archiving retains the staff ID, links and historical manager
references and prevents further edits. It does not change login membership or
existing bookings. Archive is not employee offboarding; that belongs to PEOPLE-04.

## Access and projections

Each application entry point revalidates current tenant/workspace membership and
permissions using the [shared access foundation](../platform/operational-access.md).
People app access is checked independently through the public Platform application
policy: the tenant installation must be enabled and the effective app configuration
must allow People. Disabling the installation immediately denies reads, private
retrieval, writes and command replay even while its feature flag is cached as enabled.
The existing feature cache/invalidation policy is reused; authorization
decisions and personnel responses introduce no shared decision/DTO cache.

| Operation              | Required People permissions                          | Returned fields                                                                                                                                   |
| ---------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| List/search/detail     | `directory.read`                                     | Explicit neutral allowlist: ID, workspace ID, display name, job title, team, location, manager ID, Booking resource ID, status/version/timestamps |
| Management detail      | `directory.read`, `profile.manage`                   | Neutral fields plus optional account/Party link IDs; no owner contact data                                                                        |
| Create/update/archive  | `directory.read`, `profile.manage`                   | Neutral projection                                                                                                                                |
| Read private details   | `directory.read`, `private.read`                     | Personal email/phone, notes and private version                                                                                                   |
| Change private details | `directory.read`, `profile.manage`, `private.manage` | Neutral projection; private write permission alone does not return private fields                                                                 |

All keys above have the `people.` prefix. Explicit denial overrides wildcard
allow. Role names and menu visibility do not authorize a request. Export/audit or
document grants do not confer private access. This slice writes neutral audit
metadata (workspace, staff ID, action, version) but exposes no audit/export/file
retrieval path. It registers no People AI tool or AI retrieval projection.

List/search never retrieves private rows and searches only display name, job
title, team and location. Account/Party IDs are omitted from neutral responses.
All HTTP responses carry `Cache-Control: private, no-store`. The client keeps
personnel results only in mounted component memory, outside persisted query
caches. Reads are cancelled/discarded on scope/projection changes; failed reloads
remove old data. Mutations capture the workspace before asynchronous token
refresh and discard callbacks after unmount, so a pending action cannot adopt a
new workspace or navigate its result into another workspace. Archive confirmation
captures the original staff ID/version and is cancelled when the routed record changes;
a late response cannot reload or close actions on a newly selected profile.

## HTTP and client behavior

Authenticated routes live below `/people/staff`:

- `GET /`: `q`, `archived=active|archived|all`, `page`, `pageSize` (maximum 100).
- `GET /:id`: neutral detail, including archived profiles.
- `GET /:id/management`: permitted explicit link IDs for editing.
- `GET /:id/private`: separately authorized private fields.
- `POST /`: create a minimal profile; only display name is required.
- `PATCH /:id`: save a complete profile-field snapshot and expected `version`.
  Omitted optional fields become null. The editor sends all editable fields.
- `POST /:id/archive`: archive with expected `version`.
- `PATCH /:id/private`: save private fields with their expected `version`.

Mutations accept the shared client's `X-Idempotency-Key` or `Idempotency-Key`.
Unknown fields (including caller-supplied tenant/workspace selectors and file
references) are rejected. Bad input yields 400, denied authority 403, a guessed
out-of-scope ID 404, and stale/conflicting commands 409. Duplicate identity links
carry the stable `People:IdentityLinkConflict` code. The editor keeps the draft
editable so a manager can correct/remove the link and resubmit. Stale-version and
permission failures still require reload rather than blindly repeating a stale save.

The UI provides list/search/status filters, pagination, detail/create/edit routes,
optional link fields, restricted private details, and archive confirmation with
historical retention copy. English, German and Vietnamese copy is included.
Manual actions do not depend on AI. PEOPLE-02 adds the manager availability editor
and linked Booking constraints; neither ticket adds a new client deployment.

## Verification

See the [delivery record](../tasks/305-staff-directory.md) for exact commands,
actual results, visual evidence and baseline-check limitations. Persisted HTTP
checks use two tenants, three workspaces and actual Staff/Manager grants with the
real Identity/Workspaces policies and People repository/projections. Their token
verification boundary is synthetic; they do not establish production JWT issuance,
deployment, customer adoption, universal authorization or compliance.
