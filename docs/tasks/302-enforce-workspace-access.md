# 302: Operational roles and private-data access

## Tracking and outcome

- Issue: [#302 / PLAT-02](https://github.com/Corely-AI/corely/issues/302); parent #282; prerequisite #298 complete.
- Branch: `302-enforce-workspace-access`; PR: [Draft #368](https://github.com/Corely-AI/corely/pull/368), targeting `development`.
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

Current scoped results:

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

## Impact and remaining work

#302 remains open / In progress. This PR provides common enforcement and policy; private People field/search/cache/export projections and personnel attachment ownership require owner-level implementation and acceptance tests. A synthetic directory fixture is not a deployed private-field redactor. Generic documents remain tenant-owned; signed URLs already issued remain valid until their storage TTL.

Existing stored roles require explicit new document grants; no automatic permission backfill is performed. Other undeclared legacy server tools remain restricted. Rollback is reverting the source; the review-only local database is independent of application migrations and production data.
