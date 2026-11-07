# 302: Operational roles and private-data access

## Tracking and outcome

- Issue: [#302 / PLAT-02](https://github.com/Corely-AI/corely/issues/302); parent #282; prerequisite #298 complete.
- Foundation: `302-enforce-workspace-access`; [PR #368](https://github.com/Corely-AI/corely/pull/368) merged into `development`.
- Continuation: `302-complete-access-boundaries`, based on merged `development` at `48f61bc6929a22ab6fa637a13192e024fabb467e`; [PR #371](https://github.com/Corely-AI/corely/pull/371) merged into `development`.
- Acceptance handoff: `302-access-foundation-acceptance`, based on merged `development` at `b7ec3bf9ff` (merge of #371); documentation-only Draft PR.
- Base: initially `4ed3292a2c556cff9d13b2cb6c85672be48fb2f3`, rebased onto `1bdae26ddd43ac1d0e4bad0cd754139f7b2186b5` before publication. Range-diff confirmed the original implementation patch was unchanged.
- Outcome: current membership and stored grants authorize authenticated workspace operations, independently of menus and stale token roles. System role names add no permission bypass.
- Scope: existing Identity/Workspaces authorization, permission defaults, Documents and Copilot gates, plus compatible auth/workspace bootstrap. No People records, new app/module/schema or production migration.

## Reuse and implementation

Reuse GetEffectivePermissionsUseCase, AuthorizeWorkspaceUseCase, RBAC metadata, the existing permission catalog and tool registry. Resolve membership/grants freshly instead of caching authorization decisions. Preserve trusted public workspace resolution and configured automation. The [operational policy](../platform/operational-access.md) defines action/resource/field rules and storage limits.

Review at `d4f218b41` reproduced two regressions: auth clients sent a tenant ID as an initial workspace selector, and seeded Owners lost every invoice server tool because those tools lacked permission metadata. Corrections:

- Signup/signin/tenant switching no longer fabricate workspace IDs. `/auth/me` and workspace discovery run without workspace selectors. The client validates its saved ID against the authorized workspace list, preserves valid selection, repairs legacy/revoked/foreign selectors, and leaves host/no-workspace accounts unscoped. Discovery uses one access-token snapshot and retries under the current session if a late success or denial arrives after a tenant switch.
- Shared web wrappers/providers do not restore tenant IDs as workspace IDs. Tenant switching clears cached queries; workspace lists use tenant-specific keys and wait for authentication transitions.
- Invoice tools declare existing invoice read/manage/issue/void/payment permissions. Draft-only email tools require invoice read; customer-name creation also requires customer read. Seeded Owner/Accountant invoice access and read-only projections are tested without wildcard grants.
- Other undeclared legacy tools remain fail-closed; their owners still need explicit metadata before ordinary roles can use them.
- `@corely/auth-client` adds a type-only dependency on existing `@corely/contracts` to reuse ListWorkspacesOutput. The frozen offline lockfile check passes; no new external dependency is introduced.

## Verification

Foundation delivery results (historical; fresh continuation results below):

- API Auth/RBAC/Documents/tool/registry/context/workspace checks, actual invoice builders and full AppModule DI smoke: **75 passed** across eight files.
- Web auth-route/workspace-cache/role-editor checks: **10 passed**, including a pending tenant transition that cannot reuse the old workspace list.
- POS workspace resolver: **3 passed**, including clearing an unavailable last workspace.
- Auth-client build, API typecheck/build, web-shared typecheck, and separate compilation of API/browser-client test fixtures: passed.
- Changed-file production ESLint: zero errors; existing warnings remain. Test/spec files are ignored by repository ESLint and are executed/typechecked instead. Changed-file Prettier and local documentation links are checked before commit.
- Root `pnpm test:unit`: **1,080 passed, 8 skipped**, 265 suites passed; the unchanged cash-handoff integration suite fails initial Prisma cleanup against its hard-coded local database on port 5432. This is not a passing full-suite result.
- `pnpm --filter @corely/web typecheck`: eight errors in unchanged Assistant/Cash Management files (thread response shape, missing RegisterBindingRequest, contracts subpath/Locale, and obsolete cash-close states). Changed auth/workspace production packages typecheck successfully.
- Earlier root `pnpm lint` exhausted its configured 8 GB heap. `pnpm arch:check` still scans absent `services/worker/src`. These checks were not weakened or repaired outside this ticket.
- CI on the previous head failed because generated Prisma client output was absent and the browser job invoked missing `e2e:smoke`; the separate Cash Management integration job passed. New-head CI status is reported in the PR, not inferred from these local checks.

Reproduce the core API regressions:

```sh
pnpm --dir services/api exec vitest run --config vitest.config.ts \
  src/modules/identity/__tests__/auth-workspace-bootstrap.spec.ts \
  src/modules/identity/__tests__/operational-access.spec.ts \
  --maxWorkers=1 --minWorkers=1

pnpm --dir apps/web exec vitest run --config vitest.config.ts \
  src/app/router/workspace-scope.spec.tsx \
  src/app/router/workspace-recovery.spec.tsx \
  src/modules/settings/screens/role-permissions.spec.tsx \
  src/app/router/require-auth.spec.tsx \
  --maxWorkers=1 --minWorkers=1
```

The branch is published using the hook's documented `HUSKY=0` escape after directly running scoped checks; the full-suite fixture failure and broad-check limits are disclosed. No failing new-code check is waived.

## Local runtime and UI/UX evidence

The user authorized synthetic accounts. A fresh, isolated PostgreSQL cluster on loopback port 55432 hosts `corely_302`; existing repository migrations were applied only there. Two reusable Owner accounts in separate tenants/workspaces were created through the real signup/workspace APIs, plus a disposable browser signup. IDs are distinct. Credentials stay in ignored local files and are never committed. The local API uses real JWT authentication with NODE_ENV=production, local storage, memory/noop queues and synthetic provider keys, without loading saved environment credentials. No deployment, production database change or external message was performed.

Actual browser checks against this local API (no mocked auth responses):

- Sign-in reaches the dashboard with the correct workspace at 1440×1000 and 390×844.
- Mobile Tab moves from email to password; Enter submits successfully. No horizontal overflow was observed.
- Reloading a legacy invalid saved selector restores the authorized workspace.
- Fresh browser signup reaches onboarding with no selected workspace; the empty state does not fabricate a tenant selector.
- Real JWT requests for own workspace succeed; a guessed foreign workspace from the other seeded tenant returns 403.
- English desktop/mobile states were inspected. German/Vietnamese, native clients and live model-provider behavior were not exercised; no new UI layout/copy was introduced.

Review captures (synthetic data only):

- [Desktop sign-in result](302-assets/auth-desktop.png)
- [Mobile restored session](302-assets/auth-mobile.png)
- [Mobile signup / no-workspace onboarding](302-assets/signup-onboarding-mobile.png)

## Follow-up review corrections

Review at `ec7d5f073` reproduced two remaining caller regressions. Workspace list/create
and POS restoration still sent the deleted/revoked selection, blocking recovery with 403.
The tenant-role hook also searched Identity memberships using the newly correct workspace ID,
so an Owner lost the system-role editing controls.

- `ApiClient` now accepts explicit `workspaceScope: "none"` for account-level recovery.
  Web workspace discovery/creation and POS discovery use it, retaining authentication,
  refresh/retry and idempotency behavior. Ordinary requests still carry and authorize their
  active workspace; the server guard is unchanged.
- Completed successful discovery selects an authorized remaining workspace or clears a dead
  selection when none remain. Discovery errors do not clear it. Deletion refreshes discovery
  before onboarding. POS persistence also clears unavailable IDs and no longer fabricates a
  workspace from a tenant ID.
- Identity role lookup uses `activeTenantId`, separately from workspace selection. An Owner
  can edit/save Staff system-role grants; non-Owner system-role editing stays disabled.

Fresh follow-up checks: **75 API + 10 web + 3 POS helper tests = 88 passed**. The API
fixture uses the real client, AuthGuard and workspace policy to prove recovery and continued
403 denial of revoked scoped requests. Web checks use the actual client/storage/workspace
facade/provider and actual role editor. Auth-client build, web-shared typecheck, API/client
fixture compilation, changed-production-file ESLint (zero errors, four existing warnings),
Prettier and diff whitespace checks pass. Full web typecheck reproduces the same eight
unchanged Assistant/Cash Management errors. Earlier full-unit/API-build/root-lint results
above were not rerun for this client-only follow-up.

Fresh local runtime evidence uses the same isolated loopback API/database and synthetic
accounts. Owner A's local workspace was upgraded to Company to exercise its RBAC UI. At
1440×1000 the Owner toggled document read on the Staff system role, saved, and an API read
confirmed the persisted ALLOW grant. Phone layout/scroll was inspected at 390×844 with no
horizontal overflow. Owner B deleted its sole synthetic workspace, reached onboarding with
no saved selector, completed the replacement setup, and reached the dashboard with the new
workspace selected without reload/re-login. No browser responses were mocked. Native POS UI
and German/Vietnamese remain untested; the actual POS lookup is covered in the API fixture.

- [Owner editing Staff system-role permissions, desktop](302-assets/owner-role-edit-desktop.png)
- [Last workspace deleted, phone onboarding](302-assets/deleted-workspace-onboarding-mobile.png)
- [Replacement workspace created, phone dashboard](302-assets/replacement-workspace-mobile.png)

## Continuation after merging #368

The follow-up closes reachable gaps in existing owners without creating People records:

- Legacy Copilot run/history/message/resume reads now require their creator, matching the
  modern thread API. Same-workspace Staff and Manager users get 404 without private values.
  Run reuse and internal stream continuations check ownership before replay/history/model
  execution; create collisions validate the actual returned owner.
- Message upserts validate storage scope and run ID, including the concurrent unique-key
  retry path. SQL thread search/history constrain both message and parent run scope.
- Document proxy reads reject mismatched document/file IDs before fetching bytes. Both
  authenticated controllers and SDK streams prevent response caching with `private, no-store`.
- Workspace switching discards old payload queries and mutation view state and remounts
  feature views. It retains only authorized discovery for the current tenant. Scoped offline
  subscriptions reject late restores/writes; a cache-buster refreshes old snapshots and
  effective-permission queries are excluded from persistence. Other offline caching remains.

Fresh verification:

- **158 owning-module unit/HTTP tests** across Copilot, Documents, Identity, Workspaces and
  request context; **10 AppModule DI checks**. The new HTTP cases exercise the actual
  controller/use cases and AuthGuard with deterministic identity/workspace ports.
- **9 PostgreSQL integration checks** use actual Prisma run/message/search/chat-store
  adapters. They cover creator/workspace/foreign-scope isolation, search, inconsistent
  message/run relations, guessed IDs, real unique-key fallback after a stale preflight,
  unchanged foreign messages and successful same-conversation updates.
- **14 web checks** include old-cache/draft removal, ignored late query results, successful
  current-scope offline restore and rejected obsolete restore/persist operations.
- Regression checks fail against the original implementation for creator access,
  document/file substitution and workspace-cache retention, then pass with the corrections.
- API typecheck/build, web-shared typecheck and separate fixture typecheck: passed.
  Changed-production ESLint: zero errors after corrections, with existing warnings;
  Prettier and changed documentation references: passed.
  Broad root checks and the unrelated web-app type errors documented above are not repaired
  or represented as passing by these scoped results.

The Docker daemon is unavailable. The committed integration suite uses the existing
Testcontainers harness; locally a temporary setup substitutes only database provisioning.
A fresh `corely_302_boundarytest` database on the existing isolated loopback PostgreSQL port
55432 receives the repository's existing migrations. The temporary harness asserts its exact
host, port and database before connecting/resetting only this test database. Repositories,
SQL, use cases and assertions are unchanged; no shared or production database is touched.

Reproducible repository commands:

```sh
pnpm --dir services/api exec vitest run --config vitest.config.ts \
  src/modules/ai-copilot/__tests__/run-access.spec.ts \
  src/modules/ai-copilot/__tests__/private-retrieval.http.spec.ts \
  src/modules/documents/application/use-cases/proxy-download/proxy-download.usecase.test.ts

# Requires the existing disposable PostgreSQL/Testcontainers environment:
pnpm --dir services/api exec vitest run --config vitest.config.ts \
  src/modules/ai-copilot/__tests__/private-retrieval.int.test.ts

pnpm --dir apps/web exec vitest run --config vitest.config.ts \
  src/app/router/workspace-scope.spec.tsx src/app/router/offline-scope.spec.ts
```

UI/UX: existing `/settings/workspace` was inspected with synthetic Owner B across two
workspaces at 1440×1000 and 390×844 in English. Switching with an unsaved draft removes
that draft and displays the new workspace's values; the real config request was delayed
one second to inspect the pending transition, without mocking its response. Returning on
phone restores saved workspace B values, without the old draft or horizontal overflow.
New ownership/file/cache HTTP behavior is covered by tests; no live model provider or
personnel redaction is claimed. Native clients and German/Vietnamese were not exercised.

- [Before switching, synthetic unsaved draft](302-assets/workspace-switch-before-desktop.png)
- [After switching to workspace C, desktop](302-assets/workspace-switch-after-desktop.png)
- [Return to workspace B, phone](302-assets/workspace-switch-after-mobile.png)

## PR #371 router review correction

Review at `00c915728` reproduced a navigation regression: the workspace key also
remounted BrowserRouter. Creating a workspace selected its ID before awaiting discovery;
the old navigate callback then updated the URL while the new router kept showing a reset
onboarding wizard. The same broad boundary also reset unrelated public-route local state.

The key now sits on the shared app shell's routed-content container. Authenticated views
still discard private drafts/stream state when the workspace changes. Router, shared
providers and public/auth routes remain mounted; query cancellation/removal and guarded
offline persistence remain unchanged. Focused clients reuse the same app shell.

Fresh checks for this client-only correction:

- **16 web tests passed** across six files. New cases use the actual onboarding page,
  BrowserRouter and shared AppShell: delayed post-create discovery reaches the dashboard
  DOM as well as its URL; a non-workspace form keeps its draft through selection changes.
  Both new cases fail before the correction. Existing scope tests now render the actual
  app shell and still prove private draft/cache reset and rejection of late old responses.
- Web-shared typecheck passed. Changed-production ESLint passed with three existing console
  warnings. Changed files pass Prettier and diff whitespace checks.
- Full web-app typecheck reproduces the same eight unchanged Assistant/Cash Management
  errors. Backend/SQL/full-root checks above were not rerun for this client-only change.
- Real local API/JWT/PostgreSQL creation succeeds at **1440×1000** and **390×844** using
  the existing synthetic Owner B. GET workspace discovery is delayed 750 ms without
  mocking the response. Both journeys reach `/dashboard` with the actual “Welcome back”
  dashboard and no onboarding wizard; phone horizontal overflow is absent.
- Shared boundaries are covered locally; focused-client/native browser journeys and
  German/Vietnamese were not exercised. No backend, schema, migration or release changed.

[Desktop post-create dashboard](302-assets/onboarding-router-fixed-desktop.png) ·
[Phone post-create dashboard](302-assets/onboarding-router-fixed-mobile.png)

## Foundation acceptance handoff

On 2026-11-07 the maintainer explicitly selected: finish #302 as the shared access
foundation; retain People requirements in their owning tickets. This supersedes the
earlier interpretation that #302 must await unimplemented People features. #305 already
depends on #302. The [policy acceptance matrix](../platform/operational-access.md#foundation-delivery-and-downstream-acceptance)
maps the four foundation criteria to the merged implementation and executable checks;
it retains field/attachment/export/audit requirements in #305, #307 and #308.

Fresh checks on `development` at `b7ec3bf9ff`, before this prose-only handoff:

- **97 API tests passed across 13 files**, no skips: operational-access (20),
  auth-workspace-bootstrap (12), authorize-workspace (6), request-context.resolver (9),
  effective-permissions (4), run-access (10), private-retrieval.http (11), tool-registry
  (11), stream-copilot-chat.persistence (1), proxy-download (7), get-download-url (1),
  get-public-file-url (2) and tools.factory (3). The tools.factory suite executes the
  actual SDK callback, including conflicting model selectors and execution-time denial.
- **16 web tests passed across six files**, no skips: workspace-scope (2), offline-scope
  (3), workspace-recovery (4), workspace-navigation (2), require-auth (3) and
  role-permissions (2). Existing i18next/router warnings remain.
- The three changed Markdown files pass installed Prettier, 124 local path/anchor
  reference checks and `git diff --check`.
- SQL integration, full-root checks, builds/typechecks and browser journeys were not
  rerun for this documentation-only change. Prior results and baseline limits above
  remain historical; no deployed privacy or universal legacy-domain audit is claimed.

UI/UX: N/A for this handoff; it changes policy/tracking prose only. Prior screenshots
remain evidence for the already merged UI changes.

Reproduce the fresh acceptance checks (the API files were run in two invocations):

```sh
pnpm --dir services/api exec vitest run --config vitest.config.ts \
  src/modules/identity/__tests__/operational-access.spec.ts \
  src/modules/identity/__tests__/auth-workspace-bootstrap.spec.ts \
  src/modules/workspaces/application/use-cases/authorize-workspace.spec.ts \
  src/shared/request-context/__tests__/request-context.resolver.spec.ts \
  src/shared/permissions/__tests__/effective-permissions.unit.test.ts \
  src/modules/ai-copilot/__tests__/run-access.spec.ts \
  src/modules/ai-copilot/__tests__/private-retrieval.http.spec.ts \
  src/modules/ai-copilot/__tests__/tool-registry.spec.ts \
  src/modules/ai-copilot/__tests__/stream-copilot-chat.persistence.spec.ts \
  src/modules/documents/application/use-cases/proxy-download/proxy-download.usecase.test.ts \
  src/modules/documents/application/use-cases/get-download-url/get-download-url.usecase.test.ts \
  src/modules/documents/__tests__/get-public-file-url.usecase.test.ts \
  --maxWorkers=1 --minWorkers=1
pnpm --dir services/api exec vitest run --config vitest.config.ts \
  src/modules/ai-copilot/__tests__/tools.factory.spec.ts --maxWorkers=1 --minWorkers=1
pnpm --dir apps/web exec vitest run --config vitest.config.ts \
  src/app/router/workspace-scope.spec.tsx src/app/router/offline-scope.spec.ts \
  src/app/router/workspace-recovery.spec.tsx src/app/router/workspace-navigation.spec.tsx \
  src/app/router/require-auth.spec.tsx src/modules/settings/screens/role-permissions.spec.tsx \
  --maxWorkers=1 --minWorkers=1
```

## Impact and remaining work

#302 remains open pending integration of its acceptance handoff. Under the confirmed
scope, the merged foundation and follow-up provide common enforcement and policy;
private People field/search/cache/export/audit projections and personnel attachment
ownership remain required in #305, #307 and #308. Closing the foundation does not close
those tickets or establish People readiness. A synthetic directory fixture is not a
deployed private-field redactor. Generic documents remain tenant-owned; signed URLs
already issued remain valid until their storage TTL.

Existing stored roles require explicit new document grants; no automatic permission backfill is performed. Other undeclared legacy server tools remain restricted. Rollback is reverting the source; the review-only local database is independent of application migrations and production data.
