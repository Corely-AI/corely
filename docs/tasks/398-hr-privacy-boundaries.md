# 398 — Focused HR privacy boundaries

- Issue: [SURF-17 #398](https://github.com/Corely-AI/corely/issues/398), parent #380.
- Branch: `398-hr-privacy-boundaries`; temporary PR base `397-focused-hr` at
  `ee6825f0` (Draft #423, prerequisite #397). Retarget/recheck against development
  after #423 integrates. This PR's diff excludes the prerequisite client work.
- Other dependencies #387/#388 are Done. No changes to related #302/#305–308 state.
- Draft PR: [#424](https://github.com/Corely-AI/corely/pull/424).

[Coverage, policy and reproducible evidence](../backend/hr-privacy-verification.md).

Added six persisted host-session privacy checks with real People owners and one
browser account-switch regression. Existing test fixture optionally installs the
actual session middleware before application routes; ordinary tests retain their
existing setup. No production behavior, permissions, tile flags, schema or live
configuration is changed.

Actual API/unit verification: 108 passed across 14 files, no skips. Uses only the
existing task-owned local PostgreSQL container and disposable People/SSO databases.
Full HR browser suite: 7 passed, including account-switch concealment.
API/HR typechecks and scoped lint passed (existing unused fixture-field warnings; integration specs follow the configured lint ignore). Existing Windows root
architecture/CI-runner limits remain recorded in #397; no broad root pass claimed.

Self-review: no material findings. Positive manager/neutral controls ensure denied
checks are meaningful, and private repository reads are asserted absent on denied
requests. Request sessions are synthetic fixtures, not real sign-in acceptance.
Test-only/API/documentation delta: UI/UX evidence N/A; HR screenshots remain #423.
HR tile stays coming-soon and no merge/deploy is performed.

Normal pre-commit checks passed. Publication uses the documented pre-push bypass
for unrelated root/legacy failures recorded in #397; required CI remains pending.
