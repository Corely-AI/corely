# #393 — App visibility and host enablement

## Tracking and outcome

- Issue: [SURF-12 #393](https://github.com/Corely-AI/corely/issues/393), parent [#380](https://github.com/Corely-AI/corely/issues/380).
- Prerequisites #383, #388 and #392 are completed and integrated in the base.
- Branch: `393-app-visibility-controls`; PR base: `development`, verified remote `corely`, base `48517fcbc063825450ac292799b71edb70d7d753`.
- PR: [Draft #419](https://github.com/Corely-AI/corely/pull/419).
- Outcome: connect the launcher to existing authorized host controls; preserve separate install, entitlement, workspace and permission gates; refresh revoked access.
- Exclusions: new billing/tiers, migrations, deployment and legacy hosting cutover.

## Reuse and decisions

- Staff discovery and the shared switcher still use `ListAppLaunchesUseCase` and existing focused menu composition. Supporting dependencies never become tiles without their own launch descriptor or enter focused Invoice navigation. Staff projections omit dependency topology.
- Existing policy makes `platform.apps.manage` and tenant entitlement mutation host permissions. Tenant owners do not acquire those permissions. `GET /menu/app-management` resolves the actor's current host membership through the identity owner; eligible hosts receive only the existing `/settings/tenants/:tenantId` path. Others receive `{}`. Mutation endpoints independently retain AuthGuard/RbacGuard.
- The link uses retained same-origin legacy routing from ADR-0003. Its actual hosting and authentication remain SURF-19/SURF-24 gates; the standalone launcher does not implement the host administration page or transfer session credentials.
- The existing host enable command previously wrote feature overrides without installing missing records. It now delegates installation/dependency resolution to Platform's public installer within the same serializable transaction as overrides and audit. A failed write rolls back all three. Disable constraints and cascading behavior stay in the existing entitlement owner; the UI never silently escalates a conflict into a cascade.
- Installation and effective enablement remain distinct. Subscription/feature source, workspace capabilities and user permissions are not inferred from a tile or toggle. Disabling preserves business data and install history.
- Removed the process-local five-minute entitlement cache: a different API instance must observe committed disablement. Existing plan feature resolution remains owned by Billing. This adds read work to entitlement resolution.
- Launcher, switcher, navigation and workspace authority refresh on focus/reconnect and every 30 seconds while active. Every launch still revalidates; API guards remain authoritative between UI refreshes.
- Host controls now change configuration only after an explicit action; opening the page no longer silently enables required apps. They explain dependency enablement, retain audited success feedback during refresh, show errors and refresh after uncertain failures. Tenant navigation invalidates pending responses and does not render another tenant's configuration.

## Verification

- Disposable PostgreSQL 17 cluster on local port 55493, database `corely_384_visibility393`; migrations deployed only there. No shared database, background delivery or real email was used.
- `SSO_TEST_DATABASE_URL=<disposable URL> pnpm --dir services/api exec vitest run --config vitest.config.ts src/modules/platform/__tests__/app-management.int.test.ts src/modules/platform/__tests__/focused-api-access.int.test.ts`: **10 passed**. Actual JWT/membership/host grants, controller authorization, persisted installation/override/audit, rollback, another service instance observing disablement, and existing direct business API access tests. The latter suite includes its documented test doubles.
- `PLAYWRIGHT_CHANNEL=chrome pnpm --dir apps/e2e exec playwright test --config playwright.app-center.config.ts`: **3 passed**. Actual Vite launcher with route-mocked session/API responses; periodic refresh, hidden admin controls for members, keyboard entry, phone geometry, retained-route navigation and stale-launch prevention. The legacy destination document is simulated; this is not real hosting acceptance.
- App Center suite: **16 passed**, including its production/root-build CSS regression. Host control and refresh/race suites: **6 passed**.
- API unit suite: **26 passed** across host discovery, catalog, focused menus, configuration, entitlement gates and controller wiring. Contracts, App Center and web-shared typechecks, API `tsc --noEmit`, and App Center production build passed.
- Shared suite: **91 passed, 3 failed**. All three are existing workspace-session-provider cases failing with Node 24/jsdom `AbortSignal` incompatibility. Replacing the changed workspace gate with its exact base source reproduced the same three failures and three unhandled rejections (6 other cases passed).
- Scoped ESLint and Prettier pass (existing test-ignore/legacy `any` warnings remain); local documentation/image targets and whitespace checks pass.
- Full legacy web typecheck fails in unchanged assistant/cash-management code. Changed host controls have no reported type errors.
- `pnpm arch:check` fails on the unchanged scan of absent `services/worker/src`. No worker was recreated.
- Full-module legacy `tenant-entitlement.int.test.ts` fails during Nest module scanning before its test executes; the same module-scanning and cleanup failures reproduced when all changed API/contracts sources were replaced in-memory by their exact base versions. Targeted persisted controller/use-case suites pass.

## UI/UX evidence

See [App Center evidence](../frontend/app-center.md#surf-12-evidence). Inspected English desktop 1280×800 and phone 390×844. App Center screenshots use synthetic session/API responses; host screenshots render the actual component in an isolated preview. No horizontal overflow; confirmation initially focuses Cancel and Tab reaches Enable. Checked success and dependent conflict feedback. These captures do not establish production hosting or legacy-auth handoff.

## Remaining work

Required hosted CI and human review; no merge or deployment. Host compatibility routing remains the separately tracked rollout gate.

## Review and corrections — November 9

Reviewed PR #419 at `5c64fb8538628ca5236fea28e06198b3dcabb02c` against the verified
`development` base. No external review threads existed. Three concrete findings:

1. **P2 — Stale save callback can strand another tenant's page.** An A save finishing after B loads called A's retained refresh callback, took the newest request ID and replaced `loadedTenantId` with A. The page then stayed on its loading state. Added a committed-tenant guard before starting and completing reads. Regression reproduced the old failure and now passes.
2. **P2 — Default enablement hides missing installation.** The host page read the tenant-less catalog and chose actions only from entitlement defaults. Invoice can be default-enabled with no install, so the page offered Disable rather than a path to install and launch it. The existing host-protected catalog now accepts a validated `forTenantId` target, preserving its previous response when omitted. The UI shows active installation separately and offers Install. Persisted tests prove per-tenant install state and that tenant tokens still receive 403; malformed targets receive 400.
3. **P2 — Specialized tests collected against the wrong app.** The legacy Playwright config selected the three App Center cases for both browsers without starting App Center. Added the same exclusion used by the other focused suites. Before: six incorrectly collected cases; after: zero. The dedicated suite still executes all three.

Fresh review checks:

- Host control and refresh tests: **8 passed**; the two new UI regressions failed before the fixes.
- `SSO_TEST_DATABASE_URL=<disposable local DB> pnpm --dir services/api exec vitest run --config vitest.config.ts src/modules/platform/__tests__/app-management.int.test.ts src/modules/platform/__tests__/list-app-catalog.usecase.spec.ts src/modules/platform/__tests__/app-management-link.spec.ts`: **10 passed** (five persisted HTTP/controller cases and five unit cases).
- Dedicated App Center Playwright suite: **3 passed** in installed Chrome. Legacy `--list`: 588 tests, no App Center specs. Collection alone is not an execution pass for the legacy suite.
- API `tsc --noEmit` and Contracts typecheck: passed. Full legacy web typecheck still fails in unchanged assistant/cash code; no reported errors in the modified host files.
- Updated [visual evidence](../frontend/app-center.md#surf-12-review-corrections) shows the default-enabled installation flow with synthetic data.
- [Hosted run 42643086864](https://github.com/Corely-AI/corely/actions/runs/42643086864) fails unit/quality checks on an ungenerated Prisma client and browser checks on the unchanged missing `e2e:smoke` script. Cash integration passed. These infrastructure failures are separate from the reproduced test-collection finding. No CI workflow was weakened or unrelated missing script added.

No merge, deployment or external review comment was requested or performed. PR remains Draft.

## Second review and corrections — November 9

Reviewed `ecb7948a69de86a568d73d4f71c638bbf9ee3897`. No external inline review
comments existed. Reproduced two further P2 findings:

1. **New dependent apps were not bound to the displayed confirmation.** Opening a Customers disable dialog, enabling another dependent and then confirming disabled the newly added app too. The updated client sends its reviewed `expectedDependents`; the application rechecks that allowlist inside the existing serializable transaction. Additional dependents return 409/current IDs with no disable writes or audit. The refreshed dialog requires another confirmation and resets focus to Cancel. Optional wire fields preserve existing callers that explicitly cascade without a snapshot. The backend guard must be delivered before the updated UI is enabled.
2. **Inactive installation hid the team-disable action.** The preceding Install correction replaced the only action for a default-enabled app without an active install. Operators had to install it before they could disable its team flag. A separate policy-filtered **Disable for team** action now calls the existing disable command directly. Persisted coverage verifies no installation records are created.

Verification for this pass:

- Two new host UI regressions failed before correction; the persisted stale-confirmation case returned 200 instead of expected 409 before correction.
- Host controls and refresh suites: **10 passed**. Includes reviewed ID payloads, expanded confirmation, safe focus, disable without installation and the preceding tenant-response regressions.
- `SSO_TEST_DATABASE_URL=<disposable localhost DB> pnpm --dir services/api exec vitest run --config vitest.config.ts --fileParallelism=false src/modules/platform/__tests__/app-management.int.test.ts src/modules/platform/__tests__/focused-api-access.int.test.ts src/modules/platform/__tests__/tenant-entitlement-gating.spec.ts`: **15 passed**. A prior parallel run timed out at five seconds in the existing unsupported-PDF-denial case (14 others passed); the serial rerun passed without changing assertions, timeouts or skips.
- API `tsc --noEmit`, Contracts and web-shared typechecks passed. Full web typecheck retains the previously documented assistant/cash baseline errors; no changed host-file errors reported.
- [UI evidence](../frontend/app-center.md#team-disablement-and-changed-dependencies) uses synthetic data and the actual host component. Desktop 1280×800 and phone 390×844; before/after independent team disablement and reconfirmation with another dependent; no horizontal overflow.
- No unrelated CI, billing, storage, role, rollout or dependency definitions changed. Existing CI/preview limitations remain; keep the PR Draft.
