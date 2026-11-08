# #381 — Focused-surface ADR and backlog reconciliation

## Tracking and outcome

- Issue: [SURF-01 / #381](https://github.com/Corely-AI/corely/issues/381).
- Parent: [EP-APP-SURFACES / #380](https://github.com/Corely-AI/corely/issues/380);
  no hard task dependencies.
- Branch: `381-focused-surface-adr`; intended PR base: `development` on `corely`.
- Inspected/fetched base: `3a3492196497d38da088b5222b96cd42bd01ad21`.
- Worktree: `/private/tmp/corely-381-worktree`, isolated after concurrent #382
  work switched the shared checkout. Only this ticket's changes were moved;
  the other branch's commits/content were preserved.
- Original PR: [Merged #406](https://github.com/Corely-AI/corely/pull/406), targeting
  `development`. Approval follow-up: [Draft #407](https://github.com/Corely-AI/corely/pull/407).
- Outcome: [ADR-0003](../decisions/ADR-0003-focused-app-surfaces.md) and
  [source/host/backlog inventory](../architecture/focused-app-surfaces-inventory.md).
- Acceptance: architecture/reuse inventory merged in #406. The maintainer
  [approved the host plan](https://github.com/Corely-AI/corely/issues/381#issuecomment-6724086565)
  on 2026-11-08 and explicitly instructed alignment of both ADRs and closure.
  Runtime implementation/registration evidence remains in follow-on tickets.
- Exclusions: runtime implementation, provider/DNS/auth/database changes,
  deployment, billing-roadmap promotion and changes to existing issue scopes.

## Reuse and plan

Preserve Invoices (`invoices`) and People (`people`), the modular API, shared public
UI/feature/provider packages and existing manifest/enablement/permission controls.
Reconcile the 15 Platform/People/Invoices issues and their seven merged closing
PRs with code in the base. Map all 24 SURF tasks without creating more tickets.
Propose App Center + Invoice first and HR second; keep the operational OpenBuk
pilot and conditional invoice business expansion independent.

Record existing host responses and historical deployment records separately from
unverified provider bindings. Draft exact application callbacks and a compatibility
route/alias plan; keep the old `app.corely.one` binding until approved activation.
Leave issuer/session design with #382 and domain activation with later tickets.

## Verification

| Command or manual check                                                                   | Result and limits                                                                                                                                                              |
| ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `git fetch corely`; `gh repo view Corely-AI/corely --json nameWithOwner,defaultBranchRef` | Default is `development`; local/base both at the inspected SHA; initial tree clean.                                                                                            |
| GitHub GraphQL read of #282/#283/#295/#301–308/#353–356 and closing PRs                   | 15 issues reconciled; all seven merged closing PR commits verified in the inspected base using git merge-base --is-ancestor. No issue comments returned.                       |
| GitHub deployments/statuses read                                                          | First 100 records; latest listed status for seven environment names. Historical successful records do not establish current bindings or the inspected code deployed.           |
| Vercel read-only project/team inventory                                                   | Available team context exposes no Corely projects; authoritative hosting scope/bindings not obtained. No account/project settings changed.                                     |
| Public DNS and root HTTPS observations                                                    | Eight relevant hosts checked without auth/redirect following; app/portal/CRM/POS respond; Invoice/HR TLS EOF; login 404; API root timeout. No functional readiness conclusion. |
| Installed Prettier 3.3.3 on the five changed Markdown files                               | Passed write/check using the existing gateway installation; no tools installed. Repeated in isolated worktree before publication.                                              |
| Targeted local links/anchors, all 24 SURF keys and 15 related issue links                 | Passed; 45 new local targets checked. Repeated in isolated worktree before publication.                                                                                        |
| git diff --check and staged whitespace                                                    | Passed before publication.                                                                                                                                                     |
| Application unit/integration/E2E, live auth and release tests                             | Not run: documentation-only scope. No migrations or deployment executed.                                                                                                       |

## UI/UX evidence

Not applicable: only architecture/inventory/index documentation changes. No UI,
routes or interactions are implemented by this PR; later surface tickets own
rendered screenshots/recordings and interaction evidence.

## Impact and remaining work

The maintainer's [host-plan approval](https://github.com/Corely-AI/corely/issues/381#issuecomment-6724086565)
selects `app.corely.one`, `invoice.app.corely.one` and `hr.app.corely.one` and
withdraws the alternative names from #405. The corresponding callback/logout
matrix and gated legacy-traffic treatment are recorded in both ADRs. Closure of
#381 is explicitly authorized; no SSO provider/protocol decision, separate
specialist/GitHub review, deployment or runtime readiness is inferred.

This approval follow-up uses `381-record-approved-hosts` from the merged #406
base, isolated from concurrent #382 edits. It changes documentation only and is
published as a linked Draft PR; no automatic merge is performed. Authoritative
bindings, TLS, registrations and rollout evidence remain follow-on work.
