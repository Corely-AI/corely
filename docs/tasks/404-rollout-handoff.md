# #404 — Gated rollout handoff and local rollback rehearsal

- Issue: [#404](https://github.com/Corely-AI/corely/issues/404); parent #380.
- Branch: `404-rollout-handoff`; intended base `401-multi-origin-regressions` at `4f26a01d` (Draft #429). Production/integration branch remains `development`.
- Scope delivered: [release evidence register, explicit hold conditions and rollback procedure](../devops/focused-surfaces-rollout.md). This is a preparation slice; #404 stays incomplete.
- Existing owner reused: #396's unchanged migration boundary and browser configuration. Fresh local rehearsal at `6dfc8569`: **2/2 passed**, Chromium, zero retries, cohort on/off with synthetic API responses. No deployment or shared-data mutation.
- Review corrections: distinguish build-time flags from runtime toggles; require exact integrated artifacts instead of combining sibling PR evidence; preserve revoked sessions during identity recovery; separate a local flag exercise from a live rollback; leave HR and broader Invoice roadmap promotion independently gated.
- Prose checks: installed Prettier, relative links and whitespace. No new application tests were written for documentation; the meaningful existing rollback browser check was executed.
- UI/UX: this PR changes documentation only. Existing #396 desktop/phone and #401 synthetic browser evidence is linked in the handoff.
- Outstanding: authenticated hosting/project/staging bindings (#399), integrated checks and #401's clean-runner gate, real monitoring owner/baselines (#403), approved cohort/decision owner, actual pilot and live rollback outcomes. No approval, owner or release result is fabricated.

- Draft PR: [#430](https://github.com/Corely-AI/corely/pull/430). Read-only approved-host HEAD observations are recorded in the handoff; they do not prove callback/API delivery. The owned disposable PostgreSQL container was removed after local verification; two interrupted private fixture directories remain because automatic approval review rejected deletion.
