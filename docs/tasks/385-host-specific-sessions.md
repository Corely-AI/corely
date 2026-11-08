# 385 — Host-specific sessions and shared API transport

## Tracking and outcome

- Issue: [#385](https://github.com/Corely-AI/corely/issues/385), parent [#380](https://github.com/Corely-AI/corely/issues/380).
- Prerequisites: #382 design and #384 central login are closed and integrated in the verified base.
- Branch: `385-host-specific-sessions`; base: `corely/development` at `d3dedf3655` (default branch verified with remote readback).
- PR: pending publication as Draft against `development`.
- Outcome: existing host-bound opaque sessions authenticate allowlisted business routes in the existing shared API; browser JavaScript receives only CSRF/expiry metadata.
- Excludes client migration (#386), versioned context/global logout/cleanup and active-stream revocation (#387), deployment, live routing and new domain owners.

## Reuse and implementation

Reused Identity's central families, hashed app handles, registration/crypto,
account/membership/tenant adapters, existing request-context authorization and
Workspaces policy. No table, migration, external issuer, JWT-returning browser
endpoint or additional business backend was added. See maintained
[behavior and integration contract](../backend/host-sessions.md).

- Added current-session metadata and atomic explicit handle/CSRF rotation.
  Idle renewal checks family/account/password/access on every request; absolute
  expiry is immutable. Rotation audits and its outbox event commit together.
- Added `/api/bff/*` dispatch into the original Express/Nest handlers. A private
  in-process principal reaches the existing AuthGuard; tenant/workspace inputs
  remain revalidated selection hints. Existing operation policies still apply.
- Added exact Origin/CSRF checks, no credentialed CORS, strict route roots,
  header sanitization, body limits and private/no-store responses. Existing
  legacy bearer/public/POS contracts are untouched.
- Preserved JSON/base64 attachment contracts, binary download bytes, query,
  trace/idempotency headers, incremental SSE and cancellation. No automatic
  request replay or session-refresh loop exists.

## Verification

All checks below were run on 2026-11-08. The integration target was a new,
test-owned PostgreSQL 17 cluster on loopback port 55485, database
`corely_384_surf05` (the prerequisite fixture deliberately restricts that prefix).
Schema SQL was generated from the current Prisma schema and applied only there;
background dispatch was disabled, email was fake and fixtures used synthetic data.

| Command / check                                                                                                                                                                | Actual result / limits                                                                                                                                                                                             |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Scoped Vitest command in [host session docs](../backend/host-sessions.md#verification-and-activation), plus `sso-security.spec.ts`, `sso.int.test.ts`, `sso-email.int.test.ts` | **84 passed across six files**, no skips in this execution. Includes real PostgreSQL rotation races, expiry/revocation/access/password rejection, audit rollback and existing login/email regressions.             |
| Existing Invoice and People HTTP controller dispatch                                                                                                                           | Passed with real session/account/context adapters and substituted business use cases; not live business-domain persistence acceptance.                                                                             |
| Transfer probes                                                                                                                                                                | Passed JSON/base64 upload, byte-exact binary download, query/idempotency/trace preservation, SSE first event before completion, completed stream and cancellation. Declared and chunked oversized JSON return 413. |
| `pnpm --filter @corely/api typecheck`                                                                                                                                          | Passed.                                                                                                                                                                                                            |
| `pnpm --filter @corely/contracts typecheck`                                                                                                                                    | Passed.                                                                                                                                                                                                            |
| `pnpm --filter @corely/api build`                                                                                                                                              | Passed with decorator metadata preserved.                                                                                                                                                                          |
| Targeted ESLint on changed production TypeScript                                                                                                                               | Passed, zero errors; two existing `any` warnings in unchanged legacy body-parser callbacks in `main.ts`. Test files are excluded by repository ESLint configuration.                                               |
| `pnpm arch:check`                                                                                                                                                              | Stops on the pre-existing absent `services/worker/src` scan; no checker or runtime infrastructure rewrite included.                                                                                                |
| Root `pnpm test:unit` with the pre-push hook's test environment                                                                                                                | **1,282 passed, seven existing skips across 297 files**.                                                                                                                                                           |
| Changed-file Prettier, local documentation links, diff whitespace and staged line limits                                                                                       | Passed on changed files; six new/updated task/behavior local references resolve.                                                                                                                                   |
| UI/browser screenshots                                                                                                                                                         | N/A: backend transport/contracts/docs only; no rendered client is changed.                                                                                                                                         |
| Shared/live database, real mail, deployed hosts, migration or rollout                                                                                                          | Not run or changed.                                                                                                                                                                                                |

Initial fixture setup failed because Prisma environment logging polluted stdout
SQL; regenerating via Prisma's `--output` produced clean schema SQL. A new
size-limit regression caught a premature early response causing a client reset;
letting the bounded parser drain/handle the request fixed both declared-length
and chunked cases. The final six-suite run above passed after those corrections.

## Impact and remaining work

The existing SSO flag remains off by default. Ingress uses the same registered
origins/private assertion contract; live bindings require separate authorization
and verification. There are no dependency, migration or environment-key changes.
Do not interpret test-controller substitution or a Draft PR as deployed app
acceptance, security certification or a full audit of existing owner permissions.

Rotation is explicitly coordinated by a client; losing its response requires
reauthentication. This slice checks expiry/revocation at request admission;
terminating admitted streams on revocation remains #387. Per-request context
hints are not persisted context-switch/version semantics. Shared client adoption
and cache isolation remain #386. Unsupported raw/multipart upload contracts return
415; existing JSON/base64 uploads have a 16 MiB transport limit.

Rollback disables new reserved routing/SSO and requires legacy reauthentication;
it does not restore rotated or revoked handles. Keep the PR Draft through human
review and required checks. No merge or deployment is authorized by this delivery.
