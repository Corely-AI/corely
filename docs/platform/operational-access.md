# Operational access and private data

Status: shared authorization foundation for [PLAT-02 / #302](https://github.com/Corely-AI/corely/issues/302).
This describes implemented gates separately from requirements for upcoming operational owners.
It does not establish that every existing domain has been audited.

## Authority and enforcement

`AuthGuard` obtains identity and tenant/host scope from a verified token. It checks
current Identity membership on every authenticated request and replaces token role IDs
with the current membership role. Raw user/tenant headers are not authenticated identity
(the existing integration-test header seam is confined to `NODE_ENV=test`).

A workspace selector is a request to access a workspace, not authority. When provided,
`AuthorizeRequestContextUseCase` calls Workspaces' public `AuthorizeWorkspaceUseCase`:
the workspace must belong to the authenticated tenant and the user must have an active
workspace membership. Missing selectors stay missing; tenant IDs are never synthesized
as workspace IDs. Tenant-owned legacy endpoints can work without a workspace; an owner
requiring workspace records must reject missing workspace context in its use case.

Auth clients bootstrap `/auth/me` and workspace discovery without a selector. They
validate the saved selection against the authenticated user's authorized workspace list
before scoped requests, repair legacy/revoked/foreign selections and preserve valid ones.
Host and no-workspace accounts stay unscoped. Discovery reads use one token snapshot and
retry if authentication changes before a late success or denial is published. Web workspace-list caches include the
current tenant and pause during tenant transitions; account switching clears old queries.

`RbacGuard` checks handler/class `RequirePermission` metadata through
`GetEffectivePermissionsUseCase`, which reloads current membership, role and grants.
All roles, including OWNER/ADMIN and host roles, require current stored permission
grants; an explicit DENY wins, including over an explicitly stored wildcard ALLOW.
Workspace capability templates and menus cannot bypass this gate. Authentication alone
does not grant a resource permission. Internal application calls must enforce their
own applicable authorization; HTTP guards are not an application-wide policy engine.

Trusted public workspace resolution remains separate. Public booking and published
journeys retain their existing server resolution and publish/module checks.

## Action, resource and field rules

The permission catalog reserves the following People keys for owning feature tickets.
Catalog entries do not create People records, endpoints or field-level implementations.
A workspace role such as MEMBER/ADMIN is not itself a private-data grant; managers need
explicit permissions through their current Identity role.

| Resource / action                                    | Permission                                           | Projection and ownership rule                                                                                                                                                                |
| ---------------------------------------------------- | ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Neutral staff directory / availability               | `people.directory.read`                              | Return only necessary operational identity, team/work status and neutral availability. Never return absence reasons, medical details, private contacts, personnel notes or file references.  |
| Operational profile changes                          | `people.profile.manage`                              | Allowlist operational fields; private fields require the separate private-write grant.                                                                                                       |
| Private personnel details                            | `people.private.read` / `people.private.manage`      | Separate private read/write paths and projections; authorize the workspace and subject record before retrieval or change.                                                                    |
| Personnel attachment access                          | `people.documents.read`                              | Authorize the owning personnel record, attachment relation and private-document permission before listing or signing. Generic document access is insufficient to establish personnel access. |
| Personnel export                                     | `people.export` plus permissions for included fields | Filter records and project fields before generating a file; export permission does not grant private-field or attachment access.                                                             |
| Personnel audit history                              | `people.audit.read`                                  | Authorize record scope; redact private values unless the caller also has the corresponding private-read grant. General directory access never grants audit access.                           |
| Generic tenant document list / download / signed URL | `documents.read`                                     | Implemented on Documents HTTP reads, in addition to existing owning use-case tenant checks.                                                                                                  |
| Generic tenant document upload / link / unlink       | `documents.manage`                                   | Implemented on Documents HTTP writes, in addition to existing owning use-case tenant checks.                                                                                                 |

New STAFF/READ_ONLY defaults exclude catalog permissions marked `danger`, including
private People reads, audit, exports and generic document access. Neutral directory
read is eligible for their normal read defaults. Deployment performs no stored-grant backfill;
operators must assign new explicit document permissions where needed. The existing
role-seeding operation still replaces defaults when explicitly invoked. New OWNER/ADMIN roles receive catalog grants through the existing seeder;
role names never add implicit permission bypasses. This change has no migration or role backfill.

## Retrieval, tools, files and caches

The model adapter filters server tools using current effective permissions before
exposing them. The AI SDK execution callback repeats authorization immediately before
calling each tool. Server tenant/workspace/user context is supplied separately from model
input. Tool handlers must pass that context to owning use cases and must not replace it
with selectors inside model arguments. Existing app/surface scoping still applies.

Server tools must declare every `requiredPermissions` key needed for their operation.
Legacy tools without metadata require a current explicitly wildcard-granted role
with no DENY entries. OWNER/ADMIN names alone do not grant this access. This intentionally removes
undeclared tools from ordinary role access until their owners annotate and verify them. Invoice tools now declare existing sales invoice/payment permissions; customer-name
creation additionally requires customer read. Draft-only email tools require invoice
read. Seeded Owner/Accountant and read-only role behavior is covered with the actual
tool builders. Other undeclared legacy tools retain the fail-closed policy above. Tool
execution requires an actual authorized workspace. Sensitive-action confirmation remains
an additional obligation; these permission checks do not replace it or enable automation.

Account-level workspace discovery and creation omit the saved workspace selector, while
retaining authenticated tenant membership checks. This lets clients recover after deletion
or revocation without weakening scoped resource authorization. Completed successful discovery
clears unavailable selections or selects an authorized remaining workspace; a discovery error
is not an empty membership list. Identity role lookup uses tenant membership, separately from
workspace selection, so resolving a real workspace ID preserves Owner role-management access.

No authorization-decision cache is introduced. Owner implementations of search, summaries,
exports and AI retrieval must authorize before querying and apply the same record/field
projection as direct reads. Cache keys must include tenant, workspace and permitted
projection, and authorization must be revalidated before serving cached data. Never
cache a privileged DTO and return it to a directory reader. Current catalog/menu caches
are discovery hints, not permission evidence.

Generic Documents records currently have tenant ownership, not a personnel/workspace ACL.
Consequently `documents.read` grants broad tenant document access. Do not store private
People attachments through this generic API until an owner-scoped policy guards all
retrieval/link/signing paths. Adding that ownership belongs with the People attachment
feature, rather than fabricating a new document schema in this platform ticket. Previously
issued signed URLs remain valid for their storage TTL; revocation blocks new API issuance,
not already-issued bearer URLs. Private files need an appropriate TTL/proxy policy.

## Conversation, file and cache boundaries

Copilot conversations are private to their creator, including the legacy run, raw-message,
UI-history and resume routes. Tenant-wide Owner/Admin/Manager labels do not grant access to
another creator's conversation. Internal stream continuations and run-ID reuse check the
owner too, including a create collision returning an existing row. Ownerless legacy runs
are not shared conversations. The established Copilot storage namespace still uses a
selected workspace ID in its `tenantId` field; legacy tenant-scoped history retains its
existing namespace. This change does not rewrite records or interchange Identity tenant
and workspace authority.

A message ID belongs to both its storage scope and its conversation. Normal and concurrent
upsert paths reject another run's ID. Search and thread-message queries constrain both the
message scope and the parent run scope, since the schema has no composite scope foreign key.

Document proxy downloads check that the file belongs to the requested document and tenant
before reading bytes, matching signed-download behavior. Authenticated Documents and Copilot
responses send `Cache-Control: private, no-store`, including SDK streams. Explicitly public
file redirects retain their publication flag checks. Existing generic documents are still
tenant-owned, not personnel attachment ACLs; already-issued signed links retain their TTL.

Workspace changes cancel and discard cached payload queries and mutation view state, then
remount workspace views so old local drafts/stream state cannot follow the new selection.
Only the current tenant's authorized workspace-discovery list is retained. Callers should
still include scope in query keys; scope changes are not an authorization grant.

The reset boundary is the authenticated app shell's routed content, inside the router.
The router, shared providers, login and public routes remain mounted, so a pending
workspace-creation action can finish discovery and navigate to the rendered dashboard.
Public-route form state is not reset by an authenticated workspace selection change.

Offline restore/write completion must still match its captured user/workspace subscription
and current selection. Old subscriptions cannot hydrate a new workspace after a delayed
IndexedDB read. The `workspace-scope-v2` cache buster discards earlier query snapshots, and
effective-permission queries are no longer persisted. Other current-scope offline query
caching and the outbox remain in place. Switching workspaces discards unsaved local form
state; finish/save work in the current workspace before switching.

This is not a retroactive private-field redactor for historical conversations or an
implementation of People attachment/export/audit ownership. Those owners must define and
test their authorized projections and cache/retrieval policy before storing private data.

## Evidence and limits

Synthetic HTTP tests exercise the actual Auth/RBAC guards and Documents controller for
current-role lookup, tenant/workspace membership revocation, workspace switching, explicit
deny, private/export grants and signed-file rejection before use-case execution. A fixture
returns an explicit neutral directory projection; it is not evidence of a deployed People
private-field redactor. AI SDK callback tests verify per-execution authorization and trusted
context despite conflicting model selectors. Workspaces' existing tests cover owner checks.

Before a People feature is accepted, add owner-level negative tests with real record
projections, search/cache/export/file paths and at least two tenants/workspaces. The shared
gates here do not establish field isolation for unimplemented People features or a complete
audit of legacy domains, background handlers and existing stored role grants.

Implementation entry points:

- [Authenticated context](../../services/api/src/modules/identity/application/use-cases/authorize-request-context.usecase.ts)
- [Effective permissions](../../services/api/src/modules/identity/application/use-cases/get-effective-permissions.usecase.ts)
- [Workspace authority](../../services/api/src/modules/workspaces/application/use-cases/authorize-workspace.usecase.ts)
- [Tool authorization](../../services/api/src/modules/ai-copilot/application/services/authorize-tool.service.ts)
- [Negative HTTP/tool tests](../../services/api/src/modules/identity/__tests__/operational-access.spec.ts)
- [Task record](../tasks/302-enforce-workspace-access.md)
