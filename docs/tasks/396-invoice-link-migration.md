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

## Inline review fix — 2026-11-10

Addressed `discussion_r4522617267`: the general browser and API configurations exclude `invoice-links`; its cohort/rollback projects and servers remain in the dedicated config. The shared isolation regression checks all relevant directories present in each independent branch using Playwright's actual file matcher and verifies legacy specs remain selectable. It failed on the original configuration and passed after the fix.

Fresh checks: isolation regression **1 passed**; both general collection probes select **0 migration tests**; dedicated cohort/rollback browser suite **2 passed**, zero retries. Scoped ESLint, installed Prettier and whitespace checks passed. Self-review checked both collectors, retained legacy selection and unchanged dedicated server/flag setup. No product UI or business behavior changed; existing visual evidence remains applicable. The documented unrelated broad pre-push bypass is retained; signed pre-commit checks run normally.
