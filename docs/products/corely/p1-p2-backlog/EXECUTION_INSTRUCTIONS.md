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
