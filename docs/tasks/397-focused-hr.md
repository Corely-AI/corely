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
