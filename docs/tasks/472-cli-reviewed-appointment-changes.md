# 472 Propose and apply an approved appointment change from the CLI

- Issue [#472](https://github.com/Corely-AI/corely/issues/472), epic [#468](https://github.com/Corely-AI/corely/issues/468).
- Branch `472-cli-reviewed-appointment-changes` combines [#478](https://github.com/Corely-AI/corely/pull/478) at `7db9c59e` and [#483](https://github.com/Corely-AI/corely/pull/483) at `a136cb81`. The scope-specific diff starts at their local merge `8b3e4451`. Retarget and recheck after both parent stacks integrate.
- Adds `appointments propose`, `appointments status` and `appointments apply` with separate grants and matching generic agent commands. Browser approval uses the shared workspace review. Agent authentication, audit and domain apply share the grant transaction.

## Verification

- Contracts build, API typecheck, CLI build and typecheck passed.
- Five PostgreSQL tests across Identity, Approvals and Booking passed. They cover separate grants, cross-workspace denial, disabled Booking, exact human approval, stale/expired/rejected statuses, a competing booking, rollback, and replay.
- [Windows CLI output](472-assets/appointment-cli.png) captures the built CLI over a local HTTPS fixture with synthetic data and an OS keyring credential. Checked pending and applied output, the generic apply alias and repeat apply with JSON.
- [Browser review](330-assets/appointment-review-desktop.png) was checked in the prerequisite with keyboard approval. The two surfaces use the same review URL contract.
