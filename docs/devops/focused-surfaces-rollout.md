# Focused surfaces release handoff

[#404](https://github.com/Corely-AI/corely/issues/404), parent [#380](https://github.com/Corely-AI/corely/issues/380). Status on 2026-11-10: **HOLD — preparation only**. No live cohort, hosting cutover or production rollback has been executed. Local rehearsal below does not satisfy pilot acceptance.

## Integration and evidence register

| Gate                      | Reviewable change / observed evidence                                                                                                       | Remaining release condition                                                                                                        |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Legacy Invoice links #396 | [Draft PR #425](https://github.com/Corely-AI/corely/pull/425), code `6dfc8569`; explicit opt-in link and retained legacy routes             | Integrate, rebuild with the approved cohort and verify deployed compatibility                                                      |
| HR #397/#398              | [Draft #423](https://github.com/Corely-AI/corely/pull/423), [privacy #424](https://github.com/Corely-AI/corely/pull/424)                    | Separate HR privacy/browser/UX/observability acceptance; HR remains unreleased                                                     |
| Hosting #399              | Approved application names in [ADR-0003](../decisions/ADR-0003-focused-app-surfaces.md); current bindings are not approved cutover evidence | Authenticated hosting access, exact staging names/API, project bindings, DNS/TLS ownership and deployment evidence                 |
| CI #400                   | [Draft #428](https://github.com/Corely-AI/corely/pull/428) repairs prerequisites and retained test commands                                 | Reconcile existing broad type/architecture baseline failures and obtain exact integrated-source checks                             |
| Multi-origin #401         | [Draft #429](https://github.com/Corely-AI/corely/pull/429); 51 real API checks, local browser evidence and WebKit Origin correction         | Full clean-runner browser gate; intermittent local navigation/session-UI checks and hosted Prisma initialization remain open       |
| UX #402                   | [Draft #426](https://github.com/Corely-AI/corely/pull/426); 21 browser checks with accessibility scans and EN/DE/VI evidence                | Integrate/recheck; native screen-reader and actual staging evidence remain unproven                                                |
| Observability #403        | [Draft #427](https://github.com/Corely-AI/corely/pull/427); bounded diagnostics and offline release report                                  | Actual collector/dashboard, accountable operations owner, measured baseline and approved thresholds                                |
| Pilot decision #404       | This handoff and local flag rehearsal                                                                                                       | Named decision owner, approved workspace cohort, source/artifacts, deployment window, success/rollback criteria and pilot feedback |

PRs remain Draft and unmerged. #424 depends on #423; #429 depends on #428. This handoff's PR is based on #429 for documentation links, not evidence that all sibling changes are integrated. Recheck and retarget each stack after its prerequisite merges. Record an integrated source SHA rather than treating seven branch heads as one release artifact. Keep the parent epic incomplete while either wave lacks acceptance. Conditional Invoice roadmap promotion (including #334) is a separate decision.

## Local flag rollback rehearsal

Fresh execution on 2026-11-10 at #396 branch commit `6dfc8569`, Chromium, Node 22.21.1 / Playwright 1.57:

```sh
pnpm --dir apps/e2e exec playwright test --config playwright.invoice-links.config.ts
```

**2 passed, zero retries**: approved-cohort and rollback projects. Two test-owned Vite servers use the existing configuration with `VITE_CORELY_INVOICE_LINK_MIGRATION=true` and `false`; the cohort is the synthetic `workspace-a`. With the flag enabled, the retained legacy Invoice row renders and an explicit link preserves allowed workspace/list intent while dropping the synthetic token parameter. No automatic navigation occurs. With the flag disabled, the same legacy row renders, no handoff link appears and the launch catalog is not requested. A conflicting workspace removes the handoff. Synthetic API responses isolate the browser exercise; no real business data is changed.

This proves local flag behavior, not a production artifact swap, CDN/DNS rollback, identity recovery or live pilot. Existing #396 [desktop](https://github.com/Corely-AI/corely/blob/396-invoice-link-migration/docs/frontend/images/invoice-links/legacy-invoice-handoff-desktop.png) and [phone](https://github.com/Corely-AI/corely/blob/396-invoice-link-migration/docs/frontend/images/invoice-links/legacy-invoice-handoff-mobile.png) evidence shows the same flow. #401's [sanitized browser evidence](../tasks/401-multi-origin-regressions.md) covers actual host sessions separately.

## Concrete release record to complete at the gate

Record these values together before execution; none are inferred from local configuration:

- Approved first-wave scope: App Center and Invoice; exact pilot workspace IDs, decision owner, approval reference and window.
- Integrated commit, successful check URLs, immutable frontend artifacts and API revision, compatible schema version and previous healthy artifacts.
- Exact production/staging origin-to-project/upstream bindings, trusted ingress authority, callback registrations, preview exclusions, certificate SANs and DNS/certificate-renewal owner.
- Preserve `app.corely.one`'s existing application binding until its explicit cutover decision; record the verified retained legacy destination before moving traffic. `*.corely.one` alone does not cover `invoice.app.corely.one` or `hr.app.corely.one`.
- Measured baseline, collector/dashboard and accountable owner; explicitly chosen error/latency/loop/access-denial thresholds and pilot success/rollback criteria. No numerical thresholds have been approved here.
- Evidence for HTTPS, callback, asset/deep-link refresh, app-origin API forwarding/streaming and unknown-host rejection on each released host, with legacy/public booking/Portal/POS smoke evidence.
- Pilot feedback and actual release/rollback outcomes, with timestamps and sanitized links. HR requires its additional People privacy and #401/#402/#403 reruns before any availability change.

The checked-in Cloud Run workflow targets historical `main` triggers and contains worker/configuration references; verify effective runtime and migration order before using it. Repository metadata exposes existing Vercel legacy projects, not authenticated access or approved new focused/staging bindings. Provider build-rate-limit statuses are not successful previews. No shared database migration is part of the local flag drill.

## Rollback and identity outage procedure

1. On an approved trigger, stop expanding the cohort and capture bounded diagnostics plus current frontend/routing revisions; retain existing business records.
2. Rebuild the legacy web artifact with `VITE_CORELY_INVOICE_LINK_MIGRATION=false` and an empty `VITE_CORELY_INVOICE_LINK_WORKSPACES`. These are build-time values: editing an environment variable without rebuilding does not change the served artifact.
3. Through the verified deployment mechanism, restore the recorded healthy frontend/routing artifacts and exact retained legacy binding. Keep public/customer token journeys on their existing routes; never forward those tokens into staff launch URLs. Do not change unrelated client bindings.
4. Verify the actual served artifact/flags, retained Invoice list/detail/edit/activity, public booking, Portal and affected focused clients. Confirm focused session/API denial checks still reject revoked or foreign-workspace access. Record actual recovery times and remaining limitations.
5. During an identity outage, retain the signed-out/unavailable boundary and manual workflows reachable through their existing authorized client. Restore Identity through its verified recovery procedure, then require fresh verification or sign-in. Never restore revoked session rows, replay old cookies/tokens or weaken CSRF/origin checks to make a UI available. A frontend rollback does not undo domain data or session revocation.

A live rollback is complete only after these checks pass against the actual target and the release record contains evidence. No automatic merge, deployment or legacy-route removal is authorized by this document.
