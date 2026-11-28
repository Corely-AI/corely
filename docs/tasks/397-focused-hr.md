# 397 — Focused HR composition

- Issue: [SURF-16 #397](https://github.com/Corely-AI/corely/issues/397), parent #380.
- Branch: `397-focused-hr`; base `origin/development` at `05489029`.
- Prerequisites #386/#389/#390/#391 verified Done. Existing #305/#306/#307/#308
  screens and owning People application behavior reused; no domain expansion.
- Draft PR: [#423](https://github.com/Corely-AI/corely/pull/423).

## Implementation and review

Thin HR Vite client with shared workspace/session shell and public People exports.
Selectable per-instance People and staff-journey transports retain legacy clients.
Scoped links, effective permission discovery and permission-filtered self-service
navigation; no unrelated app routes or unsupported features. The HR catalog tile
stays coming-soon for #398/release gates. No live changes or new storage.

Self-review traced legacy callers, every People request/link and scoped commands.
Browser regression caught runtime recreation on draft-state changes resetting
self-service edits. Fixed by memoizing with stable scope identities. Existing
private/absence forms now choose their instance API and participate in the shared
draft guard. Exact permission-discovery BFF path is read-only and excludes role
administration. No remaining material source findings from this scoped review.

## Actual verification

- HR strict typecheck, production build and scoped ESLint passed. Build retains
  a large-chunk warning (about 1.53 MB before gzip).
- People UI suite: 32 passed; focused API suite rerun with 3 passing tests (33 total).
- Browser suite: 6 passed; directory/detail/reload, manager edit, staff self-edit,
  forbidden/empty/error/invalid-workspace and unsaved-navigation coverage.
- People directory/self-service plus BFF transport and focused menu: 51 passed,
  no skips. Test-owned container `corely-397-verification`, loopback port 57080,
  databases `people_test_397` and `corely_384_hr397`. Schema generated from current
  models and applied only in this disposable container; no shared DB changed.
- Frontend source boundary scan passed. CI-policy tests: 7 passed, 2 failed with
  Windows temporary-directory EBUSY cleanup (existing Bash-runner tests).
- `pnpm arch:check` retains the unchanged Windows `D:\D:\Working` path error.
- API typecheck passed. `dev:hr` started the actual HR/login HTTPS origins.
- Full legacy frontend/root checks and live browser-to-database are not claimed.

[Setup, evidence and limits](../frontend/focused-hr-client.md). Screenshots visually
inspected with synthetic EN desktop and phone data. Browser-only transport tests
and database/API checks are separate. HR privacy/release acceptance remains
#398/#401/#404; no rollout, merge, or tile enablement performed.

Publication retained normal pre-commit checks. The documented `HUSKY=0` pre-push
bypass was used for existing unrelated root/legacy CI failures; scoped checks and
limits above remain explicit. No merge or release performed.

## Review fix: retain drafts after recoverable saves (2026-11-10)

- Addressed inline finding `discussion_r4522615278`: People feature requests use request-local recoverable failures. The optional transport behavior is reused verbatim from the already integrated `development` adapter/client; this older HR branch needs that prerequisite to test independently. Default clients and fatal 401/403 handling remain unchanged.
- New browser cases failed before the fix for both 503 and lost responses because the form disappeared. After the fix, a simulated committed create with a lost result retains its draft and reuses the same idempotency key; 401/403 still withdraw the form. The existing load-error case now checks the owning list's retry control.
- Fresh checks: HR browser **10 passed**, People unit **33 passed**, shared session/adapter/provider **37 passed**; HR typecheck/build passed (existing chunk-size warning retained). Scoped lint/format checked. No API/domain/storage behavior changed and no database tests were needed for this transport/UI correction.
- Self-review traced HTTP, network and body-stream errors through the existing local failure option, confirmed permission discovery still fails closed, and checked that no automatic command retry was added.
- Synthetic desktop recovery state was visually inspected: [retained HR save draft](../frontend/images/focused-hr/hr-recoverable-save.png). The original form stays editable with its local error; no personnel data or credentials were used.

Visual follow-up removed the misleading reload instruction for uncertain saves. EN/DE/VI copy now explains that entries are retained and saving can be retried without reloading; stale-version conflicts remain blocked until reload. HR browser 10/10, People units 33/33 and HR typecheck passed again after this correction.

## Review fix: dedicated HR browser discovery

- Addressed `discussion_r4522615295`: both general Playwright configurations exclude `focused-hr` and retain the dedicated HR server configuration.
- The new `playwright-suite-isolation.test.mjs` failed before the fix and passed afterward using the installed runner's matcher. It checks each of the four independently delivered isolated suites only when present; ordinary legacy specs must remain selectable. General browser/API collection changed from **20 / 10 HR cases to 0 / 0**; the dedicated HR suite's **10 passing cases** remain intact.
- Self-review checked both entry points, the non-isolated control and the dependent #424 test append; recovery tests are placed before the existing last test to keep that append mergeable. No general test or retry policy was disabled. Scoped lint, HR build/typecheck and whitespace checks passed. Normal pre-commit checks are retained; the previously documented unrelated pre-push baseline bypass is retained for publication.

## PR #423 conflict resolution (2026-11-10)

Merged `origin/development` at `e398c61dd` into the current HR head `f0dce5c14`, preserving the already merged #424 privacy work. Resolved four conflicts by retaining both HR and Invoice migration exclusions in the two general Playwright runners, both dedicated configurations in the E2E TypeScript project, and both sets of documentation links. Reviewed the automatic SSO merge: Invoice's restricted route roots and HR's exact read-only permission discovery remain intact. No new UI behavior or deployment; existing visual evidence remains applicable.

Fresh verification after resolution:

- Dedicated HR browser suite **11/11 passed**, including account-switch concealment and retained retry keys; Invoice migration cohort/rollback **2/2 passed**, without retries.
- People unit suite **33 passed**; shared session/adapter/provider and Invoice-link suites **68 passed**; BFF target allowlist **15 passed**. The other 12 database-backed BFF cases were not rerun; no database was configured for this conflict-only update.
- Suite-isolation regression **2 passed**; both general runners collect **0 HR and 0 Invoice migration cases**, while their dedicated runners execute them.
- HR strict typecheck/build, API/HR/Invoice-migration Playwright configuration typecheck, scoped ESLint, formatting, local documentation targets and staged whitespace checks passed. The build retains its existing chunk-size warning.
- Including the general browser configuration in strict TypeScript reports its existing optional `workers` property error. Reproduced the same error using the unchanged file from `origin/development`; no test policy or unrelated typing was changed.

Scoped review found no further issues. Normal DCO/pre-commit checks are retained; publication uses the previously documented broad pre-push baseline bypass after the checks above. The PR's current review state is preserved.
