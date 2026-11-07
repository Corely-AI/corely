# Corely — populate GitHub Project #1 with the complete P1/P2 backlog

**Target repository:** `Corely-AI/corely`\
**Target project:** `https://github.com/orgs/Corely-AI/projects/1`\
**Prepared:** 7 November 2026\
**Planning namespace:** `corely-internal-ops-v1`

## Task to execute

Act as Corely's senior product architect and GitHub backlog maintainer. Inspect the current repository and project, then create or reconcile the epics and feature issues specified in this document. Add the resulting repository issues to the existing organization Project #1 and connect their hierarchy and dependencies.

This is a **backlog-population task**, not an implementation task. Execute the issue/project changes when authenticated permissions allow them; do not stop after explaining a plan. Do not implement apps, change runtime code, run migrations, deploy, commit or push. Local planning artifacts may be generated without committing them.

Use all ticket specifications below. The baseline is **17 logical epics + 68 logical features = 85 backlog entries**: P1 has 9 epics/38 features; P2 has 8 epics/30 features. These counts are coverage targets, not a quota of new issues. Reuse or map already completed work with evidence; create only the missing or meaningfully changed scope. Do not create empty placeholders or duplicate issues just to reach 85.

A read-only discovery and proposed-change summary must precede writes. Then proceed in the same run without asking for routine confirmation. Stop remote writes only for access/security blockers or genuinely ambiguous existing-issue ownership; finish the local manifest and report the exact limitation. Never claim created tickets unless their URLs and project membership were read back.

## 1. Research basis and limits

The app names, catalog IDs and P1/P2 assignments come from the supplied **Corely App Catalog & Recommendations**. The later strategy discussion narrows launch to one package with Schedule, Team and Daily work experiences, not five independent finished products. The supplied **Corely Documentation Alignment Prompt** defines repository reuse and architecture constraints.

The decomposition into epics, feature boundaries, tests and dependencies here is a **proposed engineering backlog derived from that direction**. It is not evidence of approved requirements, validated customer demand or missing implementation. Reconcile each ticket against current code and issues before publishing it. Keep present behavior, target behavior and assumptions separate.

P1 means **focused launch scope**. P2 means **conditional next expansion**. They are the catalog's delivery priorities, not an automatically interchangeable GitHub incident-urgency scale, sprint name or fixed deadline. Preserve any established project priority conventions.

| Scope | Catalog apps                                                                                       |
| ----- | -------------------------------------------------------------------------------------------------- |
| P1    | #01 Tasks, #02 People, #03 Appointments, #04 Requests, #05 Knowledge                               |
| P2    | #11 Shifts, #12 Time, #16 Expenses, #18 Assets, #21 Helpdesk, #26 Invoices, #27 Bills, #28 Budgets |

Shared P1 work covers product/reuse decisions, platform integration, controlled cross-app AI and release readiness. It is not four extra commercial apps.

Do not add new P3/P4 app epics. In particular, no full Accounting, Financing, payroll, recruiting, customer marketplace, generic workflow designer, advanced analytics or payment-processing build. Existing relevant implementations remain supported and reusable. Time is integration-first. Invoices is build-or-integrate by pilot need. Budgets requires reliable transaction sources. P2 **ticket creation is authorized now; implementation remains conditional**.

Germany-first beauty/wellness teams, team size, willingness to switch, pricing and product-market fit remain hypotheses. Do not invent interviews, deadlines, validation, regulatory compliance or competitor shortcomings.

## 2. Inspect before proposing changes

Read the applicable root/nested `AGENTS.md`, contributor guidance, current canonical product docs and actual code. Reverify default branch; the earlier inspection used `development`, but do not switch branches or assume `main`.

Inspect at least:

- Root `AGENTS.md`, `README.md`, package/workspace scripts and documentation index.
- Architecture/boundary/persistence and AI guidance, plus the active frontend standards.
- Current product strategy/catalog/launch/alignment documents where present.
- `docs/products/openbuk/README.md` and the actual Booking/OpenBuk code/tests.
- Existing app manifests, tenant enablement, workspace capabilities, permissions, menu composition and subscription billing.
- Relevant contracts, owning use cases, database models, routes and tests for every in-scope app.
- All repository issues (open **and closed**), their relevant comments/sub-issues, linked PRs and project items/drafts, including archived items where accessible.

Record inspected branch/commit/date. Evidence paths in tickets must exist; proposed future paths must be labeled proposed. A module import, UI stub, manifest or historic passing-test note does not establish end-to-end readiness.

### Concrete leads to reverify

1. Issue `https://github.com/Corely-AI/corely/issues/130` was observed as **“EPIC: Knowledge module (Articles + FAQ + Glossary) - backend, admin, public”**, with P0 in its body. Do not silently rewrite its scope or downgrade it. Compare overlap with the narrow private-policy Knowledge slice; reuse truly matching work or relate a distinct private-policy epic. Public publication must not become a default for internal policies.
2. The OpenBuk document describes an initial implemented Booking slice and remaining release gates, including multiple staff/service capabilities, full lifecycle/agenda, secure management tokens, notification consumers and distributed public abuse protection. Recheck actual current implementation. Existing public booking and EN/DE/VI behavior must not be removed or called wholly future work.
3. The same document describes API-hosted background execution and warns of a historical architecture-check issue involving a removed worker path. Do not resurrect `services/worker` or repeat an old failure/pass as a fresh test result.
4. Existing accounting, invoice, expense, purchasing, document and platform code may satisfy parts of this backlog. “P2” or “deferred” never means “delete” or “rebuild.” SaaS subscription billing is not customer invoicing; configured payment methods are not a complete Payments app.

The project board's live title, fields, options, existing items and write permissions were **not verified during preparation**. Discover them at execution time. Do not infer that an inaccessible project is private or empty.

## 3. Authenticated project preflight

Prefer available GitHub tools or the authenticated GitHub CLI/API. Validate installed capabilities with `gh --version` and relevant `--help`; do not assume every CLI version supports the same relationship flags.

Useful read-only discovery commands:

```sh
gh auth status
gh repo view Corely-AI/corely --json nameWithOwner,defaultBranchRef,viewerPermission
gh project view 1 --owner Corely-AI --format json
gh project field-list 1 --owner Corely-AI --format json --limit 100
gh project item-list 1 --owner Corely-AI --format json --limit 1000
gh api --paginate 'repos/Corely-AI/corely/issues?state=all&per_page=100'
gh label list --repo Corely-AI/corely --limit 1000 --json name,description
```

These are discovery examples, not proof of complete enumeration. Follow pagination on issues, fields, project items, comments and relationships until complete; repository issue endpoints may also contain pull requests. Exclude PRs from the issue inventory while retaining linked PR evidence. Account for archived/redacted/inaccessible project content and report coverage limits.

Resolve the **organization** `Corely-AI` and project number **1** to its real ProjectV2 node ID. Fetch actual field IDs and single-select option IDs. Do not confuse issue numbers, database issue IDs, GraphQL issue node IDs, project item IDs, field IDs or option IDs. Never paste invented IDs into mutations.

Verify repository issue-write and organization-project update access before creating remote issues. Do not print tokens or attempt to change security settings. If project access is blocked, finish the local issue bodies/manifest instead of flooding the repository with orphan issues; report the exact missing operation. Do not create another project as a workaround.

## 4. Reconcile and preserve existing work

Build an inventory and a stable mapping for every logical key. Match in this order: explicit planning marker; previous run mapping; exact scope/acceptance equivalence; careful semantic review of candidate issues and PRs. Similar titles alone are not enough.

Each specification gets one of: `create`, `reuse`, `update-managed-section`, `covered-by-completed-work`, `partial-gap`, `not-applicable-by-decision`, or `blocked-for-review`. Record why and the evidence. Existing closed work is not reopened automatically. A closed/not-planned issue is not proof of implementation. If partial scope is already done, preserve it and publish only the residual gap, clearly linked to the original.

For newly created issues use a stable marker such as:

```html
<!-- corely-backlog:corely-internal-ops-v1:TASK-01 -->
```

Use the key for idempotency, not a mutable title. Preserve marker stability across retries and reruns. If one existing issue legitimately covers several keys, map all covered keys explicitly; do not create duplicates. If one key needs several pre-existing issues, record a primary mapping plus coverage links.

Preserve existing title, body, labels, assignments, comments, milestones, urgency, parent and status unless a narrow, justified update is needed. Append/update a clearly delimited managed planning section rather than overwrite human-authored content. Re-read before edits to avoid clobbering concurrent changes; flag conflicts. Never close/delete/reopen/reparent unrelated issues, bulk-reset statuses or remove project items.

## 5. Hierarchy and metadata

Use real repository issues, not project-only drafts, for new backlog work. Prefer a two-level structure: **Epic → Feature**. Each feature is a testable vertical slice. Its body can contain implementation checklists; do not multiply every feature into separate backend/frontend/test tickets without an actual delivery reason.

Use existing native issue types when suitable. If Epic/Feature types are not configured, use equivalent existing labels or create additive repository labels such as `type:epic` and `type:feature`. Do not alter organization-wide issue types to complete this task.

Suggested titles for **new** issues:

- `[P1][EPIC][EP-TASKS] Corely Tasks — daily work and recurring checklists`
- `[P1][TASK-01] Create, assign and complete employee-facing tasks`
- `[P2][SHIFT-01] Validate demand and define a versioned roster model`

Use the current label conventions where possible. Add only necessary missing equivalents: an initiative label, P1/P2 roadmap labels, Epic/Feature labels, relevant app/area labels, and a conditional marker for P2. Do not add two conflicting priority labels. Labels supplement, not replace, project membership.

Map fields to actual project configuration:

| Meaning        | Required behavior                                                                                                                                               |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Delivery scope | Store P1/P2 in an equivalent roadmap field. Use Priority only if its meaning genuinely matches. Otherwise prefer additive `Roadmap scope` or namespaced labels. |
| Status         | Newly created issues start in an existing Backlog/Todo equivalent. Do not mark everything Ready/In progress. Preserve reused issue status.                      |
| Type           | Native issue type if available; otherwise additive label.                                                                                                       |
| App/area       | Product app or shared area; do not infer backend ownership from the marketing label.                                                                            |
| Conditional    | P2 remains not committed until its evidence gate is met.                                                                                                        |
| Parent         | Native sub-issue relationship when supported and non-conflicting.                                                                                               |
| Blocked by     | Native dependency for real hard prerequisites; links for related/conditional dependencies.                                                                      |

Do not invent assignees, delivery dates, iterations, estimates or a project title. Leave these unset unless established data already applies. Reuse an existing milestone only when its semantics match; do not create date-based release promises. If an extra field cannot be added safely, use existing fields/labels plus explicit body metadata and report the fallback.

## 6. Create safely, then wire relationships

1. Save the discovery inventory and a read-only reconciliation/dry-run summary locally. It should account for every key and expected create/reuse/update counts.
2. Create/reuse parent epics first, then features. Recheck idempotency markers immediately before creation. Store each successful result atomically in a local mapping file.
3. Add both epics and features to the existing Project #1; do not assume creating a sub-issue automatically adds it. Set project field values using the returned project-item ID in a separate supported operation.
4. Connect native parent/sub-issue relationships. Current GitHub documentation supports parent and dependency relationships, but verify CLI/API capabilities. Never steal a feature from another existing parent. Where a relationship cannot be represented, add explicit reciprocal links and report the limitation.
5. Resolve feature dependency keys to actual issue URLs/IDs. Add **blocked-by** edges only for genuine hard prerequisites. Parentage is not a blocking dependency. Never make a parent depend on all children while children depend on the parent. Check for graph cycles.
6. P2 implementation additionally requires an evidence/promotion decision from `REL-04` or documented equivalent. This does not block creating the tickets or doing limited discovery. Label it as a conditional implementation gate, not false urgency. Optional/alternative source dependencies, especially Budgets, are not an AND requirement.
7. Update epic checklists and feature relationship sections with actual issue references. Task-list completion must reflect actual linked issue state; do not mark acceptance complete because a ticket was written.
8. Respect rate limits. Retry transient failures with bounded backoff, but reconcile possibly succeeded writes before retrying so an interrupted run cannot duplicate issues. Never retry authorization/validation errors blindly.
9. Read back each issue, project membership, fields and relationships. Repair only safe omissions within this task. A successful issue creation is not proof of successful project insertion.

The baseline dependencies below are **proposed implementation prerequisites**. Refine them with code evidence. Existing equivalent implementations may satisfy dependencies; do not require rebuilding them. Record conditional branches and not-applicable decisions explicitly. Keep uncertainty visible rather than guessing provider access or data owners.

## 7. Required ticket bodies and engineering rules

The detailed bodies below are the starting specifications. Preserve outcome, acceptance tests and exclusions while adding a short verified **Current state / reuse evidence** section before publishing. Include real source paths/issue links, missing delta and tests inspected. Where not established, write “not yet verified” rather than inventing a component or claiming green tests.

Each feature must include: stable key, catalog scope, parent, outcome, bounded scope/exclusions, current-state evidence, dependencies, testable acceptance checkboxes, verification, applicable security/privacy requirements, and a Definition of Done. Replace source shorthand with actual canonical documentation links where they exist; otherwise retain the explicit supplied source filename without inventing a repository path. Each epic must include: goal, scope/non-goals, conditional gate where applicable, children and exit criteria.

Apply these rules across the backlog:

- Keep the modular monolith, shared contracts, domain ownership and current persistence policy. A product app does not require its own service, database schema or frontend deployment.
- Reuse existing manifests, permissions, app enablement, subscriptions, documents, integrations and API-hosted jobs. Modules do not directly read/write another owner's tables; use documented interfaces/events.
- Preserve trusted tenant/workspace context, backend authorization, transaction/outbox consistency, audit and idempotent commands. Menu filtering is not security.
- Distinguish employees from accounts, booking resources from people, employee Tasks from workflow execution tasks, approval from domain application, and payment from accounting.
- AI retrieves authorized data, proposes typed changes and explains sources. Deterministic logic calculates and validates. Sensitive mutations and outbound messages require explicit authorized confirmation. Recheck permissions/state on apply. Preserve useful manual workflows.
- Share neutral “unavailable” intervals outside private personnel contexts. No candidate ranking, employee surveillance scores, autonomous employment/lending decisions, bank-detail changes or fund release.
- Existing configured deterministic automations remain separately governed; do not silently disable them by prose.
- Finance works without mandatory native Accounting. Preserve exact source/evidence and reviewed monetary calculations. Do not invent tax rules, legal conclusions or compliance guarantees. Verify jurisdictional requirements with official sources and qualified review during implementation.
- App-scoped tests include negative access, replay/concurrency and relevant UI states. Run destructive/integration tests only in isolated environments with no real messages or financial actions.

## 8. Completion and report

Produce a local `corely-p1-p2-issue-map.json` with one row per logical key, including disposition, issue URL/number/node ID where available, project-item ID, parent/dependency links, evidence, fields applied and any error. Use `null` for unknown IDs, never invented values.

Also produce a concise Markdown report with actual created/reused/updated/covered/blocked counts, resolved project URL, P1/P2 coverage, hierarchy/dependency validation, existing issues preserved, access/tool limits and a suggested dependency-aware execution order.

Validate all 13 apps are represented, no P3/P4 epic was introduced, no key was lost/duplicated, no unresolved placeholder falsely appears as a real issue link, and every created/reused issue intended for this initiative has verified project membership or a clearly reported failure.

**Success:** a complete, non-duplicated, source-aware P1/P2 backlog in the existing project, with P2 still conditional and no runtime implementation performed. If permissions prevent writes, success is limited to the fully prepared local issue pack and a truthful blocker report—not a fabricated creation claim.

## Sources and verification notes

- **S1:** Supplied `Corely_App_Catalog_and_Recommendations.md`, “Portfolio and priorities” and app profiles #01–05, #11–12, #16, #18, #21, #26–28. This supplies app priority/scope, not detailed ticket approval.
- **S2:** Supplied `Corely_Documentation_Alignment_Prompt.md` and the later discussion narrowing launch to Schedule, Team and Daily work. This supplies product/architecture direction.
- **S3:** `https://github.com/Corely-AI/corely/issues/130`, inspected 7 November 2026. Recheck before mutation.
- **S4:** `https://github.com/Corely-AI/corely/blob/development/docs/products/openbuk/README.md`, inspected 7 November 2026. Its verification section is dated 4 October 2026; those are historical claims, not tests run for this backlog.
- **S5:** `https://docs.github.com/en/issues/planning-and-tracking-with-projects/automating-your-project/using-the-api-to-manage-projects` — ProjectV2 discovery, IDs, membership and field updates.
- **S6:** `https://docs.github.com/en/issues/tracking-your-work-with-issues/using-issues/adding-sub-issues` — native issue hierarchy.
- **S7:** `https://docs.github.com/en/issues/tracking-your-work-with-issues/using-issues/creating-issue-dependencies` — native blocking relationships.

All source-dependent technical behavior must be reverified against the live checkout, installed CLI and authenticated project. All detailed issue decomposition below is proposed planning, not a claim that the feature is absent.

---

# Complete epic and feature specifications

The following bodies define all 85 logical entries. They are proposed tickets awaiting live reconciliation—not evidence that anything has been created or implemented.

## [P1][EPIC][EP-STRATEGY] Confirm the launch package and reuse plan

<!-- corely-backlog:corely-internal-ops-v1:EP-STRATEGY -->

**Planning key:** `EP-STRATEGY`\
**Type:** Epic\
**Catalog scope:** P1 — focused launch\
**App/area:** Shared product/platform work (not a separate app)\
**Research basis:** Supplied Corely_Documentation_Alignment_Prompt.md and later focused-launch refinement; Corely_App_Catalog_and_Recommendations.md shared-platform/release recommendations\
**Specification status:** Proposed planning; current implementation must be reconciled before publishing.

## Outcome

One evidence-led operational package instead of a 32-app implementation.

## Scope and exclusions

Repository/issue inventory, agent documentation, adoption decision and pilot protocol. No application rewrite or invented customer research.

## Evidence / promotion gate

Audience and adoption assumptions are explicit; source owners, missing capabilities and pilot measures are documented.

## Current state / reuse evidence

Populate with inspected branch/commit/date, real source paths and existing issue/PR matches. Not yet verified for this proposed epic; do not infer absence from the plan. Preserve unrelated existing work.

## Children

Planning keys below must be replaced or accompanied by real issue references after reconciliation.

- [ ] `STR-01` — Map P1/P2 capabilities to code and existing issues
- [ ] `STR-02` — Align AGENTS and canonical documentation with the app strategy
- [ ] `STR-03` — Choose the pilot booking authority and staff surface
- [ ] `STR-04` — Define pilot evidence and P2 promotion criteria

## Exit criteria

- [ ] Each child is delivered, mapped to completed work with evidence, or explicitly not applicable by a recorded decision; unresolved delivery blockers remain visible.
- [ ] The end-to-end outcome and applicable security/privacy/reliability requirements are demonstrated, not inferred from issue closure alone.
- [ ] Scope/exclusions and any promotion gate are honored; remaining gaps and operational limitations are documented.
- [ ] Project membership, hierarchy and linked source/dependency records accurately reflect the reconciled backlog.

---

## [P1][STR-01] Map P1/P2 capabilities to code and existing issues

<!-- corely-backlog:corely-internal-ops-v1:STR-01 -->

**Planning key:** `STR-01`\
**Type:** Feature\
**Catalog scope:** P1 — focused launch\
**App/area:** Shared product/platform work (not a separate app)\
**Research basis:** Supplied Corely_Documentation_Alignment_Prompt.md and later focused-launch refinement; Corely_App_Catalog_and_Recommendations.md shared-platform/release recommendations\
**Specification status:** Proposed planning; current implementation must be reconciled before publishing.

## Outcome

Avoid rebuilding implemented work and identify the smallest missing slices.

## Parent and scope

Parent planning key: `EP-STRATEGY`. Replace or accompany with the actual parent issue URL.
Repository/issue inventory, agent documentation, adoption decision and pilot protocol. No application rewrite or invented customer research.

## Current state / reuse evidence

Before publishing, add verified owner, source paths, related issue/PRs and missing delta. Current implementation is not established by this ticket specification. If already covered, map that evidence rather than opening duplicate work.

## Dependencies

No hard feature prerequisite in this proposal; repository/project preflight and reuse checks still apply.

## Acceptance criteria

- [ ] Record reviewed branch, commit and date; map all 13 apps to existing contracts, use cases, UI, persistence, tests and open/closed issues or PRs.
- [ ] Separate code-present, partial, documented-only, not-found-in-reviewed-scope and unknown; no folder, import or completion note implies production readiness.
- [ ] For every feature identify existing owner, reuse candidate, missing delta and evidence links; distinguish completed closures from not-planned/duplicate closures.
- [ ] Inventory existing domains outside the 13 apps without deleting them, and flag stale worker, entitlement or booking assumptions.

## Verification

Review the capability/evidence matrix and sample relevant source paths; report inspection limits and tests not run.

## Definition of Done

- [ ] Reuse and ownership evidence is recorded; only the scoped missing delta is implemented and existing behavior is preserved.
- [ ] Applicable permission/isolation, replay/concurrency and UI/error-state checks pass; commands, results and skips are reported accurately.
- [ ] Documentation and source/decision links are updated; no unsupported readiness, compliance, customer-validation or test claims.
- [ ] Acceptance criteria are demonstrated with evidence; planning or issue creation alone does not complete delivery.

---

## [P1][STR-02] Align AGENTS and canonical documentation with the app strategy

<!-- corely-backlog:corely-internal-ops-v1:STR-02 -->

**Planning key:** `STR-02`\
**Type:** Feature\
**Catalog scope:** P1 — focused launch\
**App/area:** Shared product/platform work (not a separate app)\
**Research basis:** Supplied Corely_Documentation_Alignment_Prompt.md and later focused-launch refinement; Corely_App_Catalog_and_Recommendations.md shared-platform/release recommendations\
**Specification status:** Proposed planning; current implementation must be reconciled before publishing.

## Outcome

Future agents deliver the requested slice while preserving useful architecture.

## Parent and scope

Parent planning key: `EP-STRATEGY`. Replace or accompany with the actual parent issue URL.
Repository/issue inventory, agent documentation, adoption decision and pilot protocol. No application rewrite or invented customer research.

## Current state / reuse evidence

Before publishing, add verified owner, source paths, related issue/PRs and missing delta. Current implementation is not established by this ticket specification. If already covered, map that evidence rather than opening duplicate work.

## Dependencies

Hard prerequisites: `STR-01`. Resolve to real issues or verified existing equivalents.

## Acceptance criteria

- [ ] Update uppercase AGENTS.md, README and canonical product documents with connected internal-operations apps, optional finance, narrow launch and reuse-first guidance.
- [ ] Keep all 32 catalog names as roadmap context, explicitly separating implemented behavior, target design and unvalidated assumptions.
- [ ] Verify current runtime, app registration, commands and licensing; preserve existing Booking/OpenBuk and finance implementations and historical records.
- [ ] Link existing documentation-alignment work instead of duplicating it; no runtime code, migrations, license changes or alternate lowercase agent file.

## Verification

Scoped documentation/link/format checks and diff review. Reuse the earlier documentation-alignment prompt as a specification.

## Definition of Done

- [ ] Reuse and ownership evidence is recorded; only the scoped missing delta is implemented and existing behavior is preserved.
- [ ] Applicable permission/isolation, replay/concurrency and UI/error-state checks pass; commands, results and skips are reported accurately.
- [ ] Documentation and source/decision links are updated; no unsupported readiness, compliance, customer-validation or test claims.
- [ ] Acceptance criteria are demonstrated with evidence; planning or issue creation alone does not complete delivery.

---

## [P1][STR-03] Choose the pilot booking authority and staff surface

<!-- corely-backlog:corely-internal-ops-v1:STR-03 -->

**Planning key:** `STR-03`\
**Type:** Feature\
**Catalog scope:** P1 — focused launch\
**App/area:** Shared product/platform work (not a separate app)\
**Research basis:** Supplied Corely_Documentation_Alignment_Prompt.md and later focused-launch refinement; Corely_App_Catalog_and_Recommendations.md shared-platform/release recommendations\
**Specification status:** Proposed planning; current implementation must be reconciled before publishing.

## Outcome

A team adopts Corely without maintaining the same schedule twice.

## Parent and scope

Parent planning key: `EP-STRATEGY`. Replace or accompany with the actual parent issue URL.
Repository/issue inventory, agent documentation, adoption decision and pilot protocol. No application rewrite or invented customer research.

## Current state / reuse evidence

Before publishing, add verified owner, source paths, related issue/PRs and missing delta. Current implementation is not established by this ticket specification. If already covered, map that evidence rather than opening duplicate work.

## Dependencies

Hard prerequisites: `STR-01`. Resolve to real issues or verified existing equivalents.

## Acceptance criteria

- [ ] Record one initial mode: replace the booking system or complement one verified provider; identify authoritative records and the selected existing staff surface.
- [ ] Replacement mode defines import/cutover and essential public booking; companion mode proves API access, freshness, identity mapping, write authority and failure behavior.
- [ ] Preserve the already-existing OpenBuk public journey; do not create a competing booking owner or assume every provider supports bidirectional writes.
- [ ] Unselected alternatives are out of implementation scope; unresolved decisions block dependent implementation, not backlog creation.

## Verification

Review a synthetic adoption walkthrough and capture actual provider/migration constraints, not assumed integration support.

## Definition of Done

- [ ] Reuse and ownership evidence is recorded; only the scoped missing delta is implemented and existing behavior is preserved.
- [ ] Applicable permission/isolation, replay/concurrency and UI/error-state checks pass; commands, results and skips are reported accurately.
- [ ] Documentation and source/decision links are updated; no unsupported readiness, compliance, customer-validation or test claims.
- [ ] Acceptance criteria are demonstrated with evidence; planning or issue creation alone does not complete delivery.

