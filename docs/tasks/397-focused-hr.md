# 397 — Focused HR composition

- Issue: [SURF-16 #397](https://github.com/Corely-AI/corely/issues/397), parent #380.
- Branch: `397-focused-hr`; base `origin/development` at `05489029`.
- Prerequisites #386/#389/#390/#391 verified Done. Existing #305/#306/#307/#308
  screens and owning People application behavior reused; no domain expansion.
- PR: pending publication.

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
