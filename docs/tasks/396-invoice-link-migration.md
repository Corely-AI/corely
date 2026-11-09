# 396 — Legacy Invoice link migration

- Issue: [SURF-15 #396](https://github.com/Corely-AI/corely/issues/396), parent #380.
- Branch `396-invoice-link-migration`; PR base `origin/development` at `8768b5e94`.
- #383/#390/#394 Done; #395's supporting-flow PR #422 is now integrated. Its
  remaining settings setup gap is preserved and does not require a new URL/API.
- Draft PR: [#425](https://github.com/Corely-AI/corely/pull/425).

[Producer inventory, configuration, map and evidence](../frontend/invoice-link-migration.md).
Only the actual administration Invoice routes mount an explicit handoff; the
legacy UI and all other clients remain available. The server-authorized catalog
supplies the destination, the current validated workspace is pinned, supported
list state is allowlisted and sensitive/redirect parameters are stripped.

Self-review traced route producers, email/public versus staff URLs, callback
restoration, cohort rollback and legacy consumers. It found that the root example
flags needed explicit web build consumption; Vite now injects just those public
flags from its existing root environment loader. No production settings changed.

Actual checks: 34 link/workspace unit tests (18 new mapping tests); 3 persisted central login round trips; 2 actual
legacy web browser runs (cohort enabled and rollback disabled) passed. Shared
package typecheck passed. Web production build and scoped lint passed (existing chunk warnings).
Web typecheck retains existing errors in unchanged platform tests and shared
Assistant/Cash/CustomerSelection files. No broad root or deployed pass claimed.

Synthetic EN desktop/phone screenshots inspected; link remains an explicit user
action. Tests use mocked legacy browser APIs separately from a disposable SSO DB
in task-owned `corely-397-verification`, `corely_384_hr397` on loopback port 57080.
No actual messages, production data, migration, permanent redirect, merge or release.
