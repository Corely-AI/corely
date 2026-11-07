# #304 — Resumable pilot setup and staff invitations

## Tracking and outcome

- Issue: https://github.com/Corely-AI/corely/issues/304; parent #282.
- Prerequisites #299, #301 and #302 are closed/completed and integrated.
- Branch: `304-resumable-pilot-setup`; base: `development` at `dac9007605`.
- PR: pending creation.
- Outcome: resume the first workspace's private settings, explicitly publish validated availability,
  and associate invited staff accounts without duplicate identities or memberships.
- Excludes employee/resource linking, multiple-location scheduling, email delivery, imports,
  finance/AI activation, migrations and deployment.

## Reuse and implementation

Reuse OpenBuk `/app/settings`, Booking setup/contracts and Booking-owned extension storage;
Workspaces legal entities/workspaces/memberships/invites and authorization; Identity users,
tenant memberships and system roles. No new domain records or schema are introduced.

- Workspaces creates/retrieves the first workspace under a transaction advisory lock. Creation
  includes its legal entity, owner membership, audit and event; a lost response is recoverable.
- Booking stores incomplete setup in its own `ext.kv` checkpoint. Saved locale, IANA timezone and
  location values reload; drafts never change live availability. Unsaved edits are not autosaved.
- Explicit publication validates complete settings, updates Booking records and calls Workspaces'
  public publication interface in the same transaction, with audit/outbox. Retried configuration
  retains service/resource IDs; only a publication transition emits its publication event.
- Member invitations use existing `WorkspaceInvite` storage. Pending retries normalize email and
  return the same seven-day private link. Identity validates the authenticated recipient and
  reuses/creates tenant membership through its own adapter, retaining existing roles. Workspaces
  retains existing active membership roles; acceptance replays do not restore revoked membership.
- The legacy generic workspace publication path now checks owner/admin authority before response
  cache replay and in the application layer. Member listings no longer expose invitation tokens
  to ordinary members. Existing generic invitation wire schemas remain unchanged; additive pilot
  endpoints do not activate the administration client's generic “send invite” screen.
- EN/DE/VI setup and invitation copy explains private saving, manual link sharing, no email, and
  the absence of employee self-service. Account, employee and bookable resource identities remain
  distinct. Manual setup requires neither AI nor finance activation.

Canonical behavior, route ownership and limits: [pilot setup](../platform/pilot-setup.md).
Concurrent People work in the primary checkout was excluded by moving this delivery into its
own worktree at `/Users/hadoan/Documents/GitHub/worktrees/corely-304-pilot-setup`.

## Verification

Verified 7 November 2026 on the ticket branch. All following results are fresh:

| Command or check                                                                                                                                                                            | Result and limits                                                                                                                                                                                                                                                                                                                                                                                      |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `DATABASE_URL="$OPENBUK_TEST_DATABASE_URL" pnpm --dir services/api exec vitest run --config vitest.openbuk.config.ts --maxWorkers=1 --minWorkers=1`                                         | 29 tests across four files passed, zero skips: 8 pilot SQL scenarios, 7 existing Booking SQL scenarios, 8 availability cases, 6 workspace-policy cases.                                                                                                                                                                                                                                                |
| `OPENBUK_BASE_URL=http://127.0.0.1:8094 OPENBUK_BROWSER_CHANNEL=chrome pnpm --dir apps/e2e exec playwright test --config playwright.openbuk.config.ts` with `OPENBUK_TEST_DATABASE_URL` set | Both real-API browser scenarios passed. Existing signup → anonymous EN/DE/VI booking → studio persistence; new invalid timezone/client+server, incomplete private checkpoint, reload/retry, explicit publication, invitation/account replay, token privacy and member denial including owner-cache replay. One aborted draft request tests error/retry UX; auth, persistence and publication are real. |
| `pnpm --filter @corely/api typecheck`; `pnpm --filter @corely/openbuk-web typecheck`; `pnpm --filter @corely/contracts typecheck`                                                           | Passed in the isolated checkout.                                                                                                                                                                                                                                                                                                                                                                       |
| `pnpm --filter @corely/api build`; `pnpm --filter @corely/openbuk-web build`; `pnpm --filter @corely/contracts build`                                                                       | Passed.                                                                                                                                                                                                                                                                                                                                                                                                |
| Changed-source ESLint                                                                                                                                                                       | Zero errors; pre-existing warnings in legacy controller/update code and non-null assertions. Repository policy excludes test files from lint.                                                                                                                                                                                                                                                          |
| `NODE_OPTIONS=--max-old-space-size=12288 pnpm exec eslint . --cache`                                                                                                                        | Stopped after about 10 minutes at roughly 13 GB physical memory (measured on the process); no full-lint pass. Direct checks reproduce the unchanged `apps/website-runtime/next-env.d.ts:3` triple-slash-reference error. Its source and root ESLint configuration match the base.                                                                                                                      |
| `pnpm arch:check`                                                                                                                                                                           | Stops before assertions at the unchanged missing `services/worker/src` path. Checker/source match the base; no architecture-pass claim.                                                                                                                                                                                                                                                                |
| Installed Prettier, local documentation paths and `git diff --check`                                                                                                                        | Passed; 111 local link targets checked.                                                                                                                                                                                                                                                                                                                                                                |