---

## [P1][STR-04] Define pilot evidence and P2 promotion criteria

<!-- corely-backlog:corely-internal-ops-v1:STR-04 -->

**Planning key:** `STR-04`\
**Type:** Feature\
**Catalog scope:** P1 — focused launch\
**App/area:** Shared product/platform work (not a separate app)\
**Research basis:** Supplied Corely_Documentation_Alignment_Prompt.md and later focused-launch refinement; Corely_App_Catalog_and_Recommendations.md shared-platform/release recommendations\
**Specification status:** Proposed planning; current implementation must be reconciled before publishing.

## Outcome

Choose expansion through customer behavior rather than catalog completion.

## Parent and scope

Parent planning key: `EP-STRATEGY`. Replace or accompany with the actual parent issue URL.
Repository/issue inventory, agent documentation, adoption decision and pilot protocol. No application rewrite or invented customer research.

## Current state / reuse evidence

Before publishing, add verified owner, source paths, related issue/PRs and missing delta. Current implementation is not established by this ticket specification. If already covered, map that evidence rather than opening duplicate work.

## Dependencies

Hard prerequisites: `STR-03`. Resolve to real issues or verified existing equivalents.

## Acceptance criteria

- [ ] Describe Germany-first appointment-led service teams as a hypothesis and define buyer, staff users, current tools and the recurring problem to observe.
- [ ] Propose a small pilot and baseline measures for coordination effort, repeat usage, willingness to pay, support cost and AI correction effort; invent no outcomes or dates.
- [ ] Define normal-day and absence-exception scenarios without treating one uncommon exception as proven demand.
- [ ] Each P2 epic has a customer problem, evidence-to-promote checklist and explicit conditional/not-committed state.

## Verification

Review the research protocol and measurement dictionary; real interview/payment evidence is required later, not fabricated here.

## Definition of Done

- [ ] Reuse and ownership evidence is recorded; only the scoped missing delta is implemented and existing behavior is preserved.
- [ ] Applicable permission/isolation, replay/concurrency and UI/error-state checks pass; commands, results and skips are reported accurately.
- [ ] Documentation and source/decision links are updated; no unsupported readiness, compliance, customer-validation or test claims.
- [ ] Acceptance criteria are demonstrated with evidence; planning or issue creation alone does not complete delivery.

---

## [P1][EPIC][EP-PLATFORM] Provide the shared operational workspace

<!-- corely-backlog:corely-internal-ops-v1:EP-PLATFORM -->

**Planning key:** `EP-PLATFORM`\
**Type:** Epic\
**Catalog scope:** P1 — focused launch\
**App/area:** Shared product/platform work (not a separate app)\
**Research basis:** Supplied Corely_Documentation_Alignment_Prompt.md and later focused-launch refinement; Corely_App_Catalog_and_Recommendations.md shared-platform/release recommendations\
**Specification status:** Proposed planning; current implementation must be reconciled before publishing.

## Outcome

Schedule, Team and Daily work form one secure, useful package.

## Scope and exclusions

Reuse manifests, workspaces, roles, shared UI, onboarding and configuration. No new marketplace, entitlement engine or frontend per catalog app.

## Evidence / promotion gate

The selected surface works manually, authorization is server-enforced and unrelated existing products are preserved.

## Current state / reuse evidence

Populate with inspected branch/commit/date, real source paths and existing issue/PR matches. Not yet verified for this proposed epic; do not infer absence from the plan. Preserve unrelated existing work.

## Children

Planning keys below must be replaced or accompanied by real issue references after reconciliation.

- [ ] `PLAT-01` — Compose the package using existing app manifests
- [ ] `PLAT-02` — Enforce operational roles and private-data access
- [ ] `PLAT-03` — Build the responsive manual-first operational shell
- [ ] `PLAT-04` — Support resumable pilot setup and staff invitations

## Exit criteria

- [ ] Each child is delivered, mapped to completed work with evidence, or explicitly not applicable by a recorded decision; unresolved delivery blockers remain visible.
- [ ] The end-to-end outcome and applicable security/privacy/reliability requirements are demonstrated, not inferred from issue closure alone.
- [ ] Scope/exclusions and any promotion gate are honored; remaining gaps and operational limitations are documented.
- [ ] Project membership, hierarchy and linked source/dependency records accurately reflect the reconciled backlog.

---

## [P1][PLAT-01] Compose the package using existing app manifests

<!-- corely-backlog:corely-internal-ops-v1:PLAT-01 -->

**Planning key:** `PLAT-01`\
**Type:** Feature\
**Catalog scope:** P1 — focused launch\
**App/area:** Shared product/platform work (not a separate app)\
**Research basis:** Supplied Corely_Documentation_Alignment_Prompt.md and later focused-launch refinement; Corely_App_Catalog_and_Recommendations.md shared-platform/release recommendations\
**Specification status:** Proposed planning; current implementation must be reconciled before publishing.

## Outcome

Enable the right capabilities without introducing another app framework.

## Parent and scope

Parent planning key: `EP-PLATFORM`. Replace or accompany with the actual parent issue URL.
Reuse manifests, workspaces, roles, shared UI, onboarding and configuration. No new marketplace, entitlement engine or frontend per catalog app.

## Current state / reuse evidence

Before publishing, add verified owner, source paths, related issue/PRs and missing delta. Current implementation is not established by this ticket specification. If already covered, map that evidence rather than opening duplicate work.

## Dependencies

Hard prerequisites: `STR-01`, `STR-03`. Resolve to real issues or verified existing equivalents.

## Acceptance criteria

- [ ] Reuse actual app IDs, dependencies, capability resolution and workspace configuration; marketing names do not force backend renames.
- [ ] The focused package exposes Schedule, Team and Daily work without requiring Accounting, payroll or a finance subscription.
- [ ] Disabled optional apps preserve their records and cause graceful UI degradation, not destructive cleanup.
- [ ] Tests distinguish tenant app enablement, workspace capability, user permission and product entitlement.

## Verification

Configuration integration tests for enabled/disabled dependencies and regression of existing product packages.

## Definition of Done

- [ ] Reuse and ownership evidence is recorded; only the scoped missing delta is implemented and existing behavior is preserved.
- [ ] Applicable permission/isolation, replay/concurrency and UI/error-state checks pass; commands, results and skips are reported accurately.
- [ ] Documentation and source/decision links are updated; no unsupported readiness, compliance, customer-validation or test claims.
- [ ] Acceptance criteria are demonstrated with evidence; planning or issue creation alone does not complete delivery.

---

## [P1][PLAT-02] Enforce operational roles and private-data access

<!-- corely-backlog:corely-internal-ops-v1:PLAT-02 -->

**Planning key:** `PLAT-02`\
**Type:** Feature\
**Catalog scope:** P1 — focused launch\
**App/area:** Shared product/platform work (not a separate app)\
**Research basis:** Supplied Corely_Documentation_Alignment_Prompt.md and later focused-launch refinement; Corely_App_Catalog_and_Recommendations.md shared-platform/release recommendations\
**Specification status:** Proposed planning; current implementation must be reconciled before publishing.

## Outcome

Staff and managers see or change only authorized workspace records.

## Parent and scope

Parent planning key: `EP-PLATFORM`. Replace or accompany with the actual parent issue URL.
Reuse manifests, workspaces, roles, shared UI, onboarding and configuration. No new marketplace, entitlement engine or frontend per catalog app.

## Current state / reuse evidence

Before publishing, add verified owner, source paths, related issue/PRs and missing delta. Current implementation is not established by this ticket specification. If already covered, map that evidence rather than opening duplicate work.

## Dependencies

Hard prerequisites: `STR-01`. Resolve to real issues or verified existing equivalents.

## Acceptance criteria

- [ ] Document action/resource/field rules using existing RBAC/policies, including private personnel data, files, exports and audit access.
- [ ] Backend reads and writes validate trusted tenant/workspace membership; guessed IDs, direct routes and model arguments cannot bypass it.
- [ ] Menu filtering is not authorization; caches, search, file links and AI retrieval obey the same access boundary.
- [ ] Role revocation and workspace switching are covered by negative tests using multiple tenants and workspaces.

## Verification

Negative API/tool/file/export tests with different roles and tenants; verify private-field redaction.

## Definition of Done

- [ ] Reuse and ownership evidence is recorded; only the scoped missing delta is implemented and existing behavior is preserved.
- [ ] Applicable permission/isolation, replay/concurrency and UI/error-state checks pass; commands, results and skips are reported accurately.
- [ ] Documentation and source/decision links are updated; no unsupported readiness, compliance, customer-validation or test claims.
- [ ] Acceptance criteria are demonstrated with evidence; planning or issue creation alone does not complete delivery.

---

## [P1][PLAT-03] Build the responsive manual-first operational shell

<!-- corely-backlog:corely-internal-ops-v1:PLAT-03 -->

**Planning key:** `PLAT-03`\
**Type:** Feature\
**Catalog scope:** P1 — focused launch\
**App/area:** Shared product/platform work (not a separate app)\
**Research basis:** Supplied Corely_Documentation_Alignment_Prompt.md and later focused-launch refinement; Corely_App_Catalog_and_Recommendations.md shared-platform/release recommendations\
**Specification status:** Proposed planning; current implementation must be reconciled before publishing.

## Outcome

Employees reach daily work without navigating an ERP module catalog.

## Parent and scope

Parent planning key: `EP-PLATFORM`. Replace or accompany with the actual parent issue URL.
Reuse manifests, workspaces, roles, shared UI, onboarding and configuration. No new marketplace, entitlement engine or frontend per catalog app.

## Current state / reuse evidence

Before publishing, add verified owner, source paths, related issue/PRs and missing delta. Current implementation is not established by this ticket specification. If already covered, map that evidence rather than opening duplicate work.

## Dependencies

Hard prerequisites: `PLAT-01`, `PLAT-02`. Resolve to real issues or verified existing equivalents.

## Acceptance criteria

- [ ] The selected existing surface has authorized Schedule, Team, Daily work and decision/knowledge entry points with stable deep links.
- [ ] Mobile/desktop screens have loading, empty, error, retry and no-access states; calendars and inboxes are not forced into table-only layouts.
- [ ] Core actions work with AI disabled; stale/offline views do not falsely report saved changes.
- [ ] Use shared public UI packages instead of private imports across apps; preserve OpenBuk public branding/routes and unrelated surfaces.

## Verification

Responsive navigation tests, keyboard smoke checks and an AI-disabled manual workflow.

## Definition of Done

- [ ] Reuse and ownership evidence is recorded; only the scoped missing delta is implemented and existing behavior is preserved.
- [ ] Applicable permission/isolation, replay/concurrency and UI/error-state checks pass; commands, results and skips are reported accurately.
- [ ] Documentation and source/decision links are updated; no unsupported readiness, compliance, customer-validation or test claims.
- [ ] Acceptance criteria are demonstrated with evidence; planning or issue creation alone does not complete delivery.

---

## [P1][PLAT-04] Support resumable pilot setup and staff invitations

<!-- corely-backlog:corely-internal-ops-v1:PLAT-04 -->

**Planning key:** `PLAT-04`\
**Type:** Feature\
**Catalog scope:** P1 — focused launch\
**App/area:** Shared product/platform work (not a separate app)\
**Research basis:** Supplied Corely_Documentation_Alignment_Prompt.md and later focused-launch refinement; Corely_App_Catalog_and_Recommendations.md shared-platform/release recommendations\
**Specification status:** Proposed planning; current implementation must be reconciled before publishing.

## Outcome

An owner configures the first workspace without duplicate identities.

## Parent and scope

Parent planning key: `EP-PLATFORM`. Replace or accompany with the actual parent issue URL.
Reuse manifests, workspaces, roles, shared UI, onboarding and configuration. No new marketplace, entitlement engine or frontend per catalog app.

## Current state / reuse evidence

Before publishing, add verified owner, source paths, related issue/PRs and missing delta. Current implementation is not established by this ticket specification. If already covered, map that evidence rather than opening duplicate work.

## Dependencies

Hard prerequisites: `PLAT-01`, `PLAT-02`, `STR-03`. Resolve to real issues or verified existing equivalents.

## Acceptance criteria

- [ ] Reuse workspace setup for locale, IANA timezone and initial location; interrupted setup resumes without creating a second workspace.
- [ ] Invitations/account associations use current Identity/Workspaces interfaces and tolerate retries without duplicate memberships.
- [ ] Only authorized users publish customer-facing availability; incomplete setup and outbound message behavior are explicit.
- [ ] Demo fixtures remain isolated from customer data, and setup requires neither AI nor finance activation.

## Verification

E2E resumed setup, repeated invitation, timezone validation and unauthorized-publication tests.

## Definition of Done

- [ ] Reuse and ownership evidence is recorded; only the scoped missing delta is implemented and existing behavior is preserved.
- [ ] Applicable permission/isolation, replay/concurrency and UI/error-state checks pass; commands, results and skips are reported accurately.
- [ ] Documentation and source/decision links are updated; no unsupported readiness, compliance, customer-validation or test claims.
- [ ] Acceptance criteria are demonstrated with evidence; planning or issue creation alone does not complete delivery.

---

## [P1][EPIC][EP-PEOPLE] Corely People — operational staff and availability

<!-- corely-backlog:corely-internal-ops-v1:EP-PEOPLE -->

**Planning key:** `EP-PEOPLE`\
**Type:** Epic\
**Catalog scope:** P1 — focused launch\
**App/area:** #02 Corely People\
**Research basis:** Supplied Corely_App_Catalog_and_Recommendations.md, app profiles #02; Corely_Documentation_Alignment_Prompt.md and later focused-launch refinement\
**Specification status:** Proposed planning; current implementation must be reconciled before publishing.

## Outcome

Provide trustworthy minimal staff context for scheduling and work.

## Scope and exclusions

Profiles, teams/locations, working patterns, private absence records and narrow self-service; no payroll, entitlement engine or employee scoring.

## Evidence / promotion gate

Operational consumers receive neutral availability while personnel records remain protected.

## Current state / reuse evidence

Populate with inspected branch/commit/date, real source paths and existing issue/PR matches. Not yet verified for this proposed epic; do not infer absence from the plan. Preserve unrelated existing work.

## Children

Planning keys below must be replaced or accompanied by real issue references after reconciliation.

- [ ] `PEOPLE-01` — Maintain the staff directory and explicit identity links
- [ ] `PEOPLE-02` — Manage working patterns and dated availability exceptions
- [ ] `PEOPLE-03` — Record private absences and neutral availability effects
- [ ] `PEOPLE-04` — Deliver staff self-service and controlled onboarding/offboarding

## Exit criteria

- [ ] Each child is delivered, mapped to completed work with evidence, or explicitly not applicable by a recorded decision; unresolved delivery blockers remain visible.
- [ ] The end-to-end outcome and applicable security/privacy/reliability requirements are demonstrated, not inferred from issue closure alone.
- [ ] Scope/exclusions and any promotion gate are honored; remaining gaps and operational limitations are documented.
- [ ] Project membership, hierarchy and linked source/dependency records accurately reflect the reconciled backlog.

---

## [P1][PEOPLE-01] Maintain the staff directory and explicit identity links

<!-- corely-backlog:corely-internal-ops-v1:PEOPLE-01 -->

**Planning key:** `PEOPLE-01`\
**Type:** Feature\
**Catalog scope:** P1 — focused launch\
**App/area:** #02 Corely People\
**Research basis:** Supplied Corely_App_Catalog_and_Recommendations.md, app profiles #02; Corely_Documentation_Alignment_Prompt.md and later focused-launch refinement\
**Specification status:** Proposed planning; current implementation must be reconciled before publishing.

## Outcome

Employee records are usable without confusing them with customers or login accounts.

## Parent and scope

Parent planning key: `EP-PEOPLE`. Replace or accompany with the actual parent issue URL.
Profiles, teams/locations, working patterns, private absence records and narrow self-service; no payroll, entitlement engine or employee scoring.

## Current state / reuse evidence

Before publishing, add verified owner, source paths, related issue/PRs and missing delta. Current implementation is not established by this ticket specification. If already covered, map that evidence rather than opening duplicate work.

## Dependencies

Hard prerequisites: `STR-01`, `PLAT-02`. Resolve to real issues or verified existing equivalents.

## Acceptance criteria

- [ ] Managers create/update/archive minimal profiles with stable workspace IDs, manager/team/location and optional account/party/resource links.
- [ ] Staff without accounts are supported; link validation rejects cross-workspace and conflicting duplicate associations.
- [ ] List/detail/search expose only permitted fields; archived staff remain interpretable in historical records.
- [ ] Reuse actual Party/Identity/resource ownership via interfaces; do not create a duplicate master-data subsystem.

## Verification

Profile and link validation, tenant/privacy tests, directory UI and archive-history integration.

## Definition of Done

- [ ] Reuse and ownership evidence is recorded; only the scoped missing delta is implemented and existing behavior is preserved.
- [ ] Applicable permission/isolation, replay/concurrency and UI/error-state checks pass; commands, results and skips are reported accurately.
- [ ] Documentation and source/decision links are updated; no unsupported readiness, compliance, customer-validation or test claims.
- [ ] Acceptance criteria are demonstrated with evidence; planning or issue creation alone does not complete delivery.

---

## [P1][PEOPLE-02] Manage working patterns and dated availability exceptions

<!-- corely-backlog:corely-internal-ops-v1:PEOPLE-02 -->

**Planning key:** `PEOPLE-02`\
**Type:** Feature\
**Catalog scope:** P1 — focused launch\
**App/area:** #02 Corely People\
**Research basis:** Supplied Corely_App_Catalog_and_Recommendations.md, app profiles #02; Corely_Documentation_Alignment_Prompt.md and later focused-launch refinement\
**Specification status:** Proposed planning; current implementation must be reconciled before publishing.

## Outcome

Scheduling uses explicit staff availability rather than implicit all-day access.

## Parent and scope

Parent planning key: `EP-PEOPLE`. Replace or accompany with the actual parent issue URL.
Profiles, teams/locations, working patterns, private absence records and narrow self-service; no payroll, entitlement engine or employee scoring.

## Current state / reuse evidence

Before publishing, add verified owner, source paths, related issue/PRs and missing delta. Current implementation is not established by this ticket specification. If already covered, map that evidence rather than opening duplicate work.

## Dependencies

Hard prerequisites: `PEOPLE-01`. Resolve to real issues or verified existing equivalents.

## Acceptance criteria

- [ ] Managers define recurring hours, effective dates, timezone and dated exceptions with invalid-range validation.
- [ ] Document one authoritative owner for each input and how People and existing Booking rules collaborate; no parallel competing schedule stores.
- [ ] Future rule changes flag affected commitments without rewriting historical bookings.
- [ ] DST gaps/folds, overnight ranges and conflicting exceptions have deterministic precedence.

## Verification

Frozen-time/DST domain tests, effective-date cases and integration against authoritative Booking availability.

## Definition of Done

- [ ] Reuse and ownership evidence is recorded; only the scoped missing delta is implemented and existing behavior is preserved.
- [ ] Applicable permission/isolation, replay/concurrency and UI/error-state checks pass; commands, results and skips are reported accurately.
- [ ] Documentation and source/decision links are updated; no unsupported readiness, compliance, customer-validation or test claims.
- [ ] Acceptance criteria are demonstrated with evidence; planning or issue creation alone does not complete delivery.

---

## [P1][PEOPLE-03] Record private absences and neutral availability effects

<!-- corely-backlog:corely-internal-ops-v1:PEOPLE-03 -->

**Planning key:** `PEOPLE-03`\
**Type:** Feature\
**Catalog scope:** P1 — focused launch\
**App/area:** #02 Corely People\
**Research basis:** Supplied Corely_App_Catalog_and_Recommendations.md, app profiles #02; Corely_Documentation_Alignment_Prompt.md and later focused-launch refinement\
**Specification status:** Proposed planning; current implementation must be reconciled before publishing.

## Outcome

Approved absence affects work without revealing its personal reason.

## Parent and scope

Parent planning key: `EP-PEOPLE`. Replace or accompany with the actual parent issue URL.
Profiles, teams/locations, working patterns, private absence records and narrow self-service; no payroll, entitlement engine or employee scoring.

## Current state / reuse evidence

Before publishing, add verified owner, source paths, related issue/PRs and missing delta. Current implementation is not established by this ticket specification. If already covered, map that evidence rather than opening duplicate work.

## Dependencies

Hard prerequisites: `PEOPLE-01`, `PEOPLE-02`. Resolve to real issues or verified existing equivalents.

## Acceptance criteria

- [ ] The owner validates full/partial-day ranges, overlaps, corrections and cancellation without claiming statutory leave-entitlement calculations.
- [ ] Private reasons/files remain restricted; operational events/projections expose only necessary staff/resource, interval and version/lifecycle.
- [ ] Absence state and outbox/audit commit consistently; repeated commands do not duplicate records or blocks.
- [ ] Correction/cancellation updates future availability without erasing history or automatically altering customer appointments.

## Verification

Privacy, overlap, correction, transactional rollback and replay tests.

## Definition of Done

- [ ] Reuse and ownership evidence is recorded; only the scoped missing delta is implemented and existing behavior is preserved.
- [ ] Applicable permission/isolation, replay/concurrency and UI/error-state checks pass; commands, results and skips are reported accurately.
- [ ] Documentation and source/decision links are updated; no unsupported readiness, compliance, customer-validation or test claims.
- [ ] Acceptance criteria are demonstrated with evidence; planning or issue creation alone does not complete delivery.

---

## [P1][PEOPLE-04] Deliver staff self-service and controlled onboarding/offboarding

<!-- corely-backlog:corely-internal-ops-v1:PEOPLE-04 -->

**Planning key:** `PEOPLE-04`\
**Type:** Feature\
**Catalog scope:** P1 — focused launch\
**App/area:** #02 Corely People\
**Research basis:** Supplied Corely_App_Catalog_and_Recommendations.md, app profiles #02; Corely_Documentation_Alignment_Prompt.md and later focused-launch refinement\
**Specification status:** Proposed planning; current implementation must be reconciled before publishing.

## Outcome

Staff access their records while managers retain authority over membership and responsibilities.

## Parent and scope

Parent planning key: `EP-PEOPLE`. Replace or accompany with the actual parent issue URL.
Profiles, teams/locations, working patterns, private absence records and narrow self-service; no payroll, entitlement engine or employee scoring.

## Current state / reuse evidence

Before publishing, add verified owner, source paths, related issue/PRs and missing delta. Current implementation is not established by this ticket specification. If already covered, map that evidence rather than opening duplicate work.

## Dependencies

Hard prerequisites: `PEOPLE-01`, `PLAT-04`, `TASK-01`. Resolve to real issues or verified existing equivalents.

## Acceptance criteria

- [ ] Staff view permitted profile/availability and edit only allowed fields or submit corrections; no self-granted roles or manager changes.
- [ ] Onboarding links an approved checklist without automatically granting sensitive access.
- [ ] Archiving/offboarding surfaces future assignments and access follow-up; Identity changes use its owner and do not silently cancel bookings.
- [ ] Historical work stays traceable after departure and self-service works on mobile.

## Verification

Role-escalation negatives, onboarding checklist reuse and departure with future commitments E2E.

## Definition of Done

- [ ] Reuse and ownership evidence is recorded; only the scoped missing delta is implemented and existing behavior is preserved.
- [ ] Applicable permission/isolation, replay/concurrency and UI/error-state checks pass; commands, results and skips are reported accurately.
- [ ] Documentation and source/decision links are updated; no unsupported readiness, compliance, customer-validation or test claims.
- [ ] Acceptance criteria are demonstrated with evidence; planning or issue creation alone does not complete delivery.

---

## [P1][EPIC][EP-REQUESTS] Corely Requests — narrow forms and approvals

<!-- corely-backlog:corely-internal-ops-v1:EP-REQUESTS -->

**Planning key:** `EP-REQUESTS`\
**Type:** Epic\
**Catalog scope:** P1 — focused launch\
**App/area:** #04 Corely Requests\
**Research basis:** Supplied Corely_App_Catalog_and_Recommendations.md, app profiles #04; Corely_Documentation_Alignment_Prompt.md and later focused-launch refinement\
**Specification status:** Proposed planning; current implementation must be reconciled before publishing.

## Outcome

Staff ask for decisions and managers respond with traceable outcomes.

## Scope and exclusions

Absence and simple equipment/general forms, review, history, inbox and reminders via existing Approvals; no universal form/workflow designer.

## Evidence / promotion gate

Decisions are authorized and the owning business module validates/applies each resulting state change.

## Current state / reuse evidence

Populate with inspected branch/commit/date, real source paths and existing issue/PR matches. Not yet verified for this proposed epic; do not infer absence from the plan. Preserve unrelated existing work.

## Children

Planning keys below must be replaced or accompanied by real issue references after reconciliation.

- [ ] `REQ-01` — Submit typed requests with supporting context
- [ ] `REQ-02` — Apply review decisions through safe domain handoffs
- [ ] `REQ-03` — Provide request tracking, the decision inbox and bounded reminders

## Exit criteria

- [ ] Each child is delivered, mapped to completed work with evidence, or explicitly not applicable by a recorded decision; unresolved delivery blockers remain visible.
- [ ] The end-to-end outcome and applicable security/privacy/reliability requirements are demonstrated, not inferred from issue closure alone.
- [ ] Scope/exclusions and any promotion gate are honored; remaining gaps and operational limitations are documented.
- [ ] Project membership, hierarchy and linked source/dependency records accurately reflect the reconciled backlog.

---

