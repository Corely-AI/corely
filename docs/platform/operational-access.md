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
undeclared tools from ordinary role access until their owners annotate and verify them. Tool
execution requires an actual authorized workspace. Sensitive-action confirmation remains
an additional obligation; these permission checks do not replace it or enable automation.

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