Test environment: a newly initialized local PostgreSQL instance on port 55434, exclusively
`openbuk_test_304`, prepared using Prisma's schema-to-SQL diff from empty and `psql` (no schema
push or shared-database reset). API port 3040 and OpenBuk port 8094 used that database.
`OUTBOX_DISPATCH_DRIVER=disabled`, `JOB_SCHEDULER_DRIVER=noop` and
`WORKER_DISABLE_POLLING=true`; test-only provider placeholders, no real outbound delivery.
A non-watching API build was used for final browser acceptance to avoid development restarts.
Package dependencies were reused locally; changed contracts were built in this worktree.

Earlier runs found and corrected the first-created-workspace UI permission state, stale draft
selection after publication, and invitation success state after clearing the sign-in round-trip
token; tests now cover those behaviors. The initial primary-checkout typecheck hit
concurrent unrelated People work; that is excluded from the passing isolated result. Browser test
selectors and a transient API watcher restart were corrected before final acceptance.

Cleanup: stopped this task's API (3040), frontend (8094) and dedicated PostgreSQL (55434),
and removed the dedicated temporary database directory after final acceptance.
No existing server, database, provider, user account or primary-checkout changes were reset.

## UI/UX evidence

Rendered desktop and phone screenshots were inspected. The current route uses native labels,
47px inputs and wrapping action buttons. The browser suite verifies keyboard focus, invalid
input feedback, a dropped request preserving progress, retry success, saved reload values,
private guest denial, publication success and member access explanation. Manual inspection
also checked the German setup copy and private save feedback. EN UI with VI booking locale and
existing guest EN/DE/VI switching are exercised by browser acceptance; this is not a full
accessibility audit of every locale/state.

Synthetic, token-free evidence in the [canonical guide](../platform/pilot-setup.md#verification-and-interface-evidence):
390 × 844 private draft, 1440 × 1000 owner settings/empty invitation form, its isolated form
capture, and member denial.
Full-page captures extend vertically beyond their named viewports. No tokens, traces or customer
data are committed. Keep the PR Draft pending normal checks and human review.

## Impact and remaining work

No migration, new dependency, service, app activation, deployment or customer-data import.
Pending invitation secrets retain the existing `WorkspaceInvite.token` storage convention;
only owners/admins can retrieve them. Offboarding, privileged role administration, employee
self-service, resource association, notification delivery and real pilot cutover remain outside
this slice. No production-readiness or customer-adoption claim.

Publication uses `HUSKY=0`: full-root lint cannot pass the reproduced baseline error.
Husky shims are absent in this isolated checkout, so the equivalent staged checks were run
explicitly: `NODE_OPTIONS=--max-old-space-size=12288 pnpm exec lint-staged --diff HEAD^
--concurrent false` passed without modifications, and the staged line-limit/whitespace checks
passed. Full-root tests, the broad pre-push pipeline and hosted CI are not claimed.