## [P1][REQ-01] Submit typed requests with supporting context

<!-- corely-backlog:corely-internal-ops-v1:REQ-01 -->

**Planning key:** `REQ-01`\
**Type:** Feature\
**Catalog scope:** P1 — focused launch\
**App/area:** #04 Corely Requests\
**Research basis:** Supplied Corely_App_Catalog_and_Recommendations.md, app profiles #04; Corely_Documentation_Alignment_Prompt.md and later focused-launch refinement\
**Specification status:** Proposed planning; current implementation must be reconciled before publishing.

## Outcome

Replace scattered approval messages with structured submissions.

## Parent and scope

Parent planning key: `EP-REQUESTS`. Replace or accompany with the actual parent issue URL.
Absence and simple equipment/general forms, review, history, inbox and reminders via existing Approvals; no universal form/workflow designer.

## Current state / reuse evidence

Before publishing, add verified owner, source paths, related issue/PRs and missing delta. Current implementation is not established by this ticket specification. If already covered, map that evidence rather than opening duplicate work.

## Dependencies

Hard prerequisites: `PLAT-02`, `PEOPLE-01`. Resolve to real issues or verified existing equivalents.

## Acceptance criteria

- [ ] Fixed absence and equipment/general templates support draft, submit and withdraw with typed required fields and validation.
- [ ] A valid configured reviewer is selected using existing approvals, or missing routing is shown without losing the draft.
- [ ] Files and optional policy links obey source permissions; equipment requests work without the P2 Assets app.
- [ ] Retrying submit/withdraw is deterministic and requester history cannot be rewritten.

## Verification

Form/contract and submit/retry/withdraw tests plus private-file denial cases.

## Definition of Done

- [ ] Reuse and ownership evidence is recorded; only the scoped missing delta is implemented and existing behavior is preserved.
- [ ] Applicable permission/isolation, replay/concurrency and UI/error-state checks pass; commands, results and skips are reported accurately.
- [ ] Documentation and source/decision links are updated; no unsupported readiness, compliance, customer-validation or test claims.
- [ ] Acceptance criteria are demonstrated with evidence; planning or issue creation alone does not complete delivery.

---

## [P1][REQ-02] Apply review decisions through safe domain handoffs

<!-- corely-backlog:corely-internal-ops-v1:REQ-02 -->

**Planning key:** `REQ-02`\
**Type:** Feature\
**Catalog scope:** P1 — focused launch\
**App/area:** #04 Corely Requests\
**Research basis:** Supplied Corely_App_Catalog_and_Recommendations.md, app profiles #04; Corely_Documentation_Alignment_Prompt.md and later focused-launch refinement\
**Specification status:** Proposed planning; current implementation must be reconciled before publishing.

## Outcome

An approval is not falsely treated as a completed business action.

## Parent and scope

Parent planning key: `EP-REQUESTS`. Replace or accompany with the actual parent issue URL.
Absence and simple equipment/general forms, review, history, inbox and reminders via existing Approvals; no universal form/workflow designer.

## Current state / reuse evidence

Before publishing, add verified owner, source paths, related issue/PRs and missing delta. Current implementation is not established by this ticket specification. If already covered, map that evidence rather than opening duplicate work.

## Dependencies

Hard prerequisites: `REQ-01`. Resolve to real issues or verified existing equivalents.

## Acceptance criteria

- [ ] Only the configured reviewer can approve/reject/return the current version; self-approval follows an explicit policy, denied by default.
- [ ] Concurrent/replayed decisions and return-for-information/resubmission preserve a complete decision history.
- [ ] The business owner revalidates before applying absence, asset or finance changes; approval alone never proves activation or payment.
- [ ] Failed handoffs are visible and retryable; approved, pending-application and applied outcomes are distinguishable.

## Verification

Decision-race, stale-version, unauthorized/self-approval and failed-handoff replay tests.

## Definition of Done

- [ ] Reuse and ownership evidence is recorded; only the scoped missing delta is implemented and existing behavior is preserved.
- [ ] Applicable permission/isolation, replay/concurrency and UI/error-state checks pass; commands, results and skips are reported accurately.
- [ ] Documentation and source/decision links are updated; no unsupported readiness, compliance, customer-validation or test claims.
- [ ] Acceptance criteria are demonstrated with evidence; planning or issue creation alone does not complete delivery.

---

## [P1][REQ-03] Provide request tracking, the decision inbox and bounded reminders

<!-- corely-backlog:corely-internal-ops-v1:REQ-03 -->

**Planning key:** `REQ-03`\
**Type:** Feature\
**Catalog scope:** P1 — focused launch\
**App/area:** #04 Corely Requests\
**Research basis:** Supplied Corely_App_Catalog_and_Recommendations.md, app profiles #04; Corely_Documentation_Alignment_Prompt.md and later focused-launch refinement\
**Specification status:** Proposed planning; current implementation must be reconciled before publishing.

## Outcome

Requesters and reviewers know what awaits action.

## Parent and scope

Parent planning key: `EP-REQUESTS`. Replace or accompany with the actual parent issue URL.
Absence and simple equipment/general forms, review, history, inbox and reminders via existing Approvals; no universal form/workflow designer.

## Current state / reuse evidence

Before publishing, add verified owner, source paths, related issue/PRs and missing delta. Current implementation is not established by this ticket specification. If already covered, map that evidence rather than opening duplicate work.

## Dependencies

Hard prerequisites: `REQ-02`, `PLAT-03`. Resolve to real issues or verified existing equivalents.

## Acceptance criteria

- [ ] My requests and manager inbox use permission-filtered records with reconciled counts, status and age, without private summary leakage.
- [ ] Reviewers open/decide requests while staff track returns, rejection, approval and application failures.
- [ ] Reminders reuse notifications/background execution with deduplication and cancellation after decisions.
- [ ] Revoked access, stale data, empty/error states and source unavailability are explicit; reminders never approve work.

## Verification

Inbox permission tests, reminder replay/cancellation and requester-to-reviewer E2E.

## Definition of Done

- [ ] Reuse and ownership evidence is recorded; only the scoped missing delta is implemented and existing behavior is preserved.
- [ ] Applicable permission/isolation, replay/concurrency and UI/error-state checks pass; commands, results and skips are reported accurately.
- [ ] Documentation and source/decision links are updated; no unsupported readiness, compliance, customer-validation or test claims.
- [ ] Acceptance criteria are demonstrated with evidence; planning or issue creation alone does not complete delivery.

---

## [P1][EPIC][EP-TASKS] Corely Tasks — daily work and recurring checklists

<!-- corely-backlog:corely-internal-ops-v1:EP-TASKS -->

**Planning key:** `EP-TASKS`\
**Type:** Epic\
**Catalog scope:** P1 — focused launch\
**App/area:** #01 Corely Tasks\
**Research basis:** Supplied Corely_App_Catalog_and_Recommendations.md, app profiles #01; Corely_Documentation_Alignment_Prompt.md and later focused-launch refinement\
**Specification status:** Proposed planning; current implementation must be reconciled before publishing.

## Outcome

Staff know what to do, and routine work does not depend on manual reminders.

## Scope and exclusions

Minimal tasks, personal/team views, recurrence, comments/files and operational links. No portfolio planning or duplication of workflow execution jobs.

## Evidence / promotion gate

The normal-day task/checklist flow works on mobile with reliable retries and source links.

## Current state / reuse evidence

Populate with inspected branch/commit/date, real source paths and existing issue/PR matches. Not yet verified for this proposed epic; do not infer absence from the plan. Preserve unrelated existing work.

## Children

Planning keys below must be replaced or accompanied by real issue references after reconciliation.

- [ ] `TASK-01` — Create, assign and complete employee-facing tasks
- [ ] `TASK-02` — Provide My work and simple team list/board views
- [ ] `TASK-03` — Generate recurring opening and closing checklists
- [ ] `TASK-04` — Attach context and link operational follow-up work

## Exit criteria

- [ ] Each child is delivered, mapped to completed work with evidence, or explicitly not applicable by a recorded decision; unresolved delivery blockers remain visible.
- [ ] The end-to-end outcome and applicable security/privacy/reliability requirements are demonstrated, not inferred from issue closure alone.
- [ ] Scope/exclusions and any promotion gate are honored; remaining gaps and operational limitations are documented.
- [ ] Project membership, hierarchy and linked source/dependency records accurately reflect the reconciled backlog.

---

## [P1][TASK-01] Create, assign and complete employee-facing tasks

<!-- corely-backlog:corely-internal-ops-v1:TASK-01 -->

**Planning key:** `TASK-01`\
**Type:** Feature\
**Catalog scope:** P1 — focused launch\
**App/area:** #01 Corely Tasks\
**Research basis:** Supplied Corely_App_Catalog_and_Recommendations.md, app profiles #01; Corely_Documentation_Alignment_Prompt.md and later focused-launch refinement\
**Specification status:** Proposed planning; current implementation must be reconciled before publishing.

## Outcome

Track daily work with accountable ownership and a simple lifecycle.

## Parent and scope

Parent planning key: `EP-TASKS`. Replace or accompany with the actual parent issue URL.
Minimal tasks, personal/team views, recurrence, comments/files and operational links. No portfolio planning or duplication of workflow execution jobs.

## Current state / reuse evidence

Before publishing, add verified owner, source paths, related issue/PRs and missing delta. Current implementation is not established by this ticket specification. If already covered, map that evidence rather than opening duplicate work.

## Dependencies

Hard prerequisites: `STR-01`, `PEOPLE-01`, `PLAT-02`. Resolve to real issues or verified existing equivalents.

## Acceptance criteria

- [ ] Authorized users create/assign/update/complete/reopen tasks with shared contracts and validation; inactive/cross-workspace assignees are rejected.
- [ ] Title, owner, optional due time and simple status use one record across surfaces; workflow execution steps and CRM activities stay distinct.
- [ ] Concurrent edits and repeated commands cannot silently lose updates or duplicate tasks; mutations are audited.
- [ ] Staff archival preserves history; no advanced Projects app is required.

## Verification

Lifecycle, concurrency/idempotency and create-to-complete UI tests.

## Definition of Done

- [ ] Reuse and ownership evidence is recorded; only the scoped missing delta is implemented and existing behavior is preserved.
- [ ] Applicable permission/isolation, replay/concurrency and UI/error-state checks pass; commands, results and skips are reported accurately.
- [ ] Documentation and source/decision links are updated; no unsupported readiness, compliance, customer-validation or test claims.
- [ ] Acceptance criteria are demonstrated with evidence; planning or issue creation alone does not complete delivery.

---

## [P1][TASK-02] Provide My work and simple team list/board views

<!-- corely-backlog:corely-internal-ops-v1:TASK-02 -->

**Planning key:** `TASK-02`\
**Type:** Feature\
**Catalog scope:** P1 — focused launch\
**App/area:** #01 Corely Tasks\
**Research basis:** Supplied Corely_App_Catalog_and_Recommendations.md, app profiles #01; Corely_Documentation_Alignment_Prompt.md and later focused-launch refinement\
**Specification status:** Proposed planning; current implementation must be reconciled before publishing.

## Outcome

Employees find their next action without administrative searching.

## Parent and scope

Parent planning key: `EP-TASKS`. Replace or accompany with the actual parent issue URL.
Minimal tasks, personal/team views, recurrence, comments/files and operational links. No portfolio planning or duplication of workflow execution jobs.

## Current state / reuse evidence

Before publishing, add verified owner, source paths, related issue/PRs and missing delta. Current implementation is not established by this ticket specification. If already covered, map that evidence rather than opening duplicate work.

## Dependencies

Hard prerequisites: `TASK-01`, `PLAT-03`. Resolve to real issues or verified existing equivalents.

## Acceptance criteria

- [ ] My work filters today/overdue/upcoming using the user workspace timezone; team views require manager permissions.
- [ ] Board/list share records and filters; status changes use the same guarded server command.
- [ ] Views include search, empty/loading/error/retry states and keyboard alternatives to drag-and-drop.
- [ ] Counts match visible records and workspace changes rescope or clear caches.

## Verification

Date/filter/query tests, board/list consistency, mobile and keyboard checks.

## Definition of Done

- [ ] Reuse and ownership evidence is recorded; only the scoped missing delta is implemented and existing behavior is preserved.
- [ ] Applicable permission/isolation, replay/concurrency and UI/error-state checks pass; commands, results and skips are reported accurately.
- [ ] Documentation and source/decision links are updated; no unsupported readiness, compliance, customer-validation or test claims.
- [ ] Acceptance criteria are demonstrated with evidence; planning or issue creation alone does not complete delivery.

---

## [P1][TASK-03] Generate recurring opening and closing checklists

<!-- corely-backlog:corely-internal-ops-v1:TASK-03 -->

**Planning key:** `TASK-03`\
**Type:** Feature\
**Catalog scope:** P1 — focused launch\
**App/area:** #01 Corely Tasks\
**Research basis:** Supplied Corely_App_Catalog_and_Recommendations.md, app profiles #01; Corely_Documentation_Alignment_Prompt.md and later focused-launch refinement\
**Specification status:** Proposed planning; current implementation must be reconciled before publishing.

## Outcome

Routine work recurs reliably without duplicate daily tasks.

## Parent and scope

Parent planning key: `EP-TASKS`. Replace or accompany with the actual parent issue URL.
Minimal tasks, personal/team views, recurrence, comments/files and operational links. No portfolio planning or duplication of workflow execution jobs.

## Current state / reuse evidence

Before publishing, add verified owner, source paths, related issue/PRs and missing delta. Current implementation is not established by this ticket specification. If already covered, map that evidence rather than opening duplicate work.

## Dependencies

Hard prerequisites: `TASK-01`, `PEOPLE-02`. Resolve to real issues or verified existing equivalents.

## Acceptance criteria

- [ ] Managers publish simple daily/selected-weekday templates with timezone, effective dates and assignees; edits affect future instances only.
- [ ] A deterministic occurrence identity prevents duplication on parallel/delayed/retried background runs.
- [ ] Pause/end, skipped occurrence, inactive assignee and bounded catch-up behavior are explicit.
- [ ] DST and local-day rollover are tested; completing an instance never rewrites its template.

## Verification

Frozen-clock recurrence/DST tests, parallel replay and template-to-completion E2E.

## Definition of Done

- [ ] Reuse and ownership evidence is recorded; only the scoped missing delta is implemented and existing behavior is preserved.
- [ ] Applicable permission/isolation, replay/concurrency and UI/error-state checks pass; commands, results and skips are reported accurately.
- [ ] Documentation and source/decision links are updated; no unsupported readiness, compliance, customer-validation or test claims.
- [ ] Acceptance criteria are demonstrated with evidence; planning or issue creation alone does not complete delivery.

---

## [P1][TASK-04] Attach context and link operational follow-up work

<!-- corely-backlog:corely-internal-ops-v1:TASK-04 -->

**Planning key:** `TASK-04`\
**Type:** Feature\
**Catalog scope:** P1 — focused launch\
**App/area:** #01 Corely Tasks\
**Research basis:** Supplied Corely_App_Catalog_and_Recommendations.md, app profiles #01; Corely_Documentation_Alignment_Prompt.md and later focused-launch refinement\
**Specification status:** Proposed planning; current implementation must be reconciled before publishing.

## Outcome

Staff can finish work with relevant discussion, files and source records.

## Parent and scope

Parent planning key: `EP-TASKS`. Replace or accompany with the actual parent issue URL.
Minimal tasks, personal/team views, recurrence, comments/files and operational links. No portfolio planning or duplication of workflow execution jobs.

## Current state / reuse evidence

Before publishing, add verified owner, source paths, related issue/PRs and missing delta. Current implementation is not established by this ticket specification. If already covered, map that evidence rather than opening duplicate work.

## Dependencies

Hard prerequisites: `TASK-01`. Resolve to real issues or verified existing equivalents.

## Acceptance criteria

- [ ] Authorized comments/files reuse shared storage with source permissions and safe previews.
- [ ] Booking/request/procedure references are workspace-safe links; source domains keep state ownership.
- [ ] Revoked or deleted sources show an unavailable state without leaked cached text.
- [ ] Retried creation of the same follow-up does not duplicate tasks; audit traces the originating event/command.

## Verification

File/link authorization tests, missing-source UI and follow-up replay tests.

## Definition of Done

- [ ] Reuse and ownership evidence is recorded; only the scoped missing delta is implemented and existing behavior is preserved.
- [ ] Applicable permission/isolation, replay/concurrency and UI/error-state checks pass; commands, results and skips are reported accurately.
- [ ] Documentation and source/decision links are updated; no unsupported readiness, compliance, customer-validation or test claims.
- [ ] Acceptance criteria are demonstrated with evidence; planning or issue creation alone does not complete delivery.

---

## [P1][EPIC][EP-APPOINTMENTS] Corely Appointments and OpenBuk — dependable scheduling

<!-- corely-backlog:corely-internal-ops-v1:EP-APPOINTMENTS -->

**Planning key:** `EP-APPOINTMENTS`\
**Type:** Epic\
**Catalog scope:** P1 — focused launch\
**App/area:** #03 Corely Appointments\
**Research basis:** Supplied Corely_App_Catalog_and_Recommendations.md, app profiles #03; Corely_Documentation_Alignment_Prompt.md and later focused-launch refinement\
**Specification status:** Proposed planning; current implementation must be reconciled before publishing.

## Outcome

Staff operate a trustworthy daily agenda while the existing public booking journey remains intact.

## Scope and exclusions

Extend existing Booking/OpenBuk for the selected pilot mode. Preserve locks, holds and idempotency. No marketplace, deposits or universal calendar platform.

## Evidence / promotion gate

Staff/public writers share validated booking policy, observable notifications and tested public access controls.

## Current state / reuse evidence

Populate with inspected branch/commit/date, real source paths and existing issue/PR matches. Not yet verified for this proposed epic; do not infer absence from the plan. Preserve unrelated existing work.

## Children

Planning keys below must be replaced or accompanied by real issue references after reconciliation.

- [ ] `APT-01` — Extend services and eligible staff for a small team
- [ ] `APT-02` — Unify availability inputs and harden booking concurrency
- [ ] `APT-03` — Deliver the day/week agenda and reviewed booking lifecycle
- [ ] `APT-04` — Secure the existing guest booking and management journey
- [ ] `APT-05` — Deliver observable confirmations and reminders
- [ ] `APT-06` — Implement the selected import or calendar-connection path
- [ ] `APT-07` — Close public-booking abuse and isolation release gaps

## Exit criteria

- [ ] Each child is delivered, mapped to completed work with evidence, or explicitly not applicable by a recorded decision; unresolved delivery blockers remain visible.
- [ ] The end-to-end outcome and applicable security/privacy/reliability requirements are demonstrated, not inferred from issue closure alone.
- [ ] Scope/exclusions and any promotion gate are honored; remaining gaps and operational limitations are documented.
- [ ] Project membership, hierarchy and linked source/dependency records accurately reflect the reconciled backlog.

---

## [P1][APT-01] Extend services and eligible staff for a small team

<!-- corely-backlog:corely-internal-ops-v1:APT-01 -->

**Planning key:** `APT-01`\
**Type:** Feature\
**Catalog scope:** P1 — focused launch\
**App/area:** #03 Corely Appointments\
**Research basis:** Supplied Corely_App_Catalog_and_Recommendations.md, app profiles #03; Corely_Documentation_Alignment_Prompt.md and later focused-launch refinement\
**Specification status:** Proposed planning; current implementation must be reconciled before publishing.

## Outcome

Support a team without creating another catalog or staff master.

## Parent and scope

Parent planning key: `EP-APPOINTMENTS`. Replace or accompany with the actual parent issue URL.
Extend existing Booking/OpenBuk for the selected pilot mode. Preserve locks, holds and idempotency. No marketplace, deposits or universal calendar platform.

## Current state / reuse evidence

Before publishing, add verified owner, source paths, related issue/PRs and missing delta. Current implementation is not established by this ticket specification. If already covered, map that evidence rather than opening duplicate work.

## Dependencies

Hard prerequisites: `STR-01`, `PEOPLE-01`, `STR-03`. Resolve to real issues or verified existing equivalents.

## Acceptance criteria

- [ ] Managers configure multiple services and eligible staff using existing Booking models and Catalog enrichment interfaces where appropriate.
- [ ] Employee, bookable resource and offering IDs remain distinct and workspace-safe; current single-staff studios still work.
- [ ] Duration, buffers, monetary values and eligibility have shared deterministic validation.
- [ ] Archiving prevents new bookings while preserving snapshots and surfacing future commitments for review.

## Verification

Service/resource validation, historical-data regression and multi-service/staff setup E2E.

## Definition of Done

- [ ] Reuse and ownership evidence is recorded; only the scoped missing delta is implemented and existing behavior is preserved.
- [ ] Applicable permission/isolation, replay/concurrency and UI/error-state checks pass; commands, results and skips are reported accurately.
- [ ] Documentation and source/decision links are updated; no unsupported readiness, compliance, customer-validation or test claims.
- [ ] Acceptance criteria are demonstrated with evidence; planning or issue creation alone does not complete delivery.

---

## [P1][APT-02] Unify availability inputs and harden booking concurrency

<!-- corely-backlog:corely-internal-ops-v1:APT-02 -->

**Planning key:** `APT-02`\
**Type:** Feature\
**Catalog scope:** P1 — focused launch\
**App/area:** #03 Corely Appointments\
**Research basis:** Supplied Corely_App_Catalog_and_Recommendations.md, app profiles #03; Corely_Documentation_Alignment_Prompt.md and later focused-launch refinement\
**Specification status:** Proposed planning; current implementation must be reconciled before publishing.

## Outcome

Displayed slots and final writes obey the same authoritative rules.

## Parent and scope

Parent planning key: `EP-APPOINTMENTS`. Replace or accompany with the actual parent issue URL.
Extend existing Booking/OpenBuk for the selected pilot mode. Preserve locks, holds and idempotency. No marketplace, deposits or universal calendar platform.

## Current state / reuse evidence

Before publishing, add verified owner, source paths, related issue/PRs and missing delta. Current implementation is not established by this ticket specification. If already covered, map that evidence rather than opening duplicate work.

## Dependencies

Hard prerequisites: `APT-01`, `PEOPLE-02`. Resolve to real issues or verified existing equivalents.

## Specific notes

Reuse existing room/resource capability; do not expand to arbitrary booking categories without pilot evidence.

## Acceptance criteria

- [ ] Document precedence/freshness for working patterns, neutral absence blocks, eligibility, buffers, existing reservations and active holds.
- [ ] Create/reschedule reloads state under the existing shared transaction/locking policy; concurrent writers cannot double-book constrained resources.
- [ ] Changed-payload idempotency replay is rejected and booking/receipt/audit/outbox state commits or rolls back coherently.
- [ ] DST, adjacency, cancellations and expired holds are deterministic; internal reservations and customer appointments remain distinguishable.

## Verification

Disposable-Postgres race tests across OpenBuk and existing writers; DST/buffer/hold/rollback regressions.

## Definition of Done

- [ ] Reuse and ownership evidence is recorded; only the scoped missing delta is implemented and existing behavior is preserved.
- [ ] Applicable permission/isolation, replay/concurrency and UI/error-state checks pass; commands, results and skips are reported accurately.
- [ ] Documentation and source/decision links are updated; no unsupported readiness, compliance, customer-validation or test claims.
- [ ] Acceptance criteria are demonstrated with evidence; planning or issue creation alone does not complete delivery.

---

## [P1][APT-03] Deliver the day/week agenda and reviewed booking lifecycle

<!-- corely-backlog:corely-internal-ops-v1:APT-03 -->

**Planning key:** `APT-03`\
**Type:** Feature\
**Catalog scope:** P1 — focused launch\
**App/area:** #03 Corely Appointments\
**Research basis:** Supplied Corely_App_Catalog_and_Recommendations.md, app profiles #03; Corely_Documentation_Alignment_Prompt.md and later focused-launch refinement\
**Specification status:** Proposed planning; current implementation must be reconciled before publishing.

## Outcome

Managers can create, move and cancel work from a reliable daily view.

## Parent and scope

Parent planning key: `EP-APPOINTMENTS`. Replace or accompany with the actual parent issue URL.
Extend existing Booking/OpenBuk for the selected pilot mode. Preserve locks, holds and idempotency. No marketplace, deposits or universal calendar platform.

## Current state / reuse evidence

Before publishing, add verified owner, source paths, related issue/PRs and missing delta. Current implementation is not established by this ticket specification. If already covered, map that evidence rather than opening duplicate work.

## Dependencies

Hard prerequisites: `APT-02`, `PLAT-03`. Resolve to real issues or verified existing equivalents.

## Acceptance criteria

- [ ] Authorized day/week views show staff/resource availability and appointments with timezone and empty/loading/error/stale states.
- [ ] Create/reschedule/cancel uses existing guarded commands; stale slot conflict preserves the draft and explains correction options.
- [ ] Actions show effects and require appropriate confirmation; schedule edits never silently cancel or reassign appointments.
- [ ] Guest/Party associations follow a safe explicit resolution policy without fuzzy auto-merging or exposing unrelated customer history.

## Verification

Lifecycle E2E, stale-conflict handling, mobile/keyboard alternatives and customer-scope negatives.

## Definition of Done

- [ ] Reuse and ownership evidence is recorded; only the scoped missing delta is implemented and existing behavior is preserved.
- [ ] Applicable permission/isolation, replay/concurrency and UI/error-state checks pass; commands, results and skips are reported accurately.
- [ ] Documentation and source/decision links are updated; no unsupported readiness, compliance, customer-validation or test claims.
- [ ] Acceptance criteria are demonstrated with evidence; planning or issue creation alone does not complete delivery.

---

## [P1][APT-04] Secure the existing guest booking and management journey

