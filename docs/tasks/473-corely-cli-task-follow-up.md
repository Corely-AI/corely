# 473 Corely CLI internal task follow-up

- Issue [#473](https://github.com/Corely-AI/corely/issues/473), epic [#468](https://github.com/Corely-AI/corely/issues/468).
- Branch `473-corely-cli-task-follow-up` is stacked on `470-corely-cli-day-brief` ([PR #477](https://github.com/Corely-AI/corely/pull/477), base commit `b3350d3c`). Retarget to `development` and verify the incremental diff and checks after the prerequisites integrate.
- Managers and scoped agents can find eligible staff and create one assigned, dated internal follow-up. Tasks validates permission and active ownership. Replays return the same task, and Daily Work can open its exact record.

## Verification and evidence

- API build and typecheck, CLI build and typecheck, Backoffice typecheck, and Contracts build passed.
- Sixteen tests passed across CLI grants HTTP integration with PostgreSQL, employee Tasks, and the daily brief. The CLI integration covers a lost response, a same-key replay and conflict, and one task, audit entry, and outbox event. It exercises denied, revoked, expired, disabled, and cross-workspace access.
- Seven Daily Work component tests passed. Chromium at 1180 × 730 verified the direct task view and the return to the full list.
- [Windows CLI output](473-assets/cli-follow-up.png) captures a real CLI retry against a local HTTPS fixture backed by PostgreSQL. [Daily Work](473-assets/daily-work-linked-task.png) renders the corresponding synthetic record in the Backoffice component through Vite. The browser fixture uses English and Europe/Berlin.