<!-- corely-backlog:corely-internal-ops-v1:APT-04 -->

**Planning key:** `APT-04`\
**Type:** Feature\
**Catalog scope:** P1 — focused launch\
**App/area:** #03 Corely Appointments\
**Research basis:** Supplied Corely_App_Catalog_and_Recommendations.md, app profiles #03; Corely_Documentation_Alignment_Prompt.md and later focused-launch refinement\
**Specification status:** Proposed planning; current implementation must be reconciled before publishing.

## Outcome

Customers manage only their own booking without access to workspace records.

## Parent and scope

Parent planning key: `EP-APPOINTMENTS`. Replace or accompany with the actual parent issue URL.
Extend existing Booking/OpenBuk for the selected pilot mode. Preserve locks, holds and idempotency. No marketplace, deposits or universal calendar platform.

## Current state / reuse evidence

Before publishing, add verified owner, source paths, related issue/PRs and missing delta. Current implementation is not established by this ticket specification. If already covered, map that evidence rather than opening duplicate work.

## Dependencies

Hard prerequisites: `APT-02`, `STR-03`. Resolve to real issues or verified existing equivalents.

## Acceptance criteria

- [ ] Use opaque scoped management tokens with expiry/revocation; public responses expose no tenant/workspace IDs or unnecessary personal information.
- [ ] Confirmation, cancellation and rescheduling obey studio policy and the same availability checks as staff writes.
- [ ] Forged/expired/replayed tokens have safe outcomes and tokens are redacted from logs.
- [ ] Preserve existing EN/DE/VI and legacy-route exclusion; companion-mode pilots do not gain a competing public writer by accident.

## Verification

Token scope/replay/revocation and legacy bypass tests; guest booking-to-management E2E.

## Definition of Done

- [ ] Reuse and ownership evidence is recorded; only the scoped missing delta is implemented and existing behavior is preserved.
- [ ] Applicable permission/isolation, replay/concurrency and UI/error-state checks pass; commands, results and skips are reported accurately.
- [ ] Documentation and source/decision links are updated; no unsupported readiness, compliance, customer-validation or test claims.
- [ ] Acceptance criteria are demonstrated with evidence; planning or issue creation alone does not complete delivery.

---

## [P1][APT-05] Deliver observable confirmations and reminders

<!-- corely-backlog:corely-internal-ops-v1:APT-05 -->

**Planning key:** `APT-05`\
**Type:** Feature\
**Catalog scope:** P1 — focused launch\
**App/area:** #03 Corely Appointments\
**Research basis:** Supplied Corely_App_Catalog_and_Recommendations.md, app profiles #03; Corely_Documentation_Alignment_Prompt.md and later focused-launch refinement\
**Specification status:** Proposed planning; current implementation must be reconciled before publishing.

## Outcome

A booking event becomes a verified delivery outcome, not an assumed email.

## Parent and scope

Parent planning key: `EP-APPOINTMENTS`. Replace or accompany with the actual parent issue URL.
Extend existing Booking/OpenBuk for the selected pilot mode. Preserve locks, holds and idempotency. No marketplace, deposits or universal calendar platform.

## Current state / reuse evidence

Before publishing, add verified owner, source paths, related issue/PRs and missing delta. Current implementation is not established by this ticket specification. If already covered, map that evidence rather than opening duplicate work.

## Dependencies

Hard prerequisites: `APT-03`, `APT-04`. Resolve to real issues or verified existing equivalents.

## Acceptance criteria

- [ ] Messages run after committed state through existing notifications and API-hosted background execution, never inside the business transaction.
- [ ] Delivery is deduplicated, bounded/retryable and traceable; reschedule/cancel invalidates obsolete reminders.
- [ ] Recipients, locale, timezone and preferences follow explicit policy; sensitive customer updates remain reviewed.
- [ ] Provider failure is visible without undoing valid booking state; acceptance uses isolated sinks and no real customer contacts.

## Verification

Redelivery/provider-failure/cancellation tests, locale snapshots and isolated message delivery E2E.

## Definition of Done

- [ ] Reuse and ownership evidence is recorded; only the scoped missing delta is implemented and existing behavior is preserved.
- [ ] Applicable permission/isolation, replay/concurrency and UI/error-state checks pass; commands, results and skips are reported accurately.
- [ ] Documentation and source/decision links are updated; no unsupported readiness, compliance, customer-validation or test claims.
- [ ] Acceptance criteria are demonstrated with evidence; planning or issue creation alone does not complete delivery.

---

## [P1][APT-06] Implement the selected import or calendar-connection path

<!-- corely-backlog:corely-internal-ops-v1:APT-06 -->

**Planning key:** `APT-06`\
**Type:** Feature\
**Catalog scope:** P1 — focused launch\
**App/area:** #03 Corely Appointments\
**Research basis:** Supplied Corely_App_Catalog_and_Recommendations.md, app profiles #03; Corely_Documentation_Alignment_Prompt.md and later focused-launch refinement\
**Specification status:** Proposed planning; current implementation must be reconciled before publishing.

## Outcome

Adoption avoids duplicated scheduling and preserves a single authority.

## Parent and scope

Parent planning key: `EP-APPOINTMENTS`. Replace or accompany with the actual parent issue URL.
Extend existing Booking/OpenBuk for the selected pilot mode. Preserve locks, holds and idempotency. No marketplace, deposits or universal calendar platform.

## Current state / reuse evidence

Before publishing, add verified owner, source paths, related issue/PRs and missing delta. Current implementation is not established by this ticket specification. If already covered, map that evidence rather than opening duplicate work.

## Dependencies

Hard prerequisites: `STR-03`, `APT-02`, `PLAT-04`. Resolve to real issues or verified existing equivalents.

## Acceptance criteria

- [ ] Implement only STR-03’s selected path; replacement previews/imports with stable IDs and row-level errors, while companion mode uses one verified provider.
- [ ] Import retries or sync event replay are idempotent; timezone mapping, duplicate detection and conflict handling are explicit.
- [ ] For a connector, least-privilege credentials, revocation, freshness and read/write limits reuse existing integration infrastructure.
- [ ] Record unchosen criteria as not applicable with evidence; absence of a needed import/connector can satisfy the ticket by an explicit pilot decision.

## Verification

Selected-path retry/replay, missing-access, timezone and failed-cutover/sync tests; do not build both paths.

## Definition of Done

- [ ] Reuse and ownership evidence is recorded; only the scoped missing delta is implemented and existing behavior is preserved.
- [ ] Applicable permission/isolation, replay/concurrency and UI/error-state checks pass; commands, results and skips are reported accurately.
- [ ] Documentation and source/decision links are updated; no unsupported readiness, compliance, customer-validation or test claims.
- [ ] Acceptance criteria are demonstrated with evidence; planning or issue creation alone does not complete delivery.

---

## [P1][APT-07] Close public-booking abuse and isolation release gaps

<!-- corely-backlog:corely-internal-ops-v1:APT-07 -->

**Planning key:** `APT-07`\
**Type:** Feature\
**Catalog scope:** P1 — focused launch\
**App/area:** #03 Corely Appointments\
**Research basis:** Supplied Corely_App_Catalog_and_Recommendations.md, app profiles #03; Corely_Documentation_Alignment_Prompt.md and later focused-launch refinement\
**Specification status:** Proposed planning; current implementation must be reconciled before publishing.

## Outcome

Public routes cannot bypass booking policy or expose another studio.

## Parent and scope

Parent planning key: `EP-APPOINTMENTS`. Replace or accompany with the actual parent issue URL.
Extend existing Booking/OpenBuk for the selected pilot mode. Preserve locks, holds and idempotency. No marketplace, deposits or universal calendar platform.

## Current state / reuse evidence

Before publishing, add verified owner, source paths, related issue/PRs and missing delta. Current implementation is not established by this ticket specification. If already covered, map that evidence rather than opening duplicate work.

## Dependencies

Hard prerequisites: `APT-04`. Resolve to real issues or verified existing equivalents.

## Acceptance criteria

- [ ] Trusted public resolution derives workspace authority; crafted cross-studio IDs and legacy endpoints cannot bypass OpenBuk rules.
- [ ] Rate/abuse controls work across API instances using an existing suitable mechanism with documented limits and failure behavior.
- [ ] Errors do not leak customer/booking existence and valid idempotent retries remain usable.
- [ ] Enumeration, token misuse and parallel abuse are tested; unresolved findings remain visible release blockers.

## Verification

Shared-limit/multi-instance tests, public isolation and security review evidence.

## Definition of Done

- [ ] Reuse and ownership evidence is recorded; only the scoped missing delta is implemented and existing behavior is preserved.
- [ ] Applicable permission/isolation, replay/concurrency and UI/error-state checks pass; commands, results and skips are reported accurately.
- [ ] Documentation and source/decision links are updated; no unsupported readiness, compliance, customer-validation or test claims.
- [ ] Acceptance criteria are demonstrated with evidence; planning or issue creation alone does not complete delivery.

---

## [P1][EPIC][EP-KNOWLEDGE] Corely Knowledge — private approved procedures

<!-- corely-backlog:corely-internal-ops-v1:EP-KNOWLEDGE -->

**Planning key:** `EP-KNOWLEDGE`\
**Type:** Epic\
**Catalog scope:** P1 — focused launch\
**App/area:** #05 Corely Knowledge\
**Research basis:** Supplied Corely_App_Catalog_and_Recommendations.md, app profiles #05; Corely_Documentation_Alignment_Prompt.md and later focused-launch refinement\
**Specification status:** Proposed planning; current implementation must be reconciled before publishing.

## Outcome

Staff and AI find current authorized operating instructions without a full wiki.

## Scope and exclusions

Small page/link/file collection, publication/ownership and cited answers. Private policy access is distinct from existing public guides.

## Evidence / promotion gate

Approved instructions are permission-filtered and answers cite sources or explicitly abstain.

## Current state / reuse evidence

Populate with inspected branch/commit/date, real source paths and existing issue/PR matches. Not yet verified for this proposed epic; do not infer absence from the plan. Preserve unrelated existing work.

## Children

Planning keys below must be replaced or accompanied by real issue references after reconciliation.

- [ ] `KNOW-01` — Publish a minimal private policy/procedure collection
- [ ] `KNOW-02` — Find procedures and link them from operational work
- [ ] `KNOW-03` — Answer policy questions with accessible source citations

## Exit criteria

- [ ] Each child is delivered, mapped to completed work with evidence, or explicitly not applicable by a recorded decision; unresolved delivery blockers remain visible.
- [ ] The end-to-end outcome and applicable security/privacy/reliability requirements are demonstrated, not inferred from issue closure alone.
- [ ] Scope/exclusions and any promotion gate are honored; remaining gaps and operational limitations are documented.
- [ ] Project membership, hierarchy and linked source/dependency records accurately reflect the reconciled backlog.

---

## [P1][KNOW-01] Publish a minimal private policy/procedure collection

<!-- corely-backlog:corely-internal-ops-v1:KNOW-01 -->

**Planning key:** `KNOW-01`\
**Type:** Feature\
**Catalog scope:** P1 — focused launch\
**App/area:** #05 Corely Knowledge\
**Research basis:** Supplied Corely_App_Catalog_and_Recommendations.md, app profiles #05; Corely_Documentation_Alignment_Prompt.md and later focused-launch refinement\
**Specification status:** Proposed planning; current implementation must be reconciled before publishing.

## Outcome

Give approved operating instructions an owner and a visible publication state.

## Parent and scope

Parent planning key: `EP-KNOWLEDGE`. Replace or accompany with the actual parent issue URL.
Small page/link/file collection, publication/ownership and cited answers. Private policy access is distinct from existing public guides.

## Current state / reuse evidence

Before publishing, add verified owner, source paths, related issue/PRs and missing delta. Current implementation is not established by this ticket specification. If already covered, map that evidence rather than opening duplicate work.

## Dependencies

Hard prerequisites: `STR-01`, `PLAT-02`. Resolve to real issues or verified existing equivalents.

## Specific notes

Reinspect existing issue #130, which covers Articles/FAQ/Glossary and public pages with P0 metadata. Preserve its intent/priority; relate it or reuse only genuinely matching scope.

## Acceptance criteria

- [ ] Owners create simple pages/external links/files, publish versions and set review dates; drafts/archives stay out of ordinary staff results.
- [ ] Private content defaults to internal access and never inherits public publication from existing guides/CMS routes.
- [ ] Version, owner and review metadata remain visible; external links are references, not automatic synchronized external-document retrieval.
- [ ] Reuse actual storage/knowledge capabilities; no collaborative editor or mandatory FAQ/glossary expansion.

## Verification

Publication, version, private/public access tests and author-to-reader UI flow.

## Definition of Done

- [ ] Reuse and ownership evidence is recorded; only the scoped missing delta is implemented and existing behavior is preserved.
- [ ] Applicable permission/isolation, replay/concurrency and UI/error-state checks pass; commands, results and skips are reported accurately.
- [ ] Documentation and source/decision links are updated; no unsupported readiness, compliance, customer-validation or test claims.
- [ ] Acceptance criteria are demonstrated with evidence; planning or issue creation alone does not complete delivery.

---

## [P1][KNOW-02] Find procedures and link them from operational work

<!-- corely-backlog:corely-internal-ops-v1:KNOW-02 -->

**Planning key:** `KNOW-02`\
**Type:** Feature\
**Catalog scope:** P1 — focused launch\
**App/area:** #05 Corely Knowledge\
**Research basis:** Supplied Corely_App_Catalog_and_Recommendations.md, app profiles #05; Corely_Documentation_Alignment_Prompt.md and later focused-launch refinement\
**Specification status:** Proposed planning; current implementation must be reconciled before publishing.

## Outcome

Staff open the relevant instructions from a task or request.

## Parent and scope

Parent planning key: `EP-KNOWLEDGE`. Replace or accompany with the actual parent issue URL.
Small page/link/file collection, publication/ownership and cited answers. Private policy access is distinct from existing public guides.

## Current state / reuse evidence

Before publishing, add verified owner, source paths, related issue/PRs and missing delta. Current implementation is not established by this ticket specification. If already covered, map that evidence rather than opening duplicate work.

## Dependencies

Hard prerequisites: `KNOW-01`, `TASK-04`, `REQ-01`. Resolve to real issues or verified existing equivalents.

## Acceptance criteria

- [ ] Permission-filtered search/list/detail returns published content with ownership and stale-review warnings.
- [ ] Task/request references follow an explicit current-versus-versioned link policy and recheck permissions on previews.
- [ ] Archiving, deletion or revocation removes cached/search excerpts without leaking titles or private text.
- [ ] No-results and failure states differ and the manual reading path works on mobile and keyboard.

## Verification

Search ACL/cache invalidation and task-to-procedure E2E.

## Definition of Done

- [ ] Reuse and ownership evidence is recorded; only the scoped missing delta is implemented and existing behavior is preserved.
- [ ] Applicable permission/isolation, replay/concurrency and UI/error-state checks pass; commands, results and skips are reported accurately.
- [ ] Documentation and source/decision links are updated; no unsupported readiness, compliance, customer-validation or test claims.
- [ ] Acceptance criteria are demonstrated with evidence; planning or issue creation alone does not complete delivery.

---

## [P1][KNOW-03] Answer policy questions with accessible source citations

<!-- corely-backlog:corely-internal-ops-v1:KNOW-03 -->

**Planning key:** `KNOW-03`\
**Type:** Feature\
**Catalog scope:** P1 — focused launch\
**App/area:** #05 Corely Knowledge\
**Research basis:** Supplied Corely_App_Catalog_and_Recommendations.md, app profiles #05; Corely_Documentation_Alignment_Prompt.md and later focused-launch refinement\
**Specification status:** Proposed planning; current implementation must be reconciled before publishing.

## Outcome

AI helps use company instructions without inventing them.

## Parent and scope

Parent planning key: `EP-KNOWLEDGE`. Replace or accompany with the actual parent issue URL.
Small page/link/file collection, publication/ownership and cited answers. Private policy access is distinct from existing public guides.

## Current state / reuse evidence

Before publishing, add verified owner, source paths, related issue/PRs and missing delta. Current implementation is not established by this ticket specification. If already covered, map that evidence rather than opening duplicate work.

## Dependencies

Hard prerequisites: `KNOW-02`, `OPS-01`. Resolve to real issues or verified existing equivalents.

## Acceptance criteria

- [ ] Answers cite permitted source passages/version and mark stale or missing information.
- [ ] Unsupported questions explicitly report insufficient evidence; no private HR inference or fabricated policy.
- [ ] Retrieval and source access recheck permissions and ignore malicious instructions embedded in documents.
- [ ] Manual search remains useful if AI is disabled or unavailable; evaluations include supported and unanswerable questions.

## Verification

Grounding/abstention evaluation, prompt-injection and tenant-leakage tests, provider-disabled UI.

## Definition of Done

- [ ] Reuse and ownership evidence is recorded; only the scoped missing delta is implemented and existing behavior is preserved.
- [ ] Applicable permission/isolation, replay/concurrency and UI/error-state checks pass; commands, results and skips are reported accurately.
- [ ] Documentation and source/decision links are updated; no unsupported readiness, compliance, customer-validation or test claims.
- [ ] Acceptance criteria are demonstrated with evidence; planning or issue creation alone does not complete delivery.

---

## [P1][EPIC][EP-CONNECTED] Connect daily operations with controlled AI assistance

<!-- corely-backlog:corely-internal-ops-v1:EP-CONNECTED -->

**Planning key:** `EP-CONNECTED`\
**Type:** Epic\
**Catalog scope:** P1 — focused launch\
**App/area:** Shared product/platform work (not a separate app)\
**Research basis:** Supplied Corely_Documentation_Alignment_Prompt.md and later focused-launch refinement; Corely_App_Catalog_and_Recommendations.md shared-platform/release recommendations\
**Specification status:** Proposed planning; current implementation must be reconciled before publishing.

## Outcome

One daily workflow crosses apps without duplicate records or silent actions.

## Scope and exclusions

Reuse the copilot, tools and events for Today, neutral absence effects, sourced briefings and reviewed plans. No autonomous staffing optimization.

## Evidence / promotion gate

Normal-day and absence flows execute authorized owning-domain commands with visible partial failure and manual fallback.

## Current state / reuse evidence

Populate with inspected branch/commit/date, real source paths and existing issue/PR matches. Not yet verified for this proposed epic; do not infer absence from the plan. Preserve unrelated existing work.

## Children

Planning keys below must be replaced or accompanied by real issue references after reconciliation.

- [ ] `OPS-01` — Expose authorized operational tools through the existing copilot
- [ ] `OPS-02` — Propagate approved absence into scheduling conflict review
- [ ] `OPS-03` — Build the Today view and operational exception inbox
- [ ] `OPS-04` — Generate a source-linked morning operations briefing
- [ ] `OPS-05` — Preview and apply manager-reviewed resolution plans

## Exit criteria

- [ ] Each child is delivered, mapped to completed work with evidence, or explicitly not applicable by a recorded decision; unresolved delivery blockers remain visible.
- [ ] The end-to-end outcome and applicable security/privacy/reliability requirements are demonstrated, not inferred from issue closure alone.
- [ ] Scope/exclusions and any promotion gate are honored; remaining gaps and operational limitations are documented.
- [ ] Project membership, hierarchy and linked source/dependency records accurately reflect the reconciled backlog.

---

## [P1][OPS-01] Expose authorized operational tools through the existing copilot

<!-- corely-backlog:corely-internal-ops-v1:OPS-01 -->

**Planning key:** `OPS-01`\
**Type:** Feature\
**Catalog scope:** P1 — focused launch\
**App/area:** Shared product/platform work (not a separate app)\
**Research basis:** Supplied Corely_Documentation_Alignment_Prompt.md and later focused-launch refinement; Corely_App_Catalog_and_Recommendations.md shared-platform/release recommendations\
**Specification status:** Proposed planning; current implementation must be reconciled before publishing.

## Outcome

AI and UI use the same controlled business commands.

## Parent and scope

Parent planning key: `EP-CONNECTED`. Replace or accompany with the actual parent issue URL.
Reuse the copilot, tools and events for Today, neutral absence effects, sourced briefings and reviewed plans. No autonomous staffing optimization.

## Current state / reuse evidence

Before publishing, add verified owner, source paths, related issue/PRs and missing delta. Current implementation is not established by this ticket specification. If already covered, map that evidence rather than opening duplicate work.

## Dependencies

Hard prerequisites: `STR-01`, `PLAT-02`. Resolve to real issues or verified existing equivalents.

## Acceptance criteria

- [ ] Typed read/propose/apply tools reuse the registry; trusted server context supplies actor/tenant/workspace, not untrusted model input.
- [ ] Reads filter permissions; apply rechecks access, version and invariants through existing owning use cases, never direct database writes.
- [ ] Sensitive/outbound changes require approval of the exact proposal; tools cannot grant roles or override policy.
- [ ] Runs have redacted provenance, safe retries and bounded usage; separately configured deterministic automations retain their explicit policy.

## Verification

Contract/access/stale-version tests, adversarial tool input, redacted audit and AI-disabled checks.

## Definition of Done

- [ ] Reuse and ownership evidence is recorded; only the scoped missing delta is implemented and existing behavior is preserved.
- [ ] Applicable permission/isolation, replay/concurrency and UI/error-state checks pass; commands, results and skips are reported accurately.
- [ ] Documentation and source/decision links are updated; no unsupported readiness, compliance, customer-validation or test claims.
- [ ] Acceptance criteria are demonstrated with evidence; planning or issue creation alone does not complete delivery.

---

## [P1][OPS-02] Propagate approved absence into scheduling conflict review

<!-- corely-backlog:corely-internal-ops-v1:OPS-02 -->

**Planning key:** `OPS-02`\
**Type:** Feature\
**Catalog scope:** P1 — focused launch\
**App/area:** Shared product/platform work (not a separate app)\
**Research basis:** Supplied Corely_Documentation_Alignment_Prompt.md and later focused-launch refinement; Corely_App_Catalog_and_Recommendations.md shared-platform/release recommendations\
**Specification status:** Proposed planning; current implementation must be reconciled before publishing.

## Outcome

A staffing change becomes a visible operational exception.

## Parent and scope

Parent planning key: `EP-CONNECTED`. Replace or accompany with the actual parent issue URL.
Reuse the copilot, tools and events for Today, neutral absence effects, sourced briefings and reviewed plans. No autonomous staffing optimization.

## Current state / reuse evidence

Before publishing, add verified owner, source paths, related issue/PRs and missing delta. Current implementation is not established by this ticket specification. If already covered, map that evidence rather than opening duplicate work.

## Dependencies

Hard prerequisites: `REQ-02`, `PEOPLE-03`, `APT-02`, `TASK-04`. Resolve to real issues or verified existing equivalents.

## Acceptance criteria

- [ ] Requests hand off to People once; validated absence updates authoritative availability to prevent future conflicting bookings.
- [ ] Existing affected bookings/work appear as manager exceptions without automatic cancellation, reassignment or customer messages.
- [ ] Correction/cancellation and out-of-order/repeated events converge on latest state without duplicate blocks/tasks.
- [ ] Private reasons stay out of projections/AI/notifications; stale or failed propagation is visible and retryable.

## Verification

Approval-to-conflict E2E, reorder/replay/correction tests and privacy negatives.

## Definition of Done

- [ ] Reuse and ownership evidence is recorded; only the scoped missing delta is implemented and existing behavior is preserved.
- [ ] Applicable permission/isolation, replay/concurrency and UI/error-state checks pass; commands, results and skips are reported accurately.
- [ ] Documentation and source/decision links are updated; no unsupported readiness, compliance, customer-validation or test claims.
- [ ] Acceptance criteria are demonstrated with evidence; planning or issue creation alone does not complete delivery.

---

## [P1][OPS-03] Build the Today view and operational exception inbox

<!-- corely-backlog:corely-internal-ops-v1:OPS-03 -->

**Planning key:** `OPS-03`\
**Type:** Feature\
**Catalog scope:** P1 — focused launch\
**App/area:** Shared product/platform work (not a separate app)\
**Research basis:** Supplied Corely_Documentation_Alignment_Prompt.md and later focused-launch refinement; Corely_App_Catalog_and_Recommendations.md shared-platform/release recommendations\
**Specification status:** Proposed planning; current implementation must be reconciled before publishing.

## Outcome

Team members see appointments, work and decisions together.

## Parent and scope

Parent planning key: `EP-CONNECTED`. Replace or accompany with the actual parent issue URL.
Reuse the copilot, tools and events for Today, neutral absence effects, sourced briefings and reviewed plans. No autonomous staffing optimization.

## Current state / reuse evidence

Before publishing, add verified owner, source paths, related issue/PRs and missing delta. Current implementation is not established by this ticket specification. If already covered, map that evidence rather than opening duplicate work.

## Dependencies

Hard prerequisites: `TASK-02`, `REQ-03`, `APT-03`, `PLAT-03`. Resolve to real issues or verified existing equivalents.

## Acceptance criteria

- [ ] Today combines permitted appointments, tasks, decisions and available exceptions under deterministic local-day filters.
- [ ] Entries link to their owning app; actions recheck authorization and summaries exclude private fields.
- [ ] Counts reconcile to source records; delayed/unavailable sources show freshness rather than false empty results.
- [ ] Disabled apps and AI outages leave a useful manual view; projection rebuilds do not write other domains’ tables.

## Verification

Projection reconciliation/rebuild/source-failure tests and staff/manager daily-work E2E.

## Definition of Done

- [ ] Reuse and ownership evidence is recorded; only the scoped missing delta is implemented and existing behavior is preserved.
- [ ] Applicable permission/isolation, replay/concurrency and UI/error-state checks pass; commands, results and skips are reported accurately.
- [ ] Documentation and source/decision links are updated; no unsupported readiness, compliance, customer-validation or test claims.
- [ ] Acceptance criteria are demonstrated with evidence; planning or issue creation alone does not complete delivery.

---

## [P1][OPS-04] Generate a source-linked morning operations briefing

<!-- corely-backlog:corely-internal-ops-v1:OPS-04 -->

**Planning key:** `OPS-04`\
**Type:** Feature\
**Catalog scope:** P1 — focused launch\
**App/area:** Shared product/platform work (not a separate app)\
**Research basis:** Supplied Corely_Documentation_Alignment_Prompt.md and later focused-launch refinement; Corely_App_Catalog_and_Recommendations.md shared-platform/release recommendations\
**Specification status:** Proposed planning; current implementation must be reconciled before publishing.

## Outcome

Managers understand relevant exceptions without opening every app.

## Parent and scope

Parent planning key: `EP-CONNECTED`. Replace or accompany with the actual parent issue URL.
Reuse the copilot, tools and events for Today, neutral absence effects, sourced briefings and reviewed plans. No autonomous staffing optimization.

## Current state / reuse evidence

Before publishing, add verified owner, source paths, related issue/PRs and missing delta. Current implementation is not established by this ticket specification. If already covered, map that evidence rather than opening duplicate work.

## Dependencies

Hard prerequisites: `OPS-01`, `OPS-02`, `OPS-03`. Resolve to real issues or verified existing equivalents.

## Acceptance criteria

- [ ] Actionable statements about appointments/tasks/decisions link to accessible source records.
- [ ] Freshness, missing sources and uncertainties are explicit; stale data is not asserted as current fact.
- [ ] Private personnel/customer details and note-based prompt injection cannot bypass retrieval/tool policies.
- [ ] Measure useful completions, correction/review effort and cost/latency without employee scoring; manual view remains available.

## Verification

Fixed-fixture factual/citation evaluation, role-specific cases and provider/source-failure tests.

## Definition of Done

- [ ] Reuse and ownership evidence is recorded; only the scoped missing delta is implemented and existing behavior is preserved.
- [ ] Applicable permission/isolation, replay/concurrency and UI/error-state checks pass; commands, results and skips are reported accurately.
- [ ] Documentation and source/decision links are updated; no unsupported readiness, compliance, customer-validation or test claims.
- [ ] Acceptance criteria are demonstrated with evidence; planning or issue creation alone does not complete delivery.

---

## [P1][OPS-05] Preview and apply manager-reviewed resolution plans

<!-- corely-backlog:corely-internal-ops-v1:OPS-05 -->

**Planning key:** `OPS-05`\
**Type:** Feature\
**Catalog scope:** P1 — focused launch\
**App/area:** Shared product/platform work (not a separate app)\
**Research basis:** Supplied Corely_Documentation_Alignment_Prompt.md and later focused-launch refinement; Corely_App_Catalog_and_Recommendations.md shared-platform/release recommendations\
**Specification status:** Proposed planning; current implementation must be reconciled before publishing.

## Outcome

AI reduces coordination while the manager controls consequential changes.

## Parent and scope

Parent planning key: `EP-CONNECTED`. Replace or accompany with the actual parent issue URL.
Reuse the copilot, tools and events for Today, neutral absence effects, sourced briefings and reviewed plans. No autonomous staffing optimization.

## Current state / reuse evidence

Before publishing, add verified owner, source paths, related issue/PRs and missing delta. Current implementation is not established by this ticket specification. If already covered, map that evidence rather than opening duplicate work.

## Dependencies

Hard prerequisites: `OPS-01`, `OPS-02`, `OPS-03`, `APT-05`. Resolve to real issues or verified existing equivalents.

## Acceptance criteria

- [ ] A proposal lists affected records, intended reschedules/task changes and message drafts/recipients; preview performs no mutation or delivery.
- [ ] Apply revalidates permissions, versions and booking constraints; stale plans require renewed review.
- [ ] Users approve/reject specific changes and see per-action results; retries cannot duplicate work or messages.
- [ ] Cross-module partial failures are visible with recovery instructions rather than a false global-transaction promise; messages reflect confirmed resulting state.

## Verification

Read-only preview, stale-plan/concurrent-booking, partial-failure/replay and explicit-send E2E.

## Definition of Done

- [ ] Reuse and ownership evidence is recorded; only the scoped missing delta is implemented and existing behavior is preserved.
- [ ] Applicable permission/isolation, replay/concurrency and UI/error-state checks pass; commands, results and skips are reported accurately.
- [ ] Documentation and source/decision links are updated; no unsupported readiness, compliance, customer-validation or test claims.
- [ ] Acceptance criteria are demonstrated with evidence; planning or issue creation alone does not complete delivery.

---

## [P1][EPIC][EP-RELEASE] Verify pilot readiness and recoverability

<!-- corely-backlog:corely-internal-ops-v1:EP-RELEASE -->

**Planning key:** `EP-RELEASE`\
**Type:** Epic\
**Catalog scope:** P1 — focused launch\
**App/area:** Shared product/platform work (not a separate app)\
**Research basis:** Supplied Corely_Documentation_Alignment_Prompt.md and later focused-launch refinement; Corely_App_Catalog_and_Recommendations.md shared-platform/release recommendations\
**Specification status:** Proposed planning; current implementation must be reconciled before publishing.

## Outcome

Demonstrate usable, secure workflows and operating procedures before pilot expansion.

## Scope and exclusions

Cross-app regression, locale/accessibility, recovery and actual pilot review; no blanket legal/compliance certification.

## Evidence / promotion gate

Required tests and drills are evidenced, blockers are visible and expansion follows real pilot results.

## Current state / reuse evidence

Populate with inspected branch/commit/date, real source paths and existing issue/PR matches. Not yet verified for this proposed epic; do not infer absence from the plan. Preserve unrelated existing work.

## Children

Planning keys below must be replaced or accompanied by real issue references after reconciliation.

- [ ] `REL-01` — Verify complete pilot workflows and critical regressions
- [ ] `REL-02` — Complete mobile, accessibility and locale acceptance
- [ ] `REL-03` — Verify operational telemetry, restore and data-handling runbooks
- [ ] `REL-04` — Review pilot evidence and decide which P2 work to promote

## Exit criteria

- [ ] Each child is delivered, mapped to completed work with evidence, or explicitly not applicable by a recorded decision; unresolved delivery blockers remain visible.
- [ ] The end-to-end outcome and applicable security/privacy/reliability requirements are demonstrated, not inferred from issue closure alone.
- [ ] Scope/exclusions and any promotion gate are honored; remaining gaps and operational limitations are documented.
- [ ] Project membership, hierarchy and linked source/dependency records accurately reflect the reconciled backlog.

---

## [P1][REL-01] Verify complete pilot workflows and critical regressions

<!-- corely-backlog:corely-internal-ops-v1:REL-01 -->

**Planning key:** `REL-01`\
**Type:** Feature\
**Catalog scope:** P1 — focused launch\
**App/area:** Shared product/platform work (not a separate app)\
**Research basis:** Supplied Corely_Documentation_Alignment_Prompt.md and later focused-launch refinement; Corely_App_Catalog_and_Recommendations.md shared-platform/release recommendations\
**Specification status:** Proposed planning; current implementation must be reconciled before publishing.

## Outcome

Prove the package across real module boundaries.

## Parent and scope

Parent planning key: `EP-RELEASE`. Replace or accompany with the actual parent issue URL.
Cross-app regression, locale/accessibility, recovery and actual pilot review; no blanket legal/compliance certification.

## Current state / reuse evidence

Before publishing, add verified owner, source paths, related issue/PRs and missing delta. Current implementation is not established by this ticket specification. If already covered, map that evidence rather than opening duplicate work.

## Dependencies

Hard prerequisites: `PLAT-04`, `PEOPLE-04`, `REQ-03`, `TASK-03`, `KNOW-03`, `OPS-04`, `OPS-05`, `APT-06`, `APT-07`. Resolve to real issues or verified existing equivalents.

## Acceptance criteria

- [ ] Normal-day, onboarding, absence and selected adoption/public scenarios run with disposable databases and test delivery sinks.
- [ ] Cover tenancy, revocation, stale writes, retries, booking races, DST and delayed/out-of-order events.
- [ ] Manual workflows pass with AI and P2/finance disabled; touched existing-product regressions remain covered.
- [ ] Record commands/results/skips precisely; historical passes or old checker failures are not presented as fresh results.

## Verification

Run agreed E2E/integration and relevant existing regression suites; report environment blockers honestly.

## Definition of Done

- [ ] Reuse and ownership evidence is recorded; only the scoped missing delta is implemented and existing behavior is preserved.
- [ ] Applicable permission/isolation, replay/concurrency and UI/error-state checks pass; commands, results and skips are reported accurately.
- [ ] Documentation and source/decision links are updated; no unsupported readiness, compliance, customer-validation or test claims.
- [ ] Acceptance criteria are demonstrated with evidence; planning or issue creation alone does not complete delivery.

---

## [P1][REL-02] Complete mobile, accessibility and locale acceptance

<!-- corely-backlog:corely-internal-ops-v1:REL-02 -->

**Planning key:** `REL-02`\
**Type:** Feature\
**Catalog scope:** P1 — focused launch\
**App/area:** Shared product/platform work (not a separate app)\
**Research basis:** Supplied Corely_Documentation_Alignment_Prompt.md and later focused-launch refinement; Corely_App_Catalog_and_Recommendations.md shared-platform/release recommendations\
**Specification status:** Proposed planning; current implementation must be reconciled before publishing.

## Outcome

Staff and customers can finish critical flows in their working environment.

## Parent and scope

Parent planning key: `EP-RELEASE`. Replace or accompany with the actual parent issue URL.
Cross-app regression, locale/accessibility, recovery and actual pilot review; no blanket legal/compliance certification.

## Current state / reuse evidence

Before publishing, add verified owner, source paths, related issue/PRs and missing delta. Current implementation is not established by this ticket specification. If already covered, map that evidence rather than opening duplicate work.

## Dependencies

Hard prerequisites: `PLAT-03`, `APT-04`, `TASK-02`, `REQ-03`, `KNOW-02`. Resolve to real issues or verified existing equivalents.

## Acceptance criteria

- [ ] Critical controls work at phone/desktop widths and by keyboard without drag-only alternatives or clipped dialogs.
- [ ] Labels, forms and loading/error states are reviewed in pilot locales.
- [ ] Dates/timezones and currencies where relevant render consistently; preserve existing OpenBuk EN/DE/VI language behavior.
- [ ] Record devices/browsers, actual accessibility findings and blockers; do not claim universal coverage or certification.

## Verification

Automated accessibility checks plus manual keyboard/mobile/locale workflow review.

## Definition of Done

- [ ] Reuse and ownership evidence is recorded; only the scoped missing delta is implemented and existing behavior is preserved.
- [ ] Applicable permission/isolation, replay/concurrency and UI/error-state checks pass; commands, results and skips are reported accurately.
- [ ] Documentation and source/decision links are updated; no unsupported readiness, compliance, customer-validation or test claims.
- [ ] Acceptance criteria are demonstrated with evidence; planning or issue creation alone does not complete delivery.

---

## [P1][REL-03] Verify operational telemetry, restore and data-handling runbooks

<!-- corely-backlog:corely-internal-ops-v1:REL-03 -->

**Planning key:** `REL-03`\
**Type:** Feature\
**Catalog scope:** P1 — focused launch\
**App/area:** Shared product/platform work (not a separate app)\
**Research basis:** Supplied Corely_Documentation_Alignment_Prompt.md and later focused-launch refinement; Corely_App_Catalog_and_Recommendations.md shared-platform/release recommendations\
**Specification status:** Proposed planning; current implementation must be reconciled before publishing.

## Outcome

Operators diagnose and recover failures without leaking sensitive records.

## Parent and scope

Parent planning key: `EP-RELEASE`. Replace or accompany with the actual parent issue URL.
Cross-app regression, locale/accessibility, recovery and actual pilot review; no blanket legal/compliance certification.

## Current state / reuse evidence

Before publishing, add verified owner, source paths, related issue/PRs and missing delta. Current implementation is not established by this ticket specification. If already covered, map that evidence rather than opening duplicate work.

## Dependencies

Hard prerequisites: `PLAT-02`, `APT-05`, `APT-07`, `OPS-02`. Resolve to real issues or verified existing equivalents.

## Acceptance criteria

- [ ] Booking, approval, outbox and AI failures have redacted correlation, visible retry state and support procedures.
- [ ] Demonstrate isolated backup restore and rollback against stated recovery objectives; no customer delivery or destructive production tests.
- [ ] Document personnel/file retention, deletion/export and AI-provider handling with unresolved specialist review needs, not blanket compliance claims.
- [ ] Replay/dead-letter procedures preserve idempotency using current API-hosted execution; do not add a new worker service.

## Verification

Failure injection, restore/replay drill and redaction inspection with recorded limits.

## Definition of Done

- [ ] Reuse and ownership evidence is recorded; only the scoped missing delta is implemented and existing behavior is preserved.
- [ ] Applicable permission/isolation, replay/concurrency and UI/error-state checks pass; commands, results and skips are reported accurately.
- [ ] Documentation and source/decision links are updated; no unsupported readiness, compliance, customer-validation or test claims.
- [ ] Acceptance criteria are demonstrated with evidence; planning or issue creation alone does not complete delivery.

---

## [P1][REL-04] Review pilot evidence and decide which P2 work to promote

<!-- corely-backlog:corely-internal-ops-v1:REL-04 -->

**Planning key:** `REL-04`\
**Type:** Feature\
**Catalog scope:** P1 — focused launch\
**App/area:** Shared product/platform work (not a separate app)\
**Research basis:** Supplied Corely_Documentation_Alignment_Prompt.md and later focused-launch refinement; Corely_App_Catalog_and_Recommendations.md shared-platform/release recommendations\
**Specification status:** Proposed planning; current implementation must be reconciled before publishing.

## Outcome

Repeated use and real demand determine expansion.

## Parent and scope

Parent planning key: `EP-RELEASE`. Replace or accompany with the actual parent issue URL.
Cross-app regression, locale/accessibility, recovery and actual pilot review; no blanket legal/compliance certification.

## Current state / reuse evidence

Before publishing, add verified owner, source paths, related issue/PRs and missing delta. Current implementation is not established by this ticket specification. If already covered, map that evidence rather than opening duplicate work.

## Dependencies

Hard prerequisites: `STR-04`, `REL-01`, `REL-02`, `REL-03`. Resolve to real issues or verified existing equivalents.

## Acceptance criteria

- [ ] Attach actual anonymized participant and baseline-versus-pilot observations, including employee use rather than manager-only demos.
- [ ] Separate expressed interest, signup, repeated usage and paid adoption; measure support cost and AI review/correction effort.
- [ ] Record continue/refine/stop plus individual P2 promotion decisions with evidence and remaining uncertainty.
- [ ] Small pilot success is not proof of product-market fit; missing evidence leaves P2 conditional, and a written plan alone cannot complete this issue.

## Verification

Review real pilot evidence against the defined protocol; retain unresolved questions and negative results.

## Definition of Done

- [ ] Reuse and ownership evidence is recorded; only the scoped missing delta is implemented and existing behavior is preserved.
- [ ] Applicable permission/isolation, replay/concurrency and UI/error-state checks pass; commands, results and skips are reported accurately.
- [ ] Documentation and source/decision links are updated; no unsupported readiness, compliance, customer-validation or test claims.
- [ ] Acceptance criteria are demonstrated with evidence; planning or issue creation alone does not complete delivery.

---

## [P2][EPIC][EP-SHIFTS] Corely Shifts — coverage and published rosters

<!-- corely-backlog:corely-internal-ops-v1:EP-SHIFTS -->

**Planning key:** `EP-SHIFTS`\
**Type:** Epic\
**Catalog scope:** P2 — conditional next; not an implementation commitment\
**App/area:** #11 Corely Shifts\
**Research basis:** Supplied Corely_App_Catalog_and_Recommendations.md, app profiles #11; Corely_Documentation_Alignment_Prompt.md and later focused-launch refinement\
**Specification status:** Proposed planning; current implementation must be reconciled before publishing.

## Outcome

Managers can plan coverage without confusing planned shifts with appointments or worked hours.

## Scope and exclusions

Roster periods/templates, assignments/open shifts, publication and reviewed swaps. No payroll, autonomous worker allocation or labor-law certification.

## Evidence / promotion gate

Promote only when pilot evidence shows repeated coverage pain; record reviewed local working-rule/privacy requirements and the chosen source of scheduling truth.

Implementation additionally requires the promotion decision from `REL-04` or a documented equivalent. Ticket creation/discovery does not require promotion.

## Current state / reuse evidence

Populate with inspected branch/commit/date, real source paths and existing issue/PR matches. Not yet verified for this proposed epic; do not infer absence from the plan. Preserve unrelated existing work.

## Children

Planning keys below must be replaced or accompanied by real issue references after reconciliation.

- [ ] `SHIFT-01` — Validate demand and define a versioned roster model
- [ ] `SHIFT-02` — Assign shifts and expose deterministic coverage gaps
- [ ] `SHIFT-03` — Publish roster versions and expose approved booking availability
- [ ] `SHIFT-04` — Handle open-shift claims and manager-reviewed swaps

## Exit criteria

- [ ] Each child is delivered, mapped to completed work with evidence, or explicitly not applicable by a recorded decision; unresolved delivery blockers remain visible.
- [ ] The end-to-end outcome and applicable security/privacy/reliability requirements are demonstrated, not inferred from issue closure alone.
- [ ] Scope/exclusions and any promotion gate are honored; remaining gaps and operational limitations are documented.
- [ ] Project membership, hierarchy and linked source/dependency records accurately reflect the reconciled backlog.

---

## [P2][SHIFT-01] Validate demand and define a versioned roster model

<!-- corely-backlog:corely-internal-ops-v1:SHIFT-01 -->

**Planning key:** `SHIFT-01`\
**Type:** Feature\
**Catalog scope:** P2 — conditional next; not an implementation commitment\
**App/area:** #11 Corely Shifts\
**Research basis:** Supplied Corely_App_Catalog_and_Recommendations.md, app profiles #11; Corely_Documentation_Alignment_Prompt.md and later focused-launch refinement\
**Specification status:** Proposed planning; current implementation must be reconciled before publishing.

## Outcome

Introduce roster planning only for a demonstrated staffing problem.

## Parent and scope

Parent planning key: `EP-SHIFTS`. Replace or accompany with the actual parent issue URL.
Roster periods/templates, assignments/open shifts, publication and reviewed swaps. No payroll, autonomous worker allocation or labor-law certification.

## Current state / reuse evidence

Before publishing, add verified owner, source paths, related issue/PRs and missing delta. Current implementation is not established by this ticket specification. If already covered, map that evidence rather than opening duplicate work.

## Dependencies

Hard prerequisites: `PEOPLE-02`, `STR-01`. Resolve to real issues or verified existing equivalents.
Conditional implementation gate: `REL-04` promotion decision or documented equivalent. Keep in the conditional backlog until evidence is recorded; discovery/planning may proceed.

## Acceptance criteria

- [ ] Attach the P2 promotion decision, observed coverage problem and smallest required location/team use case; no invented demand.
- [ ] Identify existing owners and define draft/published roster periods, templates, timezone and planned shifts with stable staff/resource references.
- [ ] Planned shift records remain distinct from actual Time entries and customer bookings; configured working rules are not described as legal compliance.
- [ ] Publishing/version changes retain history and permissions; invalid intervals, archived staff and cross-workspace references are rejected.

## Verification

Roster lifecycle/permission/timezone tests and review of the validated problem and jurisdictional review gaps.

## Definition of Done

- [ ] Reuse and ownership evidence is recorded; only the scoped missing delta is implemented and existing behavior is preserved.
- [ ] Applicable permission/isolation, replay/concurrency and UI/error-state checks pass; commands, results and skips are reported accurately.
- [ ] Documentation and source/decision links are updated; no unsupported readiness, compliance, customer-validation or test claims.
- [ ] Acceptance criteria are demonstrated with evidence; planning or issue creation alone does not complete delivery.

---

## [P2][SHIFT-02] Assign shifts and expose deterministic coverage gaps

<!-- corely-backlog:corely-internal-ops-v1:SHIFT-02 -->

**Planning key:** `SHIFT-02`\
**Type:** Feature\
**Catalog scope:** P2 — conditional next; not an implementation commitment\
**App/area:** #11 Corely Shifts\
**Research basis:** Supplied Corely_App_Catalog_and_Recommendations.md, app profiles #11; Corely_Documentation_Alignment_Prompt.md and later focused-launch refinement\
**Specification status:** Proposed planning; current implementation must be reconciled before publishing.

## Outcome

Managers see where staffing is insufficient before publishing a roster.

## Parent and scope

Parent planning key: `EP-SHIFTS`. Replace or accompany with the actual parent issue URL.
Roster periods/templates, assignments/open shifts, publication and reviewed swaps. No payroll, autonomous worker allocation or labor-law certification.

## Current state / reuse evidence

Before publishing, add verified owner, source paths, related issue/PRs and missing delta. Current implementation is not established by this ticket specification. If already covered, map that evidence rather than opening duplicate work.

## Dependencies

Hard prerequisites: `SHIFT-01`, `PEOPLE-03`. Resolve to real issues or verified existing equivalents.
Conditional implementation gate: `REL-04` promotion decision or documented equivalent. Keep in the conditional backlog until evidence is recorded; discovery/planning may proceed.

## Acceptance criteria

- [ ] A manager creates assignments/open shifts against configurable coverage requirements, staff eligibility and availability.
- [ ] Overlap, approved absence, overnight and effective-date conflicts are explained with source references.
- [ ] Coverage summaries derive from deterministic rules; any AI explanation can compare facts but cannot autonomously allocate workers.
- [ ] Unauthorized users cannot view private absence reasons or assign staff; stale saves require revalidation.

## Verification

Coverage/overlap/DST fixture tests, permission negatives and stale-edit cases.

## Definition of Done

- [ ] Reuse and ownership evidence is recorded; only the scoped missing delta is implemented and existing behavior is preserved.
- [ ] Applicable permission/isolation, replay/concurrency and UI/error-state checks pass; commands, results and skips are reported accurately.
- [ ] Documentation and source/decision links are updated; no unsupported readiness, compliance, customer-validation or test claims.
- [ ] Acceptance criteria are demonstrated with evidence; planning or issue creation alone does not complete delivery.

---

## [P2][SHIFT-03] Publish roster versions and expose approved booking availability

<!-- corely-backlog:corely-internal-ops-v1:SHIFT-03 -->

**Planning key:** `SHIFT-03`\
**Type:** Feature\
**Catalog scope:** P2 — conditional next; not an implementation commitment\
**App/area:** #11 Corely Shifts\
**Research basis:** Supplied Corely_App_Catalog_and_Recommendations.md, app profiles #11; Corely_Documentation_Alignment_Prompt.md and later focused-launch refinement\
**Specification status:** Proposed planning; current implementation must be reconciled before publishing.

## Outcome

Staff see a stable schedule and Booking consumes only approved staffing changes.

## Parent and scope

Parent planning key: `EP-SHIFTS`. Replace or accompany with the actual parent issue URL.
Roster periods/templates, assignments/open shifts, publication and reviewed swaps. No payroll, autonomous worker allocation or labor-law certification.

## Current state / reuse evidence

Before publishing, add verified owner, source paths, related issue/PRs and missing delta. Current implementation is not established by this ticket specification. If already covered, map that evidence rather than opening duplicate work.

## Dependencies

Hard prerequisites: `SHIFT-02`, `APT-02`. Resolve to real issues or verified existing equivalents.
Conditional implementation gate: `REL-04` promotion decision or documented equivalent. Keep in the conditional backlog until evidence is recorded; discovery/planning may proceed.

## Acceptance criteria

- [ ] Publishing creates an auditable version with staff-visible changes and notification preferences.
- [ ] A documented policy decides whether published shifts constrain Booking; draft rosters never silently change reservable slots.
- [ ] Repeated/out-of-order events converge to the latest version; existing booking conflicts become manager exceptions, not automatic cancellations.
- [ ] Staff can see their own schedule, changes and freshness without access to restricted personnel fields.

## Verification

Publish-to-booking integration, replay/version ordering, conflict and mobile self-service tests.

## Definition of Done

- [ ] Reuse and ownership evidence is recorded; only the scoped missing delta is implemented and existing behavior is preserved.
- [ ] Applicable permission/isolation, replay/concurrency and UI/error-state checks pass; commands, results and skips are reported accurately.
- [ ] Documentation and source/decision links are updated; no unsupported readiness, compliance, customer-validation or test claims.
- [ ] Acceptance criteria are demonstrated with evidence; planning or issue creation alone does not complete delivery.

---

## [P2][SHIFT-04] Handle open-shift claims and manager-reviewed swaps

<!-- corely-backlog:corely-internal-ops-v1:SHIFT-04 -->

**Planning key:** `SHIFT-04`\
**Type:** Feature\
**Catalog scope:** P2 — conditional next; not an implementation commitment\
**App/area:** #11 Corely Shifts\
**Research basis:** Supplied Corely_App_Catalog_and_Recommendations.md, app profiles #11; Corely_Documentation_Alignment_Prompt.md and later focused-launch refinement\
**Specification status:** Proposed planning; current implementation must be reconciled before publishing.

## Outcome

Employees request coverage changes without overriding scheduling constraints.

## Parent and scope

Parent planning key: `EP-SHIFTS`. Replace or accompany with the actual parent issue URL.
Roster periods/templates, assignments/open shifts, publication and reviewed swaps. No payroll, autonomous worker allocation or labor-law certification.

## Current state / reuse evidence

Before publishing, add verified owner, source paths, related issue/PRs and missing delta. Current implementation is not established by this ticket specification. If already covered, map that evidence rather than opening duplicate work.

## Dependencies

Hard prerequisites: `SHIFT-03`, `REQ-02`. Resolve to real issues or verified existing equivalents.
Conditional implementation gate: `REL-04` promotion decision or documented equivalent. Keep in the conditional backlog until evidence is recorded; discovery/planning may proceed.

## Acceptance criteria

- [ ] Eligible staff propose a claim/swap through existing Requests with clear affected shifts and participants.
- [ ] Approval rechecks availability, roster version and conflicts; competing claims cannot both take the same exclusive assignment.
- [ ] Rejection, withdrawal and resubmission preserve history; approved changes publish/notify once.
- [ ] No private reasons, automatic employment decision or payroll calculation enters the swap workflow.

## Verification

Concurrent claims, stale approvals, replay and requester/manager swap E2E.

## Definition of Done

- [ ] Reuse and ownership evidence is recorded; only the scoped missing delta is implemented and existing behavior is preserved.
- [ ] Applicable permission/isolation, replay/concurrency and UI/error-state checks pass; commands, results and skips are reported accurately.
- [ ] Documentation and source/decision links are updated; no unsupported readiness, compliance, customer-validation or test claims.
- [ ] Acceptance criteria are demonstrated with evidence; planning or issue creation alone does not complete delivery.

---

## [P2][EPIC][EP-TIME] Corely Time — integration-first actual time records

<!-- corely-backlog:corely-internal-ops-v1:EP-TIME -->

**Planning key:** `EP-TIME`\
**Type:** Epic\
**Catalog scope:** P2 — conditional next; not an implementation commitment\
**App/area:** #12 Corely Time\
**Research basis:** Supplied Corely_App_Catalog_and_Recommendations.md, app profiles #12; Corely_Documentation_Alignment_Prompt.md and later focused-launch refinement\
**Specification status:** Proposed planning; current implementation must be reconciled before publishing.

## Outcome

Employees can inspect and correct actual time with a dependable export path.

## Scope and exclusions

Choose working-time recording or project timesheets and one existing provider integration before native development. No payroll or passive productivity monitoring.

## Evidence / promotion gate

Promote only for demonstrated recording needs, a verified integration/build decision and reviewed requirements; planned shifts never become inferred worked time.

Implementation additionally requires the promotion decision from `REL-04` or a documented equivalent. Ticket creation/discovery does not require promotion.

## Current state / reuse evidence

Populate with inspected branch/commit/date, real source paths and existing issue/PR matches. Not yet verified for this proposed epic; do not infer absence from the plan. Preserve unrelated existing work.

## Children

Planning keys below must be replaced or accompanied by real issue references after reconciliation.

- [ ] `TIME-01` — Choose the first time-recording use case and integration
- [ ] `TIME-02` — Import or record time and support transparent corrections
- [ ] `TIME-03` — Review periods and export approved time with traceability

## Exit criteria

- [ ] Each child is delivered, mapped to completed work with evidence, or explicitly not applicable by a recorded decision; unresolved delivery blockers remain visible.
- [ ] The end-to-end outcome and applicable security/privacy/reliability requirements are demonstrated, not inferred from issue closure alone.
- [ ] Scope/exclusions and any promotion gate are honored; remaining gaps and operational limitations are documented.
- [ ] Project membership, hierarchy and linked source/dependency records accurately reflect the reconciled backlog.

---

## [P2][TIME-01] Choose the first time-recording use case and integration

<!-- corely-backlog:corely-internal-ops-v1:TIME-01 -->

**Planning key:** `TIME-01`\
**Type:** Feature\
**Catalog scope:** P2 — conditional next; not an implementation commitment\
**App/area:** #12 Corely Time\
**Research basis:** Supplied Corely_App_Catalog_and_Recommendations.md, app profiles #12; Corely_Documentation_Alignment_Prompt.md and later focused-launch refinement\
**Specification status:** Proposed planning; current implementation must be reconciled before publishing.

## Outcome

Avoid building a specialist time system before testing an established provider.

## Parent and scope

Parent planning key: `EP-TIME`. Replace or accompany with the actual parent issue URL.
Choose working-time recording or project timesheets and one existing provider integration before native development. No payroll or passive productivity monitoring.

## Current state / reuse evidence

Before publishing, add verified owner, source paths, related issue/PRs and missing delta. Current implementation is not established by this ticket specification. If already covered, map that evidence rather than opening duplicate work.

## Dependencies

Hard prerequisites: `STR-01`, `PEOPLE-01`. Resolve to real issues or verified existing equivalents.
Conditional implementation gate: `REL-04` promotion decision or documented equivalent. Keep in the conditional backlog until evidence is recorded; discovery/planning may proceed.

## Acceptance criteria

- [ ] Record the P2 promotion evidence and choose working-time recording or project timesheets, not both by default.
- [ ] Evaluate the actual provider access, costs/limitations, IDs, permissions, export and correction support; no claimed connector without verification.
- [ ] Document integrate-first outcome, or evidence-backed justification and reviewed rules for a narrow native alternative.
- [ ] Define record authority, timezone, source provenance and employee visibility; no inference from task status, screens or messages.

## Verification

Provider proof of access using synthetic data and a written contract/ownership decision.

## Definition of Done

- [ ] Reuse and ownership evidence is recorded; only the scoped missing delta is implemented and existing behavior is preserved.
- [ ] Applicable permission/isolation, replay/concurrency and UI/error-state checks pass; commands, results and skips are reported accurately.
- [ ] Documentation and source/decision links are updated; no unsupported readiness, compliance, customer-validation or test claims.
- [ ] Acceptance criteria are demonstrated with evidence; planning or issue creation alone does not complete delivery.

---

## [P2][TIME-02] Import or record time and support transparent corrections

<!-- corely-backlog:corely-internal-ops-v1:TIME-02 -->

**Planning key:** `TIME-02`\
**Type:** Feature\
**Catalog scope:** P2 — conditional next; not an implementation commitment\
**App/area:** #12 Corely Time\
**Research basis:** Supplied Corely_App_Catalog_and_Recommendations.md, app profiles #12; Corely_Documentation_Alignment_Prompt.md and later focused-launch refinement\
**Specification status:** Proposed planning; current implementation must be reconciled before publishing.

## Outcome

Employees can see accurate actual entries and explain corrections.

## Parent and scope

Parent planning key: `EP-TIME`. Replace or accompany with the actual parent issue URL.
Choose working-time recording or project timesheets and one existing provider integration before native development. No payroll or passive productivity monitoring.

## Current state / reuse evidence

Before publishing, add verified owner, source paths, related issue/PRs and missing delta. Current implementation is not established by this ticket specification. If already covered, map that evidence rather than opening duplicate work.

## Dependencies

Hard prerequisites: `TIME-01`, `PLAT-02`, `REQ-02`. Resolve to real issues or verified existing equivalents.
Conditional implementation gate: `REL-04` promotion decision or documented equivalent. Keep in the conditional backlog until evidence is recorded; discovery/planning may proceed.

## Acceptance criteria

- [ ] The selected path records/imports entries, breaks and source identifiers with idempotent sync and visible freshness.
- [ ] Employees inspect their records and request corrections; approved changes preserve original value, actor, reason and decision trail.
- [ ] Overlap, negative duration, midnight/DST and provider revocation/error cases have deterministic behavior.
- [ ] AI may prepare entries only from employee-supplied notes for confirmation; no automatic payable/billable hours or surveillance scoring.

## Verification

Import replay/correction/version tests, DST/overlap fixtures and staff-access negatives.

## Definition of Done

- [ ] Reuse and ownership evidence is recorded; only the scoped missing delta is implemented and existing behavior is preserved.
- [ ] Applicable permission/isolation, replay/concurrency and UI/error-state checks pass; commands, results and skips are reported accurately.
- [ ] Documentation and source/decision links are updated; no unsupported readiness, compliance, customer-validation or test claims.
- [ ] Acceptance criteria are demonstrated with evidence; planning or issue creation alone does not complete delivery.

---

## [P2][TIME-03] Review periods and export approved time with traceability

<!-- corely-backlog:corely-internal-ops-v1:TIME-03 -->

**Planning key:** `TIME-03`\
**Type:** Feature\
**Catalog scope:** P2 — conditional next; not an implementation commitment\
**App/area:** #12 Corely Time\
**Research basis:** Supplied Corely_App_Catalog_and_Recommendations.md, app profiles #12; Corely_Documentation_Alignment_Prompt.md and later focused-launch refinement\
**Specification status:** Proposed planning; current implementation must be reconciled before publishing.

## Outcome

An external payroll/accounting process receives reconciled approved records.

## Parent and scope

Parent planning key: `EP-TIME`. Replace or accompany with the actual parent issue URL.
Choose working-time recording or project timesheets and one existing provider integration before native development. No payroll or passive productivity monitoring.

## Current state / reuse evidence

Before publishing, add verified owner, source paths, related issue/PRs and missing delta. Current implementation is not established by this ticket specification. If already covered, map that evidence rather than opening duplicate work.

## Dependencies

Hard prerequisites: `TIME-02`. Resolve to real issues or verified existing equivalents.
Conditional implementation gate: `REL-04` promotion decision or documented equivalent. Keep in the conditional backlog until evidence is recorded; discovery/planning may proceed.

## Acceptance criteria

- [ ] Authorized reviewers approve/return a period with explicit pending-correction behavior and a preserved audit trail.
- [ ] Exports show source IDs, period/timezone, units and totals under an agreed schema; retries produce a traceable batch without double counting.
- [ ] Corrections after approval/export produce explicit adjustment history, not silent replacement of prior records.
- [ ] No payroll calculation, automatic wage approval or claim of statutory compliance; specialist/export validation evidence is recorded.

## Verification

Period state and export reconciliation fixtures, correction-after-export and unauthorized export tests.

## Definition of Done

- [ ] Reuse and ownership evidence is recorded; only the scoped missing delta is implemented and existing behavior is preserved.
- [ ] Applicable permission/isolation, replay/concurrency and UI/error-state checks pass; commands, results and skips are reported accurately.
- [ ] Documentation and source/decision links are updated; no unsupported readiness, compliance, customer-validation or test claims.
- [ ] Acceptance criteria are demonstrated with evidence; planning or issue creation alone does not complete delivery.

---

## [P2][EPIC][EP-EXPENSES] Corely Expenses — employee claims and accountant handoff

<!-- corely-backlog:corely-internal-ops-v1:EP-EXPENSES -->

**Planning key:** `EP-EXPENSES`\
**Type:** Epic\
**Catalog scope:** P2 — conditional next; not an implementation commitment\
**App/area:** #16 Corely Expenses\
**Research basis:** Supplied Corely_App_Catalog_and_Recommendations.md, app profiles #16; Corely_Documentation_Alignment_Prompt.md and later focused-launch refinement\
**Specification status:** Proposed planning; current implementation must be reconciled before publishing.

## Outcome

Reduce claim handling while keeping approval, reimbursement and accounting distinct.

## Scope and exclusions

Reuse the existing Expenses domain, receipts, review, reimbursement evidence, exports and supervised extraction. No autonomous payment or native-ledger prerequisite.

## Evidence / promotion gate

Promote for demonstrated claims pain; current code and accountant handoff are assessed before adding missing slices.

Implementation additionally requires the promotion decision from `REL-04` or a documented equivalent. Ticket creation/discovery does not require promotion.

## Current state / reuse evidence

Populate with inspected branch/commit/date, real source paths and existing issue/PR matches. Not yet verified for this proposed epic; do not infer absence from the plan. Preserve unrelated existing work.

## Children

Planning keys below must be replaced or accompanied by real issue references after reconciliation.

- [ ] `EXP-01` — Audit and complete employee claim capture
- [ ] `EXP-02` — Route claims for review and resolve policy exceptions
- [ ] `EXP-03` — Track reimbursement evidence and export claims for bookkeeping
- [ ] `EXP-04` — Prepare receipt extraction and duplicate-review suggestions

## Exit criteria

- [ ] Each child is delivered, mapped to completed work with evidence, or explicitly not applicable by a recorded decision; unresolved delivery blockers remain visible.
- [ ] The end-to-end outcome and applicable security/privacy/reliability requirements are demonstrated, not inferred from issue closure alone.
- [ ] Scope/exclusions and any promotion gate are honored; remaining gaps and operational limitations are documented.
- [ ] Project membership, hierarchy and linked source/dependency records accurately reflect the reconciled backlog.

---

## [P2][EXP-01] Audit and complete employee claim capture

<!-- corely-backlog:corely-internal-ops-v1:EXP-01 -->

**Planning key:** `EXP-01`\
**Type:** Feature\
**Catalog scope:** P2 — conditional next; not an implementation commitment\
**App/area:** #16 Corely Expenses\
**Research basis:** Supplied Corely_App_Catalog_and_Recommendations.md, app profiles #16; Corely_Documentation_Alignment_Prompt.md and later focused-launch refinement\
**Specification status:** Proposed planning; current implementation must be reconciled before publishing.

## Outcome

Employees submit usable claims with original evidence.

## Parent and scope

Parent planning key: `EP-EXPENSES`. Replace or accompany with the actual parent issue URL.
Reuse the existing Expenses domain, receipts, review, reimbursement evidence, exports and supervised extraction. No autonomous payment or native-ledger prerequisite.

## Current state / reuse evidence

Before publishing, add verified owner, source paths, related issue/PRs and missing delta. Current implementation is not established by this ticket specification. If already covered, map that evidence rather than opening duplicate work.

## Dependencies

Hard prerequisites: `STR-01`, `PEOPLE-01`, `PLAT-02`. Resolve to real issues or verified existing equivalents.
Conditional implementation gate: `REL-04` promotion decision or documented equivalent. Keep in the conditional backlog until evidence is recorded; discovery/planning may proceed.

## Acceptance criteria

- [ ] Attach promotion evidence and audit existing Expenses/contracts/UI/tests; implement only missing claim-specific behavior rather than another expense store.
- [ ] Capture employee, date, currency, amount, category/allocation and original receipt with deterministic validation and draft/submitted separation.
- [ ] Supplier bills stay distinct from employee claims; required evidence and cross-workspace references are validated.
- [ ] Claimant/reviewer permissions protect receipts and personal data; an employee can correct a draft without rewriting submitted history.

## Verification

Existing-expense regression, currency/validation and private-receipt access tests.

## Definition of Done

- [ ] Reuse and ownership evidence is recorded; only the scoped missing delta is implemented and existing behavior is preserved.
- [ ] Applicable permission/isolation, replay/concurrency and UI/error-state checks pass; commands, results and skips are reported accurately.
- [ ] Documentation and source/decision links are updated; no unsupported readiness, compliance, customer-validation or test claims.
- [ ] Acceptance criteria are demonstrated with evidence; planning or issue creation alone does not complete delivery.

---

## [P2][EXP-02] Route claims for review and resolve policy exceptions

<!-- corely-backlog:corely-internal-ops-v1:EXP-02 -->

**Planning key:** `EXP-02`\
**Type:** Feature\
**Catalog scope:** P2 — conditional next; not an implementation commitment\
**App/area:** #16 Corely Expenses\
**Research basis:** Supplied Corely_App_Catalog_and_Recommendations.md, app profiles #16; Corely_Documentation_Alignment_Prompt.md and later focused-launch refinement\
**Specification status:** Proposed planning; current implementation must be reconciled before publishing.

## Outcome

Managers make traceable decisions without equating approval with payment.

## Parent and scope

Parent planning key: `EP-EXPENSES`. Replace or accompany with the actual parent issue URL.
Reuse the existing Expenses domain, receipts, review, reimbursement evidence, exports and supervised extraction. No autonomous payment or native-ledger prerequisite.

## Current state / reuse evidence

Before publishing, add verified owner, source paths, related issue/PRs and missing delta. Current implementation is not established by this ticket specification. If already covered, map that evidence rather than opening duplicate work.

## Dependencies

Hard prerequisites: `EXP-01`, `REQ-02`. Resolve to real issues or verified existing equivalents.
Conditional implementation gate: `REL-04` promotion decision or documented equivalent. Keep in the conditional backlog until evidence is recorded; discovery/planning may proceed.

## Acceptance criteria

- [ ] Reuse existing approval services for configured reviewer and amount/policy routing; no second approval engine.
- [ ] Approve/reject/return checks current claim version, reviewer authority and explicit self-approval rules.
- [ ] Corrections, missing receipts and policy exceptions have visible reasons and resubmission history.
- [ ] Approval records a claim decision only, not tax deductibility, reimbursement or a ledger posting; state/events are idempotent.

## Verification

Routing threshold, stale/concurrent decisions, resubmission and authorization tests.

## Definition of Done

- [ ] Reuse and ownership evidence is recorded; only the scoped missing delta is implemented and existing behavior is preserved.
- [ ] Applicable permission/isolation, replay/concurrency and UI/error-state checks pass; commands, results and skips are reported accurately.
- [ ] Documentation and source/decision links are updated; no unsupported readiness, compliance, customer-validation or test claims.
- [ ] Acceptance criteria are demonstrated with evidence; planning or issue creation alone does not complete delivery.

---

## [P2][EXP-03] Track reimbursement evidence and export claims for bookkeeping

<!-- corely-backlog:corely-internal-ops-v1:EXP-03 -->

**Planning key:** `EXP-03`\
**Type:** Feature\
**Catalog scope:** P2 — conditional next; not an implementation commitment\
**App/area:** #16 Corely Expenses\
**Research basis:** Supplied Corely_App_Catalog_and_Recommendations.md, app profiles #16; Corely_Documentation_Alignment_Prompt.md and later focused-launch refinement\
**Specification status:** Proposed planning; current implementation must be reconciled before publishing.

## Outcome

Approved claims can be handed off without migrating accounting.

## Parent and scope

Parent planning key: `EP-EXPENSES`. Replace or accompany with the actual parent issue URL.
Reuse the existing Expenses domain, receipts, review, reimbursement evidence, exports and supervised extraction. No autonomous payment or native-ledger prerequisite.

## Current state / reuse evidence

Before publishing, add verified owner, source paths, related issue/PRs and missing delta. Current implementation is not established by this ticket specification. If already covered, map that evidence rather than opening duplicate work.

## Dependencies

Hard prerequisites: `EXP-02`. Resolve to real issues or verified existing equivalents.
Conditional implementation gate: `REL-04` promotion decision or documented equivalent. Keep in the conditional backlog until evidence is recorded; discovery/planning may proceed.

## Acceptance criteria

- [ ] Record externally confirmed reimbursement references/amount/date through the existing payment owner or an explicitly scoped evidence workflow; no money is released.
- [ ] Approved, exported, partially reimbursed and reimbursed states remain distinct and reconcile to supporting records.
- [ ] Generate permission-controlled export batches with stable IDs, originals and correction history; verify the chosen accountant/provider format with real requirements.
- [ ] Replay, partial reimbursement and corrections do not duplicate totals; the workflow remains usable without Corely Accounting or the P3 Payments app.

## Verification

Export reconciliation, duplicate/partial reimbursement and accountant-handoff fixture review.

## Definition of Done

- [ ] Reuse and ownership evidence is recorded; only the scoped missing delta is implemented and existing behavior is preserved.
- [ ] Applicable permission/isolation, replay/concurrency and UI/error-state checks pass; commands, results and skips are reported accurately.
- [ ] Documentation and source/decision links are updated; no unsupported readiness, compliance, customer-validation or test claims.
- [ ] Acceptance criteria are demonstrated with evidence; planning or issue creation alone does not complete delivery.

---

## [P2][EXP-04] Prepare receipt extraction and duplicate-review suggestions

<!-- corely-backlog:corely-internal-ops-v1:EXP-04 -->

**Planning key:** `EXP-04`\
**Type:** Feature\
**Catalog scope:** P2 — conditional next; not an implementation commitment\
**App/area:** #16 Corely Expenses\
**Research basis:** Supplied Corely_App_Catalog_and_Recommendations.md, app profiles #16; Corely_Documentation_Alignment_Prompt.md and later focused-launch refinement\
**Specification status:** Proposed planning; current implementation must be reconciled before publishing.

## Outcome

AI reduces typing while people verify financial facts.

## Parent and scope

Parent planning key: `EP-EXPENSES`. Replace or accompany with the actual parent issue URL.
Reuse the existing Expenses domain, receipts, review, reimbursement evidence, exports and supervised extraction. No autonomous payment or native-ledger prerequisite.

## Current state / reuse evidence

Before publishing, add verified owner, source paths, related issue/PRs and missing delta. Current implementation is not established by this ticket specification. If already covered, map that evidence rather than opening duplicate work.

## Dependencies

Hard prerequisites: `EXP-01`, `OPS-01`. Resolve to real issues or verified existing equivalents.
Conditional implementation gate: `REL-04` promotion decision or documented equivalent. Keep in the conditional backlog until evidence is recorded; discovery/planning may proceed.

## Acceptance criteria

- [ ] Extraction preserves the original receipt and proposes fields/categories with source evidence and uncertainty.
- [ ] A claimant/reviewer confirms edits before a draft changes; money/tax calculations use deterministic existing logic.
- [ ] Duplicate suggestions identify supporting records but do not delete claims or declare fraud; access filters apply to comparisons.
- [ ] Malicious receipt text cannot invoke tools or change bank details; manual entry works when extraction fails or AI is disabled.

## Verification

Representative/ambiguous receipt fixtures, false-positive duplicate cases, prompt-injection and manual-fallback tests.

## Definition of Done

- [ ] Reuse and ownership evidence is recorded; only the scoped missing delta is implemented and existing behavior is preserved.
- [ ] Applicable permission/isolation, replay/concurrency and UI/error-state checks pass; commands, results and skips are reported accurately.
- [ ] Documentation and source/decision links are updated; no unsupported readiness, compliance, customer-validation or test claims.
- [ ] Acceptance criteria are demonstrated with evidence; planning or issue creation alone does not complete delivery.

---

## [P2][EPIC][EP-ASSETS] Corely Assets — equipment custody and handovers

<!-- corely-backlog:corely-internal-ops-v1:EP-ASSETS -->

**Planning key:** `EP-ASSETS`\
**Type:** Epic\
**Catalog scope:** P2 — conditional next; not an implementation commitment\
**App/area:** #18 Corely Assets\
**Research basis:** Supplied Corely_App_Catalog_and_Recommendations.md, app profiles #18; Corely_Documentation_Alignment_Prompt.md and later focused-launch refinement\
**Specification status:** Proposed planning; current implementation must be reconciled before publishing.

## Outcome

Find equipment and know who has it without implementing fixed-asset accounting.

## Scope and exclusions

Compact register, identifiers, condition/location, custody, handovers/returns, warranties and source links. No stock ledger or depreciation.

## Evidence / promotion gate

Promote when lost equipment or handovers create recurring pain; reuse existing asset/party/document ownership if found.

Implementation additionally requires the promotion decision from `REL-04` or a documented equivalent. Ticket creation/discovery does not require promotion.

## Current state / reuse evidence

Populate with inspected branch/commit/date, real source paths and existing issue/PR matches. Not yet verified for this proposed epic; do not infer absence from the plan. Preserve unrelated existing work.

## Children

Planning keys below must be replaced or accompanied by real issue references after reconciliation.

- [ ] `ASSET-01` — Create the minimal equipment register
- [ ] `ASSET-02` — Record assignments, handovers and returns
- [ ] `ASSET-03` — Provide warranty/return follow-up and source-linked assistance

## Exit criteria

- [ ] Each child is delivered, mapped to completed work with evidence, or explicitly not applicable by a recorded decision; unresolved delivery blockers remain visible.
- [ ] The end-to-end outcome and applicable security/privacy/reliability requirements are demonstrated, not inferred from issue closure alone.
- [ ] Scope/exclusions and any promotion gate are honored; remaining gaps and operational limitations are documented.
- [ ] Project membership, hierarchy and linked source/dependency records accurately reflect the reconciled backlog.

---

## [P2][ASSET-01] Create the minimal equipment register

<!-- corely-backlog:corely-internal-ops-v1:ASSET-01 -->

**Planning key:** `ASSET-01`\
**Type:** Feature\
**Catalog scope:** P2 — conditional next; not an implementation commitment\
**App/area:** #18 Corely Assets\
**Research basis:** Supplied Corely_App_Catalog_and_Recommendations.md, app profiles #18; Corely_Documentation_Alignment_Prompt.md and later focused-launch refinement\
**Specification status:** Proposed planning; current implementation must be reconciled before publishing.

## Outcome

Give company equipment a dependable operational identity.

## Parent and scope

Parent planning key: `EP-ASSETS`. Replace or accompany with the actual parent issue URL.
Compact register, identifiers, condition/location, custody, handovers/returns, warranties and source links. No stock ledger or depreciation.

## Current state / reuse evidence

Before publishing, add verified owner, source paths, related issue/PRs and missing delta. Current implementation is not established by this ticket specification. If already covered, map that evidence rather than opening duplicate work.

## Dependencies

Hard prerequisites: `STR-01`, `PEOPLE-01`, `PLAT-02`. Resolve to real issues or verified existing equivalents.
Conditional implementation gate: `REL-04` promotion decision or documented equivalent. Keep in the conditional backlog until evidence is recorded; discovery/planning may proceed.

## Acceptance criteria

- [ ] Attach demand evidence and inspect actual asset/inventory ownership before defining the narrow equipment owner.
- [ ] Authorized users maintain identifiers, description, location, condition, lifecycle status, warranty dates and permitted documents.
- [ ] Duplicate/cross-workspace references are rejected, archival preserves history and manual lookup works without scanning.
- [ ] Equipment records do not become inventory quantity movements, depreciation or a financial ledger.

## Verification

Identifier validation, custody/history preservation, file permissions and register UI tests.

## Definition of Done

- [ ] Reuse and ownership evidence is recorded; only the scoped missing delta is implemented and existing behavior is preserved.
- [ ] Applicable permission/isolation, replay/concurrency and UI/error-state checks pass; commands, results and skips are reported accurately.
- [ ] Documentation and source/decision links are updated; no unsupported readiness, compliance, customer-validation or test claims.
- [ ] Acceptance criteria are demonstrated with evidence; planning or issue creation alone does not complete delivery.

---

## [P2][ASSET-02] Record assignments, handovers and returns

<!-- corely-backlog:corely-internal-ops-v1:ASSET-02 -->

**Planning key:** `ASSET-02`\
**Type:** Feature\
**Catalog scope:** P2 — conditional next; not an implementation commitment\
**App/area:** #18 Corely Assets\
**Research basis:** Supplied Corely_App_Catalog_and_Recommendations.md, app profiles #18; Corely_Documentation_Alignment_Prompt.md and later focused-launch refinement\
**Specification status:** Proposed planning; current implementation must be reconciled before publishing.

## Outcome

Equipment custody changes are explicit and auditable.

## Parent and scope

Parent planning key: `EP-ASSETS`. Replace or accompany with the actual parent issue URL.
Compact register, identifiers, condition/location, custody, handovers/returns, warranties and source links. No stock ledger or depreciation.

## Current state / reuse evidence

Before publishing, add verified owner, source paths, related issue/PRs and missing delta. Current implementation is not established by this ticket specification. If already covered, map that evidence rather than opening duplicate work.

## Dependencies

Hard prerequisites: `ASSET-01`, `REQ-02`. Resolve to real issues or verified existing equivalents.
Conditional implementation gate: `REL-04` promotion decision or documented equivalent. Keep in the conditional backlog until evidence is recorded; discovery/planning may proceed.

## Acceptance criteria

- [ ] Assignment/return records identify custodian, effective time, condition and acknowledgment; no duplicate simultaneous exclusive custody.
- [ ] Optional equipment-request approval links to the existing request without equating approval with physical delivery.
- [ ] Concurrent handovers and retries are validated; departures surface outstanding returns instead of silently reassigning assets.
- [ ] Past custodians and condition changes remain visible to authorized users without exposing unrelated personnel data.

## Verification

Concurrent custody/replay tests and employee departure-to-return workflow.

## Definition of Done

- [ ] Reuse and ownership evidence is recorded; only the scoped missing delta is implemented and existing behavior is preserved.
- [ ] Applicable permission/isolation, replay/concurrency and UI/error-state checks pass; commands, results and skips are reported accurately.
- [ ] Documentation and source/decision links are updated; no unsupported readiness, compliance, customer-validation or test claims.
- [ ] Acceptance criteria are demonstrated with evidence; planning or issue creation alone does not complete delivery.

---

## [P2][ASSET-03] Provide warranty/return follow-up and source-linked assistance

<!-- corely-backlog:corely-internal-ops-v1:ASSET-03 -->

**Planning key:** `ASSET-03`\
**Type:** Feature\
**Catalog scope:** P2 — conditional next; not an implementation commitment\
**App/area:** #18 Corely Assets\
**Research basis:** Supplied Corely_App_Catalog_and_Recommendations.md, app profiles #18; Corely_Documentation_Alignment_Prompt.md and later focused-launch refinement\
**Specification status:** Proposed planning; current implementation must be reconciled before publishing.

## Outcome

Managers act on overdue returns and find equipment context quickly.

## Parent and scope

Parent planning key: `EP-ASSETS`. Replace or accompany with the actual parent issue URL.
Compact register, identifiers, condition/location, custody, handovers/returns, warranties and source links. No stock ledger or depreciation.

## Current state / reuse evidence

Before publishing, add verified owner, source paths, related issue/PRs and missing delta. Current implementation is not established by this ticket specification. If already covered, map that evidence rather than opening duplicate work.

## Dependencies

Hard prerequisites: `ASSET-02`, `TASK-04`, `OPS-01`. Resolve to real issues or verified existing equivalents.
Conditional implementation gate: `REL-04` promotion decision or documented equivalent. Keep in the conditional backlog until evidence is recorded; discovery/planning may proceed.

## Acceptance criteria

- [ ] Authorized views show due returns/warranties with date provenance; reminders create deduplicated linked follow-up tasks.
- [ ] AI can find permitted asset records and prepare a return checklist, but cannot silently change custody or financial value.
- [ ] Purchase/bill references are optional links to existing records; P3 Purchasing/Maintenance is not required.
- [ ] Manual views, exports and disabled-AI behavior remain useful; source revocation removes private previews.

## Verification

Reminder deduplication, date/source checks, AI authorization and optional-integration absence tests.

## Definition of Done

- [ ] Reuse and ownership evidence is recorded; only the scoped missing delta is implemented and existing behavior is preserved.
- [ ] Applicable permission/isolation, replay/concurrency and UI/error-state checks pass; commands, results and skips are reported accurately.
- [ ] Documentation and source/decision links are updated; no unsupported readiness, compliance, customer-validation or test claims.
- [ ] Acceptance criteria are demonstrated with evidence; planning or issue creation alone does not complete delivery.

---

## [P2][EPIC][EP-HELPDESK] Corely Helpdesk — one internal support queue

<!-- corely-backlog:corely-internal-ops-v1:EP-HELPDESK -->

**Planning key:** `EP-HELPDESK`\
**Type:** Epic\
**Catalog scope:** P2 — conditional next; not an implementation commitment\
**App/area:** #21 Corely Helpdesk\
**Research basis:** Supplied Corely_App_Catalog_and_Recommendations.md, app profiles #21; Corely_Documentation_Alignment_Prompt.md and later focused-launch refinement\
**Specification status:** Proposed planning; current implementation must be reconciled before publishing.

## Outcome

Employees get a visible support path and one internal team can manage recurring tickets.

## Scope and exclusions

One initial IT/HR/facilities function, intake, ownership, statuses, private notes, simple response targets and reviewed Knowledge assistance.

## Evidence / promotion gate

Promote only when real ticket volume warrants a queue; do not build a customer-service CRM or require three departments at once.

Implementation additionally requires the promotion decision from `REL-04` or a documented equivalent. Ticket creation/discovery does not require promotion.

## Current state / reuse evidence

Populate with inspected branch/commit/date, real source paths and existing issue/PR matches. Not yet verified for this proposed epic; do not infer absence from the plan. Preserve unrelated existing work.

## Children

Planning keys below must be replaced or accompanied by real issue references after reconciliation.

- [ ] `HELP-01` — Validate the support function and deliver ticket intake
- [ ] `HELP-02` — Manage queue assignment, replies and resolution history
- [ ] `HELP-03` — Add simple response targets and support follow-up
- [ ] `HELP-04` — Draft support responses using authorized Knowledge

## Exit criteria

- [ ] Each child is delivered, mapped to completed work with evidence, or explicitly not applicable by a recorded decision; unresolved delivery blockers remain visible.
- [ ] The end-to-end outcome and applicable security/privacy/reliability requirements are demonstrated, not inferred from issue closure alone.
- [ ] Scope/exclusions and any promotion gate are honored; remaining gaps and operational limitations are documented.
- [ ] Project membership, hierarchy and linked source/dependency records accurately reflect the reconciled backlog.

---

## [P2][HELP-01] Validate the support function and deliver ticket intake

<!-- corely-backlog:corely-internal-ops-v1:HELP-01 -->

**Planning key:** `HELP-01`\
**Type:** Feature\
**Catalog scope:** P2 — conditional next; not an implementation commitment\
**App/area:** #21 Corely Helpdesk\
**Research basis:** Supplied Corely_App_Catalog_and_Recommendations.md, app profiles #21; Corely_Documentation_Alignment_Prompt.md and later focused-launch refinement\
**Specification status:** Proposed planning; current implementation must be reconciled before publishing.

## Outcome

Turn a repeated internal support problem into a bounded queue.

## Parent and scope

Parent planning key: `EP-HELPDESK`. Replace or accompany with the actual parent issue URL.
One initial IT/HR/facilities function, intake, ownership, statuses, private notes, simple response targets and reviewed Knowledge assistance.

## Current state / reuse evidence

Before publishing, add verified owner, source paths, related issue/PRs and missing delta. Current implementation is not established by this ticket specification. If already covered, map that evidence rather than opening duplicate work.

## Dependencies

Hard prerequisites: `STR-01`, `PLAT-02`, `PEOPLE-01`. Resolve to real issues or verified existing equivalents.
Conditional implementation gate: `REL-04` promotion decision or documented equivalent. Keep in the conditional backlog until evidence is recorded; discovery/planning may proceed.

## Acceptance criteria

- [ ] Attach observed ticket volume/problem and choose one function; inspect existing Issues/forms capabilities before creating another ticket model.
- [ ] Employees submit a category, description and permitted files; requester identity and workspace are trusted server context.
- [ ] Tickets remain distinct from Tasks and authorization Requests, with clear ownership and a small initial lifecycle.
- [ ] The requester sees their own ticket and safe status; confidential HR-style content is restricted according to the chosen function.

## Verification

Intake validation, tenant/requester privacy and existing-Issues regression tests.

## Definition of Done

- [ ] Reuse and ownership evidence is recorded; only the scoped missing delta is implemented and existing behavior is preserved.
- [ ] Applicable permission/isolation, replay/concurrency and UI/error-state checks pass; commands, results and skips are reported accurately.
- [ ] Documentation and source/decision links are updated; no unsupported readiness, compliance, customer-validation or test claims.
- [ ] Acceptance criteria are demonstrated with evidence; planning or issue creation alone does not complete delivery.

---

## [P2][HELP-02] Manage queue assignment, replies and resolution history

<!-- corely-backlog:corely-internal-ops-v1:HELP-02 -->

**Planning key:** `HELP-02`\
**Type:** Feature\
**Catalog scope:** P2 — conditional next; not an implementation commitment\
**App/area:** #21 Corely Helpdesk\
**Research basis:** Supplied Corely_App_Catalog_and_Recommendations.md, app profiles #21; Corely_Documentation_Alignment_Prompt.md and later focused-launch refinement\
**Specification status:** Proposed planning; current implementation must be reconciled before publishing.

## Outcome

Support staff handle work without leaking internal notes.

## Parent and scope

Parent planning key: `EP-HELPDESK`. Replace or accompany with the actual parent issue URL.
One initial IT/HR/facilities function, intake, ownership, statuses, private notes, simple response targets and reviewed Knowledge assistance.

## Current state / reuse evidence

Before publishing, add verified owner, source paths, related issue/PRs and missing delta. Current implementation is not established by this ticket specification. If already covered, map that evidence rather than opening duplicate work.

## Dependencies

Hard prerequisites: `HELP-01`. Resolve to real issues or verified existing equivalents.
Conditional implementation gate: `REL-04` promotion decision or documented equivalent. Keep in the conditional backlog until evidence is recorded; discovery/planning may proceed.

## Acceptance criteria

- [ ] Authorized agents filter/assign/prioritize tickets and move through explicit statuses with concurrency validation.
- [ ] Internal notes are separate from requester-visible replies and excluded from external/employee notifications and search snippets.
- [ ] Resolved/reopened tickets retain history and optional linked asset/task/request references without copying their records.
- [ ] Reply/assignment retries do not duplicate communication; permission changes revoke access immediately on next request.

## Verification

Private-versus-public reply tests, concurrent assignment, reopen and idempotent notification cases.

## Definition of Done

- [ ] Reuse and ownership evidence is recorded; only the scoped missing delta is implemented and existing behavior is preserved.
- [ ] Applicable permission/isolation, replay/concurrency and UI/error-state checks pass; commands, results and skips are reported accurately.
- [ ] Documentation and source/decision links are updated; no unsupported readiness, compliance, customer-validation or test claims.
- [ ] Acceptance criteria are demonstrated with evidence; planning or issue creation alone does not complete delivery.

---

## [P2][HELP-03] Add simple response targets and support follow-up

<!-- corely-backlog:corely-internal-ops-v1:HELP-03 -->

**Planning key:** `HELP-03`\
**Type:** Feature\
**Catalog scope:** P2 — conditional next; not an implementation commitment\
**App/area:** #21 Corely Helpdesk\
**Research basis:** Supplied Corely_App_Catalog_and_Recommendations.md, app profiles #21; Corely_Documentation_Alignment_Prompt.md and later focused-launch refinement\
**Specification status:** Proposed planning; current implementation must be reconciled before publishing.

## Outcome

Managers can identify neglected tickets without surveillance metrics.

## Parent and scope

Parent planning key: `EP-HELPDESK`. Replace or accompany with the actual parent issue URL.
One initial IT/HR/facilities function, intake, ownership, statuses, private notes, simple response targets and reviewed Knowledge assistance.

## Current state / reuse evidence

Before publishing, add verified owner, source paths, related issue/PRs and missing delta. Current implementation is not established by this ticket specification. If already covered, map that evidence rather than opening duplicate work.

## Dependencies

Hard prerequisites: `HELP-02`, `REQ-02`, `TASK-04`. Resolve to real issues or verified existing equivalents.
Conditional implementation gate: `REL-04` promotion decision or documented equivalent. Keep in the conditional backlog until evidence is recorded; discovery/planning may proceed.

## Acceptance criteria

- [ ] Define one explicit response-target clock, timezone and pause policy; report time calculations consistently.
- [ ] Overdue warnings/reminders are bounded and deduplicated; resolution cancels obsolete reminders.
- [ ] Support can link an approval or implementation task through its owner without automatically approving or completing it.
- [ ] Reports explain counts and timing from ticket records, not employee productivity scores or contractual SLA guarantees.

## Verification

Clock/pause/closure fixtures, notification replay and linked-approval failure tests.

## Definition of Done

- [ ] Reuse and ownership evidence is recorded; only the scoped missing delta is implemented and existing behavior is preserved.
- [ ] Applicable permission/isolation, replay/concurrency and UI/error-state checks pass; commands, results and skips are reported accurately.
- [ ] Documentation and source/decision links are updated; no unsupported readiness, compliance, customer-validation or test claims.
- [ ] Acceptance criteria are demonstrated with evidence; planning or issue creation alone does not complete delivery.

---

## [P2][HELP-04] Draft support responses using authorized Knowledge

<!-- corely-backlog:corely-internal-ops-v1:HELP-04 -->

**Planning key:** `HELP-04`\
**Type:** Feature\
**Catalog scope:** P2 — conditional next; not an implementation commitment\
**App/area:** #21 Corely Helpdesk\
**Research basis:** Supplied Corely_App_Catalog_and_Recommendations.md, app profiles #21; Corely_Documentation_Alignment_Prompt.md and later focused-launch refinement\
**Specification status:** Proposed planning; current implementation must be reconciled before publishing.

## Outcome

AI assists resolution without inventing policies or exposing private notes.

## Parent and scope

Parent planning key: `EP-HELPDESK`. Replace or accompany with the actual parent issue URL.
One initial IT/HR/facilities function, intake, ownership, statuses, private notes, simple response targets and reviewed Knowledge assistance.

## Current state / reuse evidence

Before publishing, add verified owner, source paths, related issue/PRs and missing delta. Current implementation is not established by this ticket specification. If already covered, map that evidence rather than opening duplicate work.

## Dependencies

Hard prerequisites: `HELP-02`, `KNOW-03`, `OPS-01`. Resolve to real issues or verified existing equivalents.
Conditional implementation gate: `REL-04` promotion decision or documented equivalent. Keep in the conditional backlog until evidence is recorded; discovery/planning may proceed.

## Acceptance criteria

- [ ] Suggest category and response from permitted approved procedures with source links and uncertainty.
- [ ] Sensitive or outgoing replies require review; unsupported answers explicitly defer to an authorized human.
- [ ] Private notes and HR details cannot leak to a requester through retrieval, generated summaries or tools.
- [ ] Manual support remains available and evaluations track useful resolution/correction rather than chatbot volume.

## Verification

Grounded-response, unsupported-question and cross-role leakage evaluations; explicit-send and AI-off checks.

## Definition of Done

- [ ] Reuse and ownership evidence is recorded; only the scoped missing delta is implemented and existing behavior is preserved.
- [ ] Applicable permission/isolation, replay/concurrency and UI/error-state checks pass; commands, results and skips are reported accurately.
- [ ] Documentation and source/decision links are updated; no unsupported readiness, compliance, customer-validation or test claims.
- [ ] Acceptance criteria are demonstrated with evidence; planning or issue creation alone does not complete delivery.

---

## [P2][EPIC][EP-INVOICES] Corely Invoices — bounded customer billing

<!-- corely-backlog:corely-internal-ops-v1:EP-INVOICES -->

**Planning key:** `EP-INVOICES`\
**Type:** Epic\
**Catalog scope:** P2 — conditional next; not an implementation commitment\
**App/area:** #26 Corely Invoices\
**Research basis:** Supplied Corely_App_Catalog_and_Recommendations.md, app profiles #26; Corely_Documentation_Alignment_Prompt.md and later focused-launch refinement\
**Specification status:** Proposed planning; current implementation must be reconciled before publishing.

## Outcome

Customers needing billing can issue and track invoices without a general-ledger migration.

## Scope and exclusions

Reuse existing Invoices, numbering, deterministic amounts, correction, delivery, receivables and defined document/export formats. No new accounting engine.

## Evidence / promotion gate

Promote only when pilots need outgoing billing rather than an existing tool; review the exact jurisdiction, tax/document scope and handoff requirements.

Implementation additionally requires the promotion decision from `REL-04` or a documented equivalent. Ticket creation/discovery does not require promotion.

## Current state / reuse evidence

Populate with inspected branch/commit/date, real source paths and existing issue/PR matches. Not yet verified for this proposed epic; do not infer absence from the plan. Preserve unrelated existing work.

## Children

Planning keys below must be replaced or accompanied by real issue references after reconciliation.

- [ ] `INV-01` — Validate billing scope and close invoice-lifecycle gaps
- [ ] `INV-02` — Prepare invoice drafts from approved operational records
- [ ] `INV-03` — Track invoice delivery, receivables and reviewed reminders
- [ ] `INV-04` — Validate the selected invoice format and accountant handoff

## Exit criteria

- [ ] Each child is delivered, mapped to completed work with evidence, or explicitly not applicable by a recorded decision; unresolved delivery blockers remain visible.
- [ ] The end-to-end outcome and applicable security/privacy/reliability requirements are demonstrated, not inferred from issue closure alone.
- [ ] Scope/exclusions and any promotion gate are honored; remaining gaps and operational limitations are documented.
- [ ] Project membership, hierarchy and linked source/dependency records accurately reflect the reconciled backlog.

---

## [P2][INV-01] Validate billing scope and close invoice-lifecycle gaps

<!-- corely-backlog:corely-internal-ops-v1:INV-01 -->

**Planning key:** `INV-01`\
**Type:** Feature\
**Catalog scope:** P2 — conditional next; not an implementation commitment\
**App/area:** #26 Corely Invoices\
**Research basis:** Supplied Corely_App_Catalog_and_Recommendations.md, app profiles #26; Corely_Documentation_Alignment_Prompt.md and later focused-launch refinement\
**Specification status:** Proposed planning; current implementation must be reconciled before publishing.

## Outcome

Issue correct documents using existing billing capabilities.

## Parent and scope

Parent planning key: `EP-INVOICES`. Replace or accompany with the actual parent issue URL.
Reuse existing Invoices, numbering, deterministic amounts, correction, delivery, receivables and defined document/export formats. No new accounting engine.

## Current state / reuse evidence

Before publishing, add verified owner, source paths, related issue/PRs and missing delta. Current implementation is not established by this ticket specification. If already covered, map that evidence rather than opening duplicate work.

## Dependencies

Hard prerequisites: `STR-01`, `PLAT-02`. Resolve to real issues or verified existing equivalents.
Conditional implementation gate: `REL-04` promotion decision or documented equivalent. Keep in the conditional backlog until evidence is recorded; discovery/planning may proceed.

## Acceptance criteria

- [ ] Attach demand and build-versus-integrate decision; inspect existing Invoices/Tax/Party code and document the supported scope and specialist-review gaps.
- [ ] Draft/issue/correct or credit uses current domain rules, unique numbering, deterministic decimal money and explicit currency/tax validation.
- [ ] Issued records preserve history; corrections follow an auditable supported path rather than silently editing the original.
- [ ] Customer billing is distinct from Corely SaaS subscription billing and does not require native Accounting activation.

## Verification

Existing invoice regression, numbering race/retry, currency/rounding and correction tests with reviewed fixtures.

## Definition of Done

- [ ] Reuse and ownership evidence is recorded; only the scoped missing delta is implemented and existing behavior is preserved.
- [ ] Applicable permission/isolation, replay/concurrency and UI/error-state checks pass; commands, results and skips are reported accurately.
- [ ] Documentation and source/decision links are updated; no unsupported readiness, compliance, customer-validation or test claims.
- [ ] Acceptance criteria are demonstrated with evidence; planning or issue creation alone does not complete delivery.

---

## [P2][INV-02] Prepare invoice drafts from approved operational records

<!-- corely-backlog:corely-internal-ops-v1:INV-02 -->

**Planning key:** `INV-02`\
**Type:** Feature\
**Catalog scope:** P2 — conditional next; not an implementation commitment\
**App/area:** #26 Corely Invoices\
**Research basis:** Supplied Corely_App_Catalog_and_Recommendations.md, app profiles #26; Corely_Documentation_Alignment_Prompt.md and later focused-launch refinement\
**Specification status:** Proposed planning; current implementation must be reconciled before publishing.

## Outcome

Reduce billing entry without assuming every appointment is billable.

## Parent and scope

Parent planning key: `EP-INVOICES`. Replace or accompany with the actual parent issue URL.
Reuse existing Invoices, numbering, deterministic amounts, correction, delivery, receivables and defined document/export formats. No new accounting engine.

## Current state / reuse evidence

Before publishing, add verified owner, source paths, related issue/PRs and missing delta. Current implementation is not established by this ticket specification. If already covered, map that evidence rather than opening duplicate work.

## Dependencies

Hard prerequisites: `INV-01`, `APT-03`, `OPS-01`. Resolve to real issues or verified existing equivalents.
Conditional implementation gate: `REL-04` promotion decision or documented equivalent. Keep in the conditional backlog until evidence is recorded; discovery/planning may proceed.

## Acceptance criteria

- [ ] Authorized users select confirmed billable source work and recipient; source references are retained and reviewed.
- [ ] AI proposes descriptions/fields with provenance but never invents tax rates, changes bank details or issues an invoice unconfirmed.
- [ ] Source reuse follows explicit partial/rebilling rules and flags duplicate billing; completed appointments are not automatically charged.
- [ ] Amounts and tax use deterministic logic; manual drafting works without AI or Appointments integration.

## Verification

Duplicate-source, partial billing, authorization, AI proposal review and manual-fallback tests.

## Definition of Done

- [ ] Reuse and ownership evidence is recorded; only the scoped missing delta is implemented and existing behavior is preserved.
- [ ] Applicable permission/isolation, replay/concurrency and UI/error-state checks pass; commands, results and skips are reported accurately.
- [ ] Documentation and source/decision links are updated; no unsupported readiness, compliance, customer-validation or test claims.
- [ ] Acceptance criteria are demonstrated with evidence; planning or issue creation alone does not complete delivery.

---

## [P2][INV-03] Track invoice delivery, receivables and reviewed reminders

<!-- corely-backlog:corely-internal-ops-v1:INV-03 -->

**Planning key:** `INV-03`\
**Type:** Feature\
**Catalog scope:** P2 — conditional next; not an implementation commitment\
**App/area:** #26 Corely Invoices\
**Research basis:** Supplied Corely_App_Catalog_and_Recommendations.md, app profiles #26; Corely_Documentation_Alignment_Prompt.md and later focused-launch refinement\
**Specification status:** Proposed planning; current implementation must be reconciled before publishing.

## Outcome

Users know which documents were delivered and what remains outstanding.

## Parent and scope

Parent planning key: `EP-INVOICES`. Replace or accompany with the actual parent issue URL.
Reuse existing Invoices, numbering, deterministic amounts, correction, delivery, receivables and defined document/export formats. No new accounting engine.

## Current state / reuse evidence

Before publishing, add verified owner, source paths, related issue/PRs and missing delta. Current implementation is not established by this ticket specification. If already covered, map that evidence rather than opening duplicate work.

## Dependencies

Hard prerequisites: `INV-01`. Resolve to real issues or verified existing equivalents.
Conditional implementation gate: `REL-04` promotion decision or documented equivalent. Keep in the conditional backlog until evidence is recorded; discovery/planning may proceed.

## Acceptance criteria

- [ ] Delivery uses existing outbox/provider infrastructure with observable status and safe retries; issued does not imply delivered.
- [ ] Outstanding amounts derive from explicit authorized settlement evidence/current payment owner, including partial payment and credit adjustments.
- [ ] Due/reminder views use correct timezone and business policy; sensitive reminder sends are reviewed and deduplicated.
- [ ] No fund collection service or P3 Payments app is required; issued invoices never count as cash merely because they exist.

## Verification

Delivery failure/retry, partial settlement/credit reconciliation and reminder cancellation tests.

## Definition of Done

- [ ] Reuse and ownership evidence is recorded; only the scoped missing delta is implemented and existing behavior is preserved.
- [ ] Applicable permission/isolation, replay/concurrency and UI/error-state checks pass; commands, results and skips are reported accurately.
- [ ] Documentation and source/decision links are updated; no unsupported readiness, compliance, customer-validation or test claims.
- [ ] Acceptance criteria are demonstrated with evidence; planning or issue creation alone does not complete delivery.

---

## [P2][INV-04] Validate the selected invoice format and accountant handoff

<!-- corely-backlog:corely-internal-ops-v1:INV-04 -->

**Planning key:** `INV-04`\
**Type:** Feature\
**Catalog scope:** P2 — conditional next; not an implementation commitment\
**App/area:** #26 Corely Invoices\
**Research basis:** Supplied Corely_App_Catalog_and_Recommendations.md, app profiles #26; Corely_Documentation_Alignment_Prompt.md and later focused-launch refinement\
**Specification status:** Proposed planning; current implementation must be reconciled before publishing.

## Outcome

Deliver documents the chosen customer/accountant workflow can actually use.

## Parent and scope

Parent planning key: `EP-INVOICES`. Replace or accompany with the actual parent issue URL.
Reuse existing Invoices, numbering, deterministic amounts, correction, delivery, receivables and defined document/export formats. No new accounting engine.

## Current state / reuse evidence

Before publishing, add verified owner, source paths, related issue/PRs and missing delta. Current implementation is not established by this ticket specification. If already covered, map that evidence rather than opening duplicate work.

## Dependencies

Hard prerequisites: `INV-01`, `INV-03`. Resolve to real issues or verified existing equivalents.
Conditional implementation gate: `REL-04` promotion decision or documented equivalent. Keep in the conditional backlog until evidence is recorded; discovery/planning may proceed.

## Acceptance criteria

- [ ] Define the exact supported recipient/jurisdiction/document format and verify current official requirements with qualified review at implementation time.
- [ ] For any chosen structured e-invoice format, validate representative outputs and negative fixtures using the relevant specification/tooling; do not label a PDF alone compliant.
- [ ] Preserve source/export versions, originals and error reports; unsupported cases fail visibly rather than silently emitting an invalid document.
- [ ] Record accountant/provider acceptance and limitations; no blanket tax/compliance guarantee or full DATEV integration claim without actual verification.

## Verification

Format validator fixtures, export reconciliation, unsupported-format behavior and documented accountant acceptance.

## Definition of Done

- [ ] Reuse and ownership evidence is recorded; only the scoped missing delta is implemented and existing behavior is preserved.
- [ ] Applicable permission/isolation, replay/concurrency and UI/error-state checks pass; commands, results and skips are reported accurately.
- [ ] Documentation and source/decision links are updated; no unsupported readiness, compliance, customer-validation or test claims.
- [ ] Acceptance criteria are demonstrated with evidence; planning or issue creation alone does not complete delivery.

---

## [P2][EPIC][EP-BILLS] Corely Bills — supplier documents and payable review

<!-- corely-backlog:corely-internal-ops-v1:EP-BILLS -->

**Planning key:** `EP-BILLS`\
**Type:** Epic\
**Catalog scope:** P2 — conditional next; not an implementation commitment\
**App/area:** #27 Corely Bills\
**Research basis:** Supplied Corely_App_Catalog_and_Recommendations.md, app profiles #27; Corely_Documentation_Alignment_Prompt.md and later focused-launch refinement\
**Specification status:** Proposed planning; current implementation must be reconciled before publishing.

## Outcome

Collect supplier invoices and hand them off without conflating approval and settlement.

## Scope and exclusions

Reuse Purchasing/payable ownership where present; original documents, supplier resolution, review, duplicates, due balances and exports.

## Evidence / promotion gate

Promote for demonstrated supplier-document handling pain; vendor master data and payments stay with their existing owners.

Implementation additionally requires the promotion decision from `REL-04` or a documented equivalent. Ticket creation/discovery does not require promotion.

## Current state / reuse evidence

Populate with inspected branch/commit/date, real source paths and existing issue/PR matches. Not yet verified for this proposed epic; do not infer absence from the plan. Preserve unrelated existing work.

## Children

Planning keys below must be replaced or accompanied by real issue references after reconciliation.

- [ ] `BILL-01` — Map existing payables and complete bill intake
- [ ] `BILL-02` — Extract bill fields and review duplicate or matching suggestions
- [ ] `BILL-03` — Approve bills and track due amounts separately from settlement
- [ ] `BILL-04` — Export supplier documents and reconcile handoff corrections

## Exit criteria

- [ ] Each child is delivered, mapped to completed work with evidence, or explicitly not applicable by a recorded decision; unresolved delivery blockers remain visible.
- [ ] The end-to-end outcome and applicable security/privacy/reliability requirements are demonstrated, not inferred from issue closure alone.
- [ ] Scope/exclusions and any promotion gate are honored; remaining gaps and operational limitations are documented.
- [ ] Project membership, hierarchy and linked source/dependency records accurately reflect the reconciled backlog.

---

## [P2][BILL-01] Map existing payables and complete bill intake

<!-- corely-backlog:corely-internal-ops-v1:BILL-01 -->

**Planning key:** `BILL-01`\
**Type:** Feature\
**Catalog scope:** P2 — conditional next; not an implementation commitment\
**App/area:** #27 Corely Bills\
**Research basis:** Supplied Corely_App_Catalog_and_Recommendations.md, app profiles #27; Corely_Documentation_Alignment_Prompt.md and later focused-launch refinement\
**Specification status:** Proposed planning; current implementation must be reconciled before publishing.

## Outcome

Capture supplier documents without building a second payable store.

## Parent and scope

Parent planning key: `EP-BILLS`. Replace or accompany with the actual parent issue URL.
Reuse Purchasing/payable ownership where present; original documents, supplier resolution, review, duplicates, due balances and exports.

## Current state / reuse evidence

Before publishing, add verified owner, source paths, related issue/PRs and missing delta. Current implementation is not established by this ticket specification. If already covered, map that evidence rather than opening duplicate work.

## Dependencies

Hard prerequisites: `STR-01`, `PLAT-02`. Resolve to real issues or verified existing equivalents.
Conditional implementation gate: `REL-04` promotion decision or documented equivalent. Keep in the conditional backlog until evidence is recorded; discovery/planning may proceed.

## Acceptance criteria

- [ ] Attach promotion evidence and inspect current Purchasing/VendorBill/Party/Documents implementations before assigning ownership.
- [ ] Capture original PDF/structured file, supplier reference, invoice number/date, due date, currency and deterministic amounts with draft/review states.
- [ ] Supplier selection reuses the existing party master; employee claims remain in Expenses and P3 Vendors is not a prerequisite.
- [ ] Validation and file access reject malformed/cross-workspace input while preserving original evidence and correction history.

## Verification

Existing-payable regression, malformed document/amount validation and supplier/file authorization tests.

## Definition of Done

- [ ] Reuse and ownership evidence is recorded; only the scoped missing delta is implemented and existing behavior is preserved.
- [ ] Applicable permission/isolation, replay/concurrency and UI/error-state checks pass; commands, results and skips are reported accurately.
- [ ] Documentation and source/decision links are updated; no unsupported readiness, compliance, customer-validation or test claims.
- [ ] Acceptance criteria are demonstrated with evidence; planning or issue creation alone does not complete delivery.

---

## [P2][BILL-02] Extract bill fields and review duplicate or matching suggestions

<!-- corely-backlog:corely-internal-ops-v1:BILL-02 -->

**Planning key:** `BILL-02`\
**Type:** Feature\
**Catalog scope:** P2 — conditional next; not an implementation commitment\
**App/area:** #27 Corely Bills\
**Research basis:** Supplied Corely_App_Catalog_and_Recommendations.md, app profiles #27; Corely_Documentation_Alignment_Prompt.md and later focused-launch refinement\
**Specification status:** Proposed planning; current implementation must be reconciled before publishing.

## Outcome

AI reduces data entry while reviewers check the source.

## Parent and scope

Parent planning key: `EP-BILLS`. Replace or accompany with the actual parent issue URL.
Reuse Purchasing/payable ownership where present; original documents, supplier resolution, review, duplicates, due balances and exports.

## Current state / reuse evidence

Before publishing, add verified owner, source paths, related issue/PRs and missing delta. Current implementation is not established by this ticket specification. If already covered, map that evidence rather than opening duplicate work.

## Dependencies

Hard prerequisites: `BILL-01`, `OPS-01`. Resolve to real issues or verified existing equivalents.
Conditional implementation gate: `REL-04` promotion decision or documented equivalent. Keep in the conditional backlog until evidence is recorded; discovery/planning may proceed.

## Acceptance criteria

- [ ] Extraction proposes fields with original-document provenance and uncertainty; structured originals are preserved.
- [ ] Duplicate suggestions use visible supporting identifiers/amounts without auto-deletion or unsupported fraud claims.
- [ ] Purchase matching is optional when existing purchase records are present, with partial/mismatch exceptions; P3 Purchasing expansion is not required.
- [ ] Reviewers confirm changes and calculations are deterministic; malicious supplier instructions cannot change payment details or invoke privileged tools.

## Verification

Ambiguous/duplicate/partial-match fixtures, prompt injection, permissions and extraction-off manual entry.

## Definition of Done

- [ ] Reuse and ownership evidence is recorded; only the scoped missing delta is implemented and existing behavior is preserved.
- [ ] Applicable permission/isolation, replay/concurrency and UI/error-state checks pass; commands, results and skips are reported accurately.
- [ ] Documentation and source/decision links are updated; no unsupported readiness, compliance, customer-validation or test claims.
- [ ] Acceptance criteria are demonstrated with evidence; planning or issue creation alone does not complete delivery.

---

## [P2][BILL-03] Approve bills and track due amounts separately from settlement

<!-- corely-backlog:corely-internal-ops-v1:BILL-03 -->

**Planning key:** `BILL-03`\
**Type:** Feature\
**Catalog scope:** P2 — conditional next; not an implementation commitment\
**App/area:** #27 Corely Bills\
**Research basis:** Supplied Corely_App_Catalog_and_Recommendations.md, app profiles #27; Corely_Documentation_Alignment_Prompt.md and later focused-launch refinement\
**Specification status:** Proposed planning; current implementation must be reconciled before publishing.

## Outcome

Managers review payables without pretending approval releases funds.

## Parent and scope

Parent planning key: `EP-BILLS`. Replace or accompany with the actual parent issue URL.
Reuse Purchasing/payable ownership where present; original documents, supplier resolution, review, duplicates, due balances and exports.

## Current state / reuse evidence

Before publishing, add verified owner, source paths, related issue/PRs and missing delta. Current implementation is not established by this ticket specification. If already covered, map that evidence rather than opening duplicate work.

## Dependencies

Hard prerequisites: `BILL-01`, `REQ-02`. Resolve to real issues or verified existing equivalents.
Conditional implementation gate: `REL-04` promotion decision or documented equivalent. Keep in the conditional backlog until evidence is recorded; discovery/planning may proceed.

## Acceptance criteria

- [ ] Existing approval routing validates reviewer and current bill version; rejection/return/resubmission keeps history.
- [ ] Approved, scheduled externally, partially settled, settled and accounted states are distinct and based on linked evidence where supported.
- [ ] Outstanding/overdue views reconcile original amount, adjustments and confirmed settlement; no autonomous payment or bank-detail change.
- [ ] Corrections, duplicates and concurrent decisions remain traceable; optional Accounting/Payments apps are not required.

## Verification

Approval race/replay, partial settlement/adjustment and due-balance reconciliation tests.

## Definition of Done

- [ ] Reuse and ownership evidence is recorded; only the scoped missing delta is implemented and existing behavior is preserved.
- [ ] Applicable permission/isolation, replay/concurrency and UI/error-state checks pass; commands, results and skips are reported accurately.
- [ ] Documentation and source/decision links are updated; no unsupported readiness, compliance, customer-validation or test claims.
- [ ] Acceptance criteria are demonstrated with evidence; planning or issue creation alone does not complete delivery.

---

## [P2][BILL-04] Export supplier documents and reconcile handoff corrections

<!-- corely-backlog:corely-internal-ops-v1:BILL-04 -->

**Planning key:** `BILL-04`\
**Type:** Feature\
**Catalog scope:** P2 — conditional next; not an implementation commitment\
**App/area:** #27 Corely Bills\
**Research basis:** Supplied Corely_App_Catalog_and_Recommendations.md, app profiles #27; Corely_Documentation_Alignment_Prompt.md and later focused-launch refinement\
**Specification status:** Proposed planning; current implementation must be reconciled before publishing.

## Outcome

An accountant or external payment process receives dependable payable records.

## Parent and scope

Parent planning key: `EP-BILLS`. Replace or accompany with the actual parent issue URL.
Reuse Purchasing/payable ownership where present; original documents, supplier resolution, review, duplicates, due balances and exports.

## Current state / reuse evidence

Before publishing, add verified owner, source paths, related issue/PRs and missing delta. Current implementation is not established by this ticket specification. If already covered, map that evidence rather than opening duplicate work.

## Dependencies

Hard prerequisites: `BILL-03`. Resolve to real issues or verified existing equivalents.
Conditional implementation gate: `REL-04` promotion decision or documented equivalent. Keep in the conditional backlog until evidence is recorded; discovery/planning may proceed.

## Acceptance criteria

- [ ] Export an agreed format with original files, stable bill/supplier IDs, amounts/status and batch provenance under authorized access.
- [ ] Replay does not duplicate postings/exports downstream; acknowledgments and rejection errors are explicit where an integration supports them.
- [ ] Post-export correction/cancellation creates a linked adjustment trail rather than silently replacing prior handed-off data.
- [ ] Document actual accountant/provider acceptance and unsupported scenarios; do not claim a connector or compliance capability not tested.

## Verification

Batch replay/reconciliation, rejected-row and post-export correction fixtures plus recipient review.

## Definition of Done

- [ ] Reuse and ownership evidence is recorded; only the scoped missing delta is implemented and existing behavior is preserved.
- [ ] Applicable permission/isolation, replay/concurrency and UI/error-state checks pass; commands, results and skips are reported accurately.
- [ ] Documentation and source/decision links are updated; no unsupported readiness, compliance, customer-validation or test claims.
- [ ] Acceptance criteria are demonstrated with evidence; planning or issue creation alone does not complete delivery.

---

## [P2][EPIC][EP-BUDGETS] Corely Budgets — advisory spending plans and variance

<!-- corely-backlog:corely-internal-ops-v1:EP-BUDGETS -->

**Planning key:** `EP-BUDGETS`\
**Type:** Epic\
**Catalog scope:** P2 — conditional next; not an implementation commitment\
**App/area:** #28 Corely Budgets\
**Research basis:** Supplied Corely_App_Catalog_and_Recommendations.md, app profiles #28; Corely_Documentation_Alignment_Prompt.md and later focused-launch refinement\
**Specification status:** Proposed planning; current implementation must be reconciled before publishing.

## Outcome

Owners compare plans with dependable commitments/actuals without double counting.

## Scope and exclusions

Defined basis, periods/owners/categories, versions, source projections and advisory alerts. No automatic spending blocks or replacement transaction ledger.

## Evidence / promotion gate

Promote only after at least one reliable spend source and a customer need exist; source definitions and reconciliation must be agreed first.

Implementation additionally requires the promotion decision from `REL-04` or a documented equivalent. Ticket creation/discovery does not require promotion.

## Current state / reuse evidence

Populate with inspected branch/commit/date, real source paths and existing issue/PR matches. Not yet verified for this proposed epic; do not infer absence from the plan. Preserve unrelated existing work.

## Children

Planning keys below must be replaced or accompanied by real issue references after reconciliation.

- [ ] `BUD-01` — Define spending basis, source ownership and promotion evidence
- [ ] `BUD-02` — Manage budget periods, allocations and auditable versions
- [ ] `BUD-03` — Project commitments and actuals from the selected sources
- [ ] `BUD-04` — Explain variances and provide advisory spending warnings

## Exit criteria

- [ ] Each child is delivered, mapped to completed work with evidence, or explicitly not applicable by a recorded decision; unresolved delivery blockers remain visible.
- [ ] The end-to-end outcome and applicable security/privacy/reliability requirements are demonstrated, not inferred from issue closure alone.
- [ ] Scope/exclusions and any promotion gate are honored; remaining gaps and operational limitations are documented.
- [ ] Project membership, hierarchy and linked source/dependency records accurately reflect the reconciled backlog.

---

## [P2][BUD-01] Define spending basis, source ownership and promotion evidence

<!-- corely-backlog:corely-internal-ops-v1:BUD-01 -->

**Planning key:** `BUD-01`\
**Type:** Feature\
**Catalog scope:** P2 — conditional next; not an implementation commitment\
**App/area:** #28 Corely Budgets\
**Research basis:** Supplied Corely_App_Catalog_and_Recommendations.md, app profiles #28; Corely_Documentation_Alignment_Prompt.md and later focused-launch refinement\
**Specification status:** Proposed planning; current implementation must be reconciled before publishing.

## Outcome

Establish what a budget amount actually measures before showing variances.

## Parent and scope

Parent planning key: `EP-BUDGETS`. Replace or accompany with the actual parent issue URL.
Defined basis, periods/owners/categories, versions, source projections and advisory alerts. No automatic spending blocks or replacement transaction ledger.

## Current state / reuse evidence

Before publishing, add verified owner, source paths, related issue/PRs and missing delta. Current implementation is not established by this ticket specification. If already covered, map that evidence rather than opening duplicate work.

## Dependencies

Hard prerequisites: `STR-01`. Resolve to real issues or verified existing equivalents.
Conditional implementation gate: `REL-04` promotion decision or documented equivalent. Keep in the conditional backlog until evidence is recorded; discovery/planning may proceed.

## Acceptance criteria

- [ ] Attach customer demand and evidence for at least one reliable source: existing or promoted Expenses, Bills or a verified external feed.
- [ ] Define cash/accrual-oriented operational basis, commitments versus actuals, currency treatment, periods and categorization without promising a statutory ledger.
- [ ] Document how requests/orders/bills/payments representing one expense avoid double counting; unsupported conversions or allocations remain visible.
- [ ] Choose only the needed source integrations and record their dependency IDs; do not force all finance/P3 apps to be enabled.

## Verification

Review sample transaction lifecycle calculations and source reconciliation with the owner/accountant.

## Definition of Done

- [ ] Reuse and ownership evidence is recorded; only the scoped missing delta is implemented and existing behavior is preserved.
- [ ] Applicable permission/isolation, replay/concurrency and UI/error-state checks pass; commands, results and skips are reported accurately.
- [ ] Documentation and source/decision links are updated; no unsupported readiness, compliance, customer-validation or test claims.
- [ ] Acceptance criteria are demonstrated with evidence; planning or issue creation alone does not complete delivery.

---

## [P2][BUD-02] Manage budget periods, allocations and auditable versions

<!-- corely-backlog:corely-internal-ops-v1:BUD-02 -->

**Planning key:** `BUD-02`\
**Type:** Feature\
**Catalog scope:** P2 — conditional next; not an implementation commitment\
**App/area:** #28 Corely Budgets\
**Research basis:** Supplied Corely_App_Catalog_and_Recommendations.md, app profiles #28; Corely_Documentation_Alignment_Prompt.md and later focused-launch refinement\
**Specification status:** Proposed planning; current implementation must be reconciled before publishing.

## Outcome

Managers maintain a clear spending plan without rewriting approved history.

## Parent and scope

Parent planning key: `EP-BUDGETS`. Replace or accompany with the actual parent issue URL.
Defined basis, periods/owners/categories, versions, source projections and advisory alerts. No automatic spending blocks or replacement transaction ledger.

## Current state / reuse evidence

Before publishing, add verified owner, source paths, related issue/PRs and missing delta. Current implementation is not established by this ticket specification. If already covered, map that evidence rather than opening duplicate work.

## Dependencies

Hard prerequisites: `BUD-01`, `PLAT-02`. Resolve to real issues or verified existing equivalents.
Conditional implementation gate: `REL-04` promotion decision or documented equivalent. Keep in the conditional backlog until evidence is recorded; discovery/planning may proceed.

## Acceptance criteria

- [ ] Authorized owners create periods, categories/location/team allocations and draft/published versions using deterministic amounts.
- [ ] Amendments preserve earlier versions, actor/reason and effective dates; invalid/overlapping configurations are rejected or explicitly handled.
- [ ] Permissions isolate sensitive team budgets and changes; imports/commands tolerate retry without duplicate allocations.
- [ ] The app stores plans, not competing copies of source transactions, and works without full Accounting.

## Verification

Version/amendment, permission, amount/period and retry tests.

## Definition of Done

- [ ] Reuse and ownership evidence is recorded; only the scoped missing delta is implemented and existing behavior is preserved.
- [ ] Applicable permission/isolation, replay/concurrency and UI/error-state checks pass; commands, results and skips are reported accurately.
- [ ] Documentation and source/decision links are updated; no unsupported readiness, compliance, customer-validation or test claims.
- [ ] Acceptance criteria are demonstrated with evidence; planning or issue creation alone does not complete delivery.

---

## [P2][BUD-03] Project commitments and actuals from the selected sources

<!-- corely-backlog:corely-internal-ops-v1:BUD-03 -->

**Planning key:** `BUD-03`\
**Type:** Feature\
**Catalog scope:** P2 — conditional next; not an implementation commitment\
**App/area:** #28 Corely Budgets\
**Research basis:** Supplied Corely_App_Catalog_and_Recommendations.md, app profiles #28; Corely_Documentation_Alignment_Prompt.md and later focused-launch refinement\
**Specification status:** Proposed planning; current implementation must be reconciled before publishing.

## Outcome

Budget utilization is traceable and does not count the same cost twice.

## Parent and scope

Parent planning key: `EP-BUDGETS`. Replace or accompany with the actual parent issue URL.
Defined basis, periods/owners/categories, versions, source projections and advisory alerts. No automatic spending blocks or replacement transaction ledger.

## Current state / reuse evidence

Before publishing, add verified owner, source paths, related issue/PRs and missing delta. Current implementation is not established by this ticket specification. If already covered, map that evidence rather than opening duplicate work.

## Dependencies

Hard prerequisites: `BUD-01`, `BUD-02`. Resolve to real issues or verified existing equivalents.
Conditional implementation gate: `REL-04` promotion decision or documented equivalent. Keep in the conditional backlog until evidence is recorded; discovery/planning may proceed.

## Specific notes

Conditional dependency: link EXP-03, BILL-03 or a verified existing/external equivalent selected by BUD-01. Alternatives are not an AND requirement.

## Acceptance criteria

- [ ] Implement only the selected reliable source adapters through contracts/events and stable origin IDs; actual source dependencies are linked before implementation.
- [ ] Cancellation, correction, partial settlement and duplicate/out-of-order events converge on documented basis calculations.
- [ ] Every utilization figure drills into permitted source records with freshness and a reconcilable total; missing data is not treated as zero.
- [ ] Projection rebuild is idempotent and does not write source-owner tables or require unpromoted apps.

## Verification

Lifecycle/replay/rebuild and source-total reconciliation tests, including partial/cancelled transactions.

## Definition of Done

- [ ] Reuse and ownership evidence is recorded; only the scoped missing delta is implemented and existing behavior is preserved.
- [ ] Applicable permission/isolation, replay/concurrency and UI/error-state checks pass; commands, results and skips are reported accurately.
- [ ] Documentation and source/decision links are updated; no unsupported readiness, compliance, customer-validation or test claims.
- [ ] Acceptance criteria are demonstrated with evidence; planning or issue creation alone does not complete delivery.

---

## [P2][BUD-04] Explain variances and provide advisory spending warnings

<!-- corely-backlog:corely-internal-ops-v1:BUD-04 -->

**Planning key:** `BUD-04`\
**Type:** Feature\
**Catalog scope:** P2 — conditional next; not an implementation commitment\
**App/area:** #28 Corely Budgets\
**Research basis:** Supplied Corely_App_Catalog_and_Recommendations.md, app profiles #28; Corely_Documentation_Alignment_Prompt.md and later focused-launch refinement\
**Specification status:** Proposed planning; current implementation must be reconciled before publishing.

## Outcome

Managers understand deviations and choose actions themselves.

## Parent and scope

Parent planning key: `EP-BUDGETS`. Replace or accompany with the actual parent issue URL.
Defined basis, periods/owners/categories, versions, source projections and advisory alerts. No automatic spending blocks or replacement transaction ledger.

## Current state / reuse evidence

Before publishing, add verified owner, source paths, related issue/PRs and missing delta. Current implementation is not established by this ticket specification. If already covered, map that evidence rather than opening duplicate work.

## Dependencies

Hard prerequisites: `BUD-03`, `OPS-01`. Resolve to real issues or verified existing equivalents.
Conditional implementation gate: `REL-04` promotion decision or documented equivalent. Keep in the conditional backlog until evidence is recorded; discovery/planning may proceed.

## Acceptance criteria

- [ ] Show planned, committed and actual amounts/variance under the selected basis with source links and explicit freshness.
- [ ] Threshold warnings are advisory and permission-filtered; no automatic procurement, payment or spending block is introduced.
- [ ] AI may draft plans/explanations from authorized records and labeled assumptions, but cannot silently alter approved budgets.
- [ ] Tests cover missing sources, unsupported currencies and unauthorized drilldown; manual reports remain useful with AI disabled.

## Verification

Variance fixture/reconciliation checks, warning deduplication, explanation-grounding and AI-off tests.

## Definition of Done

- [ ] Reuse and ownership evidence is recorded; only the scoped missing delta is implemented and existing behavior is preserved.
- [ ] Applicable permission/isolation, replay/concurrency and UI/error-state checks pass; commands, results and skips are reported accurately.
- [ ] Documentation and source/decision links are updated; no unsupported readiness, compliance, customer-validation or test claims.
- [ ] Acceptance criteria are demonstrated with evidence; planning or issue creation alone does not complete delivery.

---
