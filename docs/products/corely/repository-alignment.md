# Repository alignment and evidence

## Inspection metadata and limits

- Initial inspection on **2026-11-07**, branch **`development`**, commit
  **`4145f5598b2387b24ca48122b6ccc71b984a25c1`**; initial status was clean.
- During this task an external fast-forward moved the checkout to
  **`e95e77dc6db62176b376a6c1e9ffddf0e2417c35`** (OpenBuk merge #280).
  Re-inspected affected sources and documentation at that commit. All final
  implementation claims below use this updated baseline. This task did not
  switch branches, pull, commit, push or open a PR.
- Remote is named `corely`, pointing to `Corely-AI/corely`; no `origin` exists.
  Read-only `git ls-remote --symref corely HEAD` verified default `development`
  and HEAD `e95e77dc6db62176b376a6c1e9ffddf0e2417c35`.
- Read root AGENTS, README, package/workspace configuration, contributor/license
  guidance, architecture/boundaries/persistence, platform/menu/entitlements,
  AI/CRUD/shared UI, module guide, ADR-0001, OpenBuk product notes and active
  docs-site entry points. Inspected selected module/domain/use-case/controller/
  adapter code, manifests/registries, contracts, models, routes and test assertions.
- This is a scoped static review, not an exhaustive audit of every file/endpoint.
  `.agent/workflows` was absent; only root AGENTS was found in the repository.
  OpenBuk sources/docs appeared with the external fast-forward and were re-read.
- No new external market, competitor or legal research. No production telemetry,
  customer interviews, deployed journeys or fresh application tests establish
  readiness. Test files below show specified coverage, not passing results.

## Evidence status versus priority

| Status                      | Meaning                                                                                                                                       |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Code present                | Concrete code for the named capability or substantial subset; remaining gaps are explicit. Not a completeness or production-readiness rating. |
| Partial                     | Adjacent/shared code or an incomplete subset exists; it is not equivalent to the catalog scope.                                               |
| Documented only             | Prior documentation describes a candidate, but supporting implementation was not found in reviewed scope.                                     |
| Not found in reviewed scope | Searches of module/contract/model/UI inventories did not identify the proposed owner/journey. Not proof of global absence.                    |
| Unknown                     | Evidence was insufficient to assess the named part.                                                                                           |

Recommendations are product investment choices, separate from these statuses.
**Deferred** means defer additional investment, not missing, delete, or stop
maintenance. All ownership marked “candidate” is proposed, not a new module decision.
“Unknown” applies to operational readiness for every row in this inspection.

## All 32 apps mapped to this checkout

Evidence keys link to source bundles below. UI/API/data/tests identify inspected
artifacts; “not found” is scoped to this review. IDs preserve discussion order.

| App                                        | Current owner/candidate                                                                 | UI/API/data/tests                                                                                                                                          | Evidence status             | Gap to proposed scope                                                                             | Next recommendation                                                                      |
| ------------------------------------------ | --------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- | ------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| <a id="app-01"></a>01. Corely Tasks        | No employee task owner; workflow/CRM adjacent                                           | [E2](#e2-work-and-decisions): workflow Task model/handlers and CRM Activity; no employee checklist UI/API/tests identified                                 | Partial                     | Recurring employee work, assignment/completion and daily view differ from execution tasks         | Validate thin daily-work slice; assess reuse before a scoped build                       |
| <a id="app-02"></a>02. Corely People       | Identity/party/Booking adjacent; employee owner unassigned                              | [E3](#e3-people-and-resource-concepts): users/memberships, parties, resources; no staff/absence journey/tests identified                                   | Partial                     | Employee records, working patterns, private absence and authorized availability projection        | Define narrow ownership and privacy requirements after validation                        |
| <a id="app-03"></a>03. Corely Appointments | Existing `booking`                                                                      | [E1](#e1-booking): admin/public UI plus focused OpenBuk client, controllers/use cases, contracts/schema, unit/integration/E2E specifications               | Code present                | Multi-staff/service lifecycle, staff-absence link, adoption integration and release gates remain  | Reuse/extend Booking; audit isolation, permissions, concurrency and transaction behavior |
| <a id="app-04"></a>04. Corely Requests     | Forms + approvals + workflow candidates                                                 | [E2](#e2-work-and-decisions): forms UI/API/schema/tests; approval inbox API/services and workflow data/test                                                | Partial                     | Composed narrow submissions/decisions and domain application, absence flow                        | Reuse services/contracts; validate one request type                                      |
| <a id="app-05"></a>05. Corely Knowledge    | Documents/CMS candidates                                                                | [E4](#e4-content-and-learning-adjacencies): file/page APIs/data/UI; no approved-policy lifecycle verified                                                  | Partial                     | Approval/version/access semantics for employee instructions                                       | Reuse links/attachments/simple pages; defer full wiki                                    |
| <a id="app-06"></a>06. Corely Projects     | Unassigned; historical architecture candidate                                           | Architecture lists Projects/Jobs; [E4](#e4-content-and-learning-adjacencies) portfolio project code serves a different purpose                             | Documented only             | Operational milestones and shared employee Tasks relation not found                               | Defer until Tasks and initiative demand exist                                            |
| <a id="app-07"></a>07. Corely Goals        | Unassigned                                                                              | No dedicated UI/API/data/tests found in reviewed inventories                                                                                               | Not found in reviewed scope | Objective/check-in ownership                                                                      | Defer; no performance scores                                                             |
| <a id="app-08"></a>08. Corely Meetings     | Shared feature candidate                                                                | No meeting agenda/decision owner or journey/tests found                                                                                                    | Not found in reviewed scope | Agenda, decisions and employee action links                                                       | Defer standalone app; validate lightweight feature                                       |
| <a id="app-09"></a>09. Corely Updates      | Notifications/shared feature candidate                                                  | [E5](#e5-platform-and-notifications): notification runtime/data; no team-announcement authoring journey verified                                           | Partial                     | Editorial audience, approval and digest behavior                                                  | Shared feature first                                                                     |
| <a id="app-10"></a>10. Corely Workflows    | Existing `workflow`, API background runtime, `packages/core`; automation shell adjacent | [E2](#e2-work-and-decisions): API/runtime/Task models and queue test; broad designer UI not established                                                    | Partial                     | Product configuration, safe cross-app commands, operator recovery                                 | Reuse execution; defer broad visual builder                                              |
| <a id="app-11"></a>11. Corely Shifts       | Unassigned; historical light-HR candidate                                               | Architecture mentions shifts; Booking resource availability is not a staff roster                                                                          | Documented only             | Coverage planning, working-pattern connection and changes                                         | Conditional leading expansion after pilot demand                                         |
| <a id="app-12"></a>12. Corely Time         | Unassigned                                                                              | Workspace template contains `time.tracking`; no dedicated timesheet journey/tests found                                                                    | Partial                     | Time/break entries, correction/approval and specialist rules                                      | Assess integrations before build                                                         |
| <a id="app-13"></a>13. Corely Hiring       | Unassigned/integration candidate                                                        | No recruitment UI/API/data/tests found                                                                                                                     | Not found in reviewed scope | Recruitment administration                                                                        | Defer/integrate; no candidate ranking                                                    |
| <a id="app-14"></a>14. Corely Learning     | Knowledge + classes candidates                                                          | [E4](#e4-content-and-learning-adjacencies): classes/attendance is educational-vertical code, not verified staff learning                                   | Partial                     | Staff paths and completion ownership                                                              | Defer; reuse approved Knowledge                                                          |
| <a id="app-15"></a>15. Corely Feedback     | Forms/integration candidate                                                             | [E2](#e2-work-and-decisions): submission code/tests; feedback anonymity/retrospectives unverified                                                          | Partial                     | Purpose/access/anonymity and follow-up                                                            | Templates/integration first                                                              |
| <a id="app-16"></a>16. Corely Expenses     | Existing `expenses`, documents/approvals adjacent                                       | [E6](#e6-operational-finance): UI/API/contracts/Expense lines/statuses/receipt contracts; unit/integration/E2E files                                       | Code present                | Employee claim ownership, end-to-end approval and reimbursement not established by statuses alone | Reuse/assess; extend only when needed                                                    |
| <a id="app-17"></a>17. Corely Purchasing   | Existing `purchasing`                                                                   | [E6](#e6-operational-finance): purchase-order UI/use cases/contracts/models; no dedicated purchasing tests found in module review                          | Code present                | Request-to-order approval and delivery coordination need journey validation                       | Reuse/extend owner; validate critical flow                                               |
| <a id="app-18"></a>18. Corely Assets       | Inventory candidate; historical combined asset/maintenance design                       | [E7](#e7-inventory-issues-and-analytics): stock code is not equipment assignment; architecture proposes Asset                                              | Documented only             | Asset register, custody, handover/lifecycle                                                       | Conditional; assess inventory integration                                                |
| <a id="app-19"></a>19. Corely Vendors      | Existing `party`; purchasing consumes supplier IDs                                      | [E3](#e3-people-and-resource-concepts), [E6](#e6-operational-finance): supplier navigation, party model/customer tests, supplierPartyId                    | Partial                     | Supplier-specific onboarding, validation and restricted changes                                   | Reuse/extend party master data                                                           |
| <a id="app-20"></a>20. Corely Contracts    | Documents + coaching-engagements adjacent                                               | [E4](#e4-content-and-learning-adjacencies): coaching signing journey/E2E file; generic obligations register not verified                                   | Partial                     | Contract owners, renewals/obligations and signing integration                                     | Defer generic register; assess existing specialization                                   |
| <a id="app-21"></a>21. Corely Helpdesk     | Existing `issues` candidate                                                             | [E7](#e7-inventory-issues-and-analytics): issue list/detail UI, API/use cases, schema/contracts/rule specs                                                 | Partial                     | Internal queues, access, triage/service policies versus site issues                               | Conditional extension after volume evidence                                              |
| <a id="app-22"></a>22. Corely Maintenance  | Issues/inventory candidates; historical architecture design                             | Architecture proposes service work; [E7](#e7-inventory-issues-and-analytics) does not establish maintenance lifecycle/tests                                | Documented only             | Preventive schedules, inspections, asset/service history                                          | Defer until equipment-heavy demand                                                       |
| <a id="app-23"></a>23. Corely Visitors     | Unassigned/integration candidate                                                        | No visitor/host journey or tests found                                                                                                                     | Not found in reviewed scope | Guest registration, host notification, retention                                                  | Defer/integrate                                                                          |
| <a id="app-24"></a>24. Corely Travel       | Forms/approvals/integration candidates                                                  | [E2](#e2-work-and-decisions): generic request infrastructure, no travel-specific records/journey/tests found                                               | Partial                     | Trip requests/itineraries and restricted traveler information                                     | Templates/integration first                                                              |
| <a id="app-25"></a>25. Corely Insights     | Existing `reporting`, domain read models                                                | [E7](#e7-inventory-issues-and-analytics): reporting contracts/query use cases; dashboard currently counts expenses; operational analytics UI/tests unknown | Partial                     | Reliable cross-app definitions, freshness, access filtering and operational measures              | Basic reports within experiences first                                                   |
| <a id="app-26"></a>26. Corely Invoices     | Existing `invoices`; not SaaS `billing`                                                 | [E6](#e6-operational-finance): UI/API/contracts, invoice/payment/PDF/email models and unit/integration/E2E files                                           | Code present                | Credit-note completeness and receivables journey require focused assessment                       | Reuse/extend by demand                                                                   |
| <a id="app-27"></a>27. Corely Bills        | Existing `purchasing`                                                                   | [E6](#e6-operational-finance): vendor-bill/payment UI/use cases/contracts/models; dedicated tests not found in module review                               | Code present                | Invoice capture, approvals/due-date journey and tested coverage                                   | Reuse purchasing payables; do not create parallel bills                                  |
| <a id="app-28"></a>28. Corely Budgets      | Unassigned                                                                              | No spending-plan/commitment/variance journey/tests found                                                                                                   | Not found in reviewed scope | Reliable commitments and budget ownership                                                         | Defer until source records and demand justify                                            |
| <a id="app-29"></a>29. Corely Cash Flow    | Reporting/finance candidate, distinct from cash-management                              | [E8](#e8-cash-payments-and-subscriptions): registers/entries/day close exist, no forecast scenarios verified                                               | Partial                     | Forecast source reconciliation, assumptions and freshness                                         | Defer forecasts; assess source quality                                                   |
| <a id="app-30"></a>30. Corely Payments     | Invoice/purchasing payments + integration adapters                                      | [E8](#e8-cash-payments-and-subscriptions): payment methods, provider packages and payment records; settlement product unknown                              | Partial                     | Unified collection/disbursement/refund/settlement authority and reconciliation                    | Provider integration first; no processor build                                           |
| <a id="app-31"></a>31. Corely Accounting   | Existing `accounting`                                                                   | [E6](#e6-operational-finance): ledger/journal/period models, UI/contracts/use cases including statements; module-local tests not found                     | Code present                | Reconciliation/closing journey, coverage and optional adoption need assessment                    | Preserve/maintain; defer broad specialist commitments                                    |
| <a id="app-32"></a>32. Corely Financing    | Unassigned                                                                              | No loan/lease/funding administration owner or tests found                                                                                                  | Not found in reviewed scope | Existing obligations/documents/repayment tracking                                                 | Defer; no lending, credit scoring or marketplace                                         |

## Source bundles

### E1. Booking

- [Module](../../../services/api/src/modules/booking/booking.module.ts),
  [manifest](../../../services/api/src/modules/booking/booking.manifest.ts),
  [create use case](../../../services/api/src/modules/booking/application/use-cases/create-booking.usecase.ts),
  [repository](../../../services/api/src/modules/booking/infrastructure/adapters/prisma-booking-repo.adapter.ts),
  [public controller](../../../services/api/src/modules/booking/http/public-booking.controller.ts).
- [Contracts](../../../packages/contracts/src/booking/),
  [models](../../../packages/data/prisma/schema/83_booking.prisma),
  [admin routes](../../../apps/web/src/app/router/booking-routes.tsx),
  [public UI](../../../apps/public-web/src/components/pages/public-booking-client.tsx).
- [Cross-cutting E2E](../../../apps/e2e/tests/booking/booking-cross-cutting.e2e.spec.ts)
  specifies idempotency, conflicts, expiry, cross-tenant isolation, audit and outbox;
  [public smoke](../../../apps/e2e/tests/public-booking.spec.ts) is environment-gated.
  No fresh run or universal concurrency/multi-workspace guarantee inferred.
- [OpenBuk use case](../../../services/api/src/modules/booking/application/use-cases/openbuk-studio.usecase.ts),
  [workspace-scoped adapter](../../../services/api/src/modules/booking/infrastructure/adapters/prisma-openbuk-repository.adapter.ts),
  [availability domain](../../../services/api/src/modules/booking/domain/openbuk-availability.ts),
  [contracts](../../../packages/contracts/src/booking/openbuk.schema.ts),
  [client routes](../../../apps/openbuk-web/src/app/app.tsx),
  [unit spec](../../../services/api/src/modules/booking/__tests__/openbuk-availability.spec.ts),
  [integration suite](../../../services/api/src/modules/booking/__tests__/openbuk.int.test.ts),
  [browser scenario](../../../apps/e2e/tests/openbuk/openbuk.e2e.spec.ts).
  Source shows workspace membership/manage checks, deterministic slots, resource
  advisory locks and one transaction for booking/receipt/audit/outbox. These are
  specific to the OpenBuk path; do not generalize to legacy Booking paths.
  [OpenBuk release note](../openbuk/README.md) retains 2026-10-04 historical results
  and remaining gates; none are fresh results from this task.

### E2. Work and decisions

- [Workflow models](../../../packages/data/prisma/schema/90_workflow.prisma)
  define execution `Task` with instance/type/attempts; [CRM model](../../../packages/data/prisma/schema/45_party_crm.prisma)
  defines `Activity`. Neither establishes employee Tasks.
- [Approval service](../../../services/api/src/modules/approvals/application/approval-request.service.ts),
  [gate](../../../services/api/src/modules/approvals/application/approval-gate.service.ts),
  [contracts](../../../packages/contracts/src/approvals/approval.schemas.ts),
  [builder test](../../../services/api/src/modules/approvals/__tests__/approval-spec.builder.test.ts).
- [Forms module](../../../services/api/src/modules/forms/),
  [UI](../../../apps/web/src/modules/forms/),
  [models](../../../packages/data/prisma/schema/66_forms.prisma),
  [integration test](../../../services/api/src/modules/forms/__tests__/forms-api.int.test.ts).
- [Workflow service](../../../services/api/src/modules/workflow/application/workflow.service.ts),
  [queue test](../../../services/api/src/modules/workflow/infrastructure/__tests__/workflow-queue.client.test.ts),
  [API-hosted runtime](../../../services/api/src/modules/background/runtime/modules/workflows/),
  [engine](../../../packages/core/). `automation.module.ts` alone proves no full automation product.

### E3. People and resource concepts

- [Identity](../../../services/api/src/modules/identity/),
  [party manifest](../../../services/api/src/modules/party/party.manifest.ts),
  [party tests](../../../services/api/src/modules/party/application/use-cases/customer.usecases.test.ts),
  [party models](../../../packages/data/prisma/schema/45_party_crm.prisma),
  [booking models](../../../packages/data/prisma/schema/83_booking.prisma).
- [Workspace templates](../../../services/api/src/modules/platform/application/services/workspace-template.service.ts)
  contain capability keys such as `time.tracking`; keys are not timesheet implementation.
  No dedicated People, absence, Shifts or Time module identified.

### E4. Content and learning adjacencies

- [Documents](../../../services/api/src/modules/documents/),
  [CMS](../../../services/api/src/modules/cms/), [website](../../../services/api/src/modules/website/),
  [portfolio models](../../../packages/data/prisma/schema/76_portfolio.prisma),
  [classes](../../../services/api/src/modules/classes/),
  [coaching](../../../services/api/src/modules/coaching-engagements/),
  [contract-signature E2E](../../../apps/e2e/tests/coaching-contract-signature.e2e.spec.ts).
  Existing specialized records are not automatically Knowledge, Projects, Learning
  or a generic Contracts register. Approved staff content lifecycle remains unknown.

### E5. Platform and notifications

- [API composition](../../../services/api/src/app.module.ts),
  [manifest contract](../../../packages/contracts/src/platform/app-manifest.schema.ts),
  [registry](../../../services/api/src/modules/platform/infrastructure/registries/app-registry.ts),
  [enable use case](../../../services/api/src/modules/platform/application/use-cases/enable-app.usecase.ts),
  [entitlements](../../../services/api/src/modules/platform/application/services/tenant-entitlement.service.ts),
  [menu builder](../../../services/api/src/modules/platform/application/services/menu-builder.service.ts),
  [menu specs](../../../services/api/src/modules/platform/__tests__/menu-builder.service.spec.ts).
- [Notifications](../../../services/api/src/modules/notifications/),
  [models](../../../packages/data/prisma/schema/92_notifications.prisma),
  [tenant/menu documentation](../../platform/tenant-features-and-menu-permissions.md),
  [shared frontend workspace provider](../../../packages/web-shared/src/shared/workspaces/workspace-config-provider.tsx).

### E6. Operational finance

- Owners: [expenses](../../../services/api/src/modules/expenses/),
  [invoices](../../../services/api/src/modules/invoices/),
  [purchasing](../../../services/api/src/modules/purchasing/),
  [accounting](../../../services/api/src/modules/accounting/).
  Their matching directories under `packages/contracts/src` and
  `apps/web/src/modules` contain wire contracts and UI code.
- Models: [expenses](../../../packages/data/prisma/schema/65_expenses.prisma),
  [invoices and SaaS billing](../../../packages/data/prisma/schema/60_billing.prisma),
  [purchasing/payables](../../../packages/data/prisma/schema/69_purchasing.prisma),
  [accounting](../../../packages/data/prisma/schema/58_accounting.prisma).
- [Expense create test](../../../services/api/src/modules/expenses/application/use-cases/__tests__/create-expense.usecase.test.ts),
  [expense integration](../../../services/api/src/modules/expenses/__tests__/expenses-api.int.test.ts),
  [invoice integration](../../../services/api/src/modules/invoices/__tests__/invoices-api.int.test.ts),
  [expense E2E](../../../apps/e2e/tests/expenses.spec.ts),
  [invoice E2E](../../../apps/e2e/tests/invoices.spec.ts).
  No fresh pass claimed. Status enums alone do not prove employee reimbursement.

### E7. Inventory, issues and analytics

- [Inventory](../../../services/api/src/modules/inventory/),
  [issues](../../../services/api/src/modules/issues/),
  [issue UI](../../../apps/web/src/modules/issues/),
  [issue schema](../../../packages/data/prisma/schema/77_issues.prisma),
  [issue rules spec](../../../services/api/src/modules/issues/__tests__/issue-rules.spec.ts).
- [Dashboard report use case](../../../services/api/src/modules/reporting/application/use-cases/get-dashboard-report.usecase.ts)
  returns an expense count; [monthly pack](../../../services/api/src/modules/reporting/application/use-cases/get-monthly-pack.usecase.ts)
  and [contracts](../../../packages/contracts/src/reporting/) are additional reuse points.
  These are not proof of broad cross-app operational analytics.

### E8. Cash, payments and subscriptions

- [Cash management](../../../services/api/src/modules/cash-management/),
  [cash client](../../../apps/cash-management/),
  [cash schema](../../../packages/data/prisma/schema/63_cash_management.prisma).
- [Payment methods](../../../services/api/src/modules/payment-methods/),
  [schema](../../../packages/data/prisma/schema/61_payment_methods.prisma),
  [provider packages](../../../packages/integrations/),
  [SaaS billing](../../../services/api/src/modules/billing/),
  [platform entitlements](../../../services/api/src/modules/platform-entitlements/).
  Provider packages/configuration do not prove operational settlement, disbursement
  or regulatory readiness. Cash-flow forecasting was not established.

## Domains and surfaces outside the catalog

These remain maintained capabilities, not deprecated features or automatic launch
priorities. Directory/import presence is scoped code evidence, not a completed journey.

| Domain group found           | Owners and concrete inventory                                                                                                                                                                                                                                                   | Relationship to proposal                                                                                                        |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Customer/revenue operations  | `party`, `crm`, `crm-mail`, `sales`, `catalog`, `engagement`; models 45, 67, 68, 73                                                                                                                                                                                             | Preserve customer/supplier ownership; CRM activities are not employee Tasks                                                     |
| Tax, cash, POS and stock     | `tax`, `cash-management`, `pos`, `inventory`, `import`; models 62, 63, 71, 71b, 72                                                                                                                                                                                              | Preserve specialists; cash is not forecasting; register shifts are not staff rosters                                            |
| Public content and verticals | `website`, `cms`, `forms`, `portfolio`, `rentals`, `classes`, `coaching-engagements`, `directory`, `restaurant`, `portal`; corresponding Prisma files 46, 66, 74–79, 81, 72c                                                                                                    | Public booking/content and other vertical journeys remain; do not force-fit portfolio projects or classes into operational apps |
| Platform/support             | `identity`, `workspaces`, `platform`, `platform-entitlements`, `platform-custom-attributes`, `customization`, `documents`, `notifications`, `integrations`, `onboarding`, `ai-copilot`, `ai-richtext`, `background`, `shared`, `test-harness`; `privacy` directory also present | Reuse public contracts/ports; privacy directory alone does not prove global app-module registration or compliance               |

[API composition](../../../services/api/src/app.module.ts) and the
[Prisma directory](../../../packages/data/prisma/schema/) anchor this inventory.

| Tracked application workspace                            | Runtime / purpose evidenced by package scripts                        |
| -------------------------------------------------------- | --------------------------------------------------------------------- |
| `apps/web`                                               | Vite + React admin including Booking                                  |
| `apps/openbuk-web`                                       | Focused Vite booking product with marketing/auth/studio/public routes |
| `apps/freelancer`, `apps/crm`, `apps/cash-management`    | Focused Vite clients using shared packages                            |
| `apps/portal`, `apps/restaurant-listing`, `apps/landing` | Vite entry points for their contexts                                  |
| `apps/public-web`, `apps/website-runtime`                | Next.js public journeys and website runtime                           |
| `apps/pos`                                               | Expo + React Native                                                   |
| `apps/e2e`                                               | Test workspace, not a deployed customer app                           |

`apps/eric-wategay` is a tracked .NET 10 ERiC gateway with C# contracts/tests,
not a pnpm workspace; its native runtime remains scaffolded per its README.
`services/mock-server` has no tracked source/package in this commit despite older
documentation claims. API runtime is `services/api`, with background under its modules. Shared UI lives in
`packages/ui`, `packages/web-shared`, `packages/web-features`; focused clients
must not fork private screens. Deployment health was not inspected.

## Discrepancy register

| Current claim, target or interpretation                                                                                   | Evidence                                                                                                                                                                    | Documentation action                                                                   | Engineering follow-up (not performed here)                                                       |
| ------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| ERP/freelancer-first primary identity                                                                                     | Root README/AGENTS and architect intent at inspected commit                                                                                                                 | Align primary entry points; retain valid accounting/ERP domain history                 | Validate segment and package before implementation                                               |
| Interpretation to avoid: OpenBuk first slice equals full operational package                                              | Re-inspected #280 adds dedicated client, shared Booking use case and tests; product note retains release gates                                                              | Link strategy while preserving implementation detail, languages and dated verification | Assess multi-staff/service/lifecycle and release gates; do not duplicate Booking                 |
| Booking “coming soon”                                                                                                     | E1 code/routes/models/unit/integration/E2E files exist                                                                                                                      | Correct root inventory to code present with readiness limit                            | Verify pilot-critical journeys                                                                   |
| Background hierarchy suggests separate service; contributor command uses worker; mock-first docs reference absent runtime | `AppModule` imports BackgroundModule; no root `dev:worker`/`dev:mock`; no tracked mock server                                                                               | Correct runtime map and contributor commands                                           | Retain API-hosted runtime; no service recreation                                                 |
| Interpretation to avoid: menu filtering establishes backend access safety                                                 | Booking manifest has `permissions: []`; BookingController has AuthGuard/RequireTenant but no explicit operation RBAC in that file                                           | Distinguish visibility/authorization, avoid global audited-control claims              | Audit effective guards, per-operation grants and negative tests                                  |
| Requirement: state/event changes must be transactional                                                                    | Legacy CreateBooking confirms hold before booking repository transaction; audit/outbox follow separately. OpenBuk uses one transaction; both writers now use resource locks | Preserve transactional-outbox rule as requirement and record observed exception        | Review atomicity, failed create/retry behavior and concurrent reservations                       |
| Target: preserve appropriate workspace scoping; current paths differ                                                      | Legacy Booking entity stores workspaceId but find/list filters use tenantId; OpenBuk adapter scopes appointments to workspace and its tests include workspace isolation     | Record actual scope; do not silently redefine tenancy                                  | Decide expected per-workspace access policy and verify multi-workspace cases                     |
| Interpretation to avoid: every catalog app has matching records                                                           | Workflow Task, CRM Activity, portfolio projects, resource availability, class attendance have different semantics                                                           | Record target boundaries versus adjacent owners                                        | Define only validated missing slices; reuse contracts                                            |
| Target: optional finance, not verified for all defaults/dependencies                                                      | Booking/expenses/purchasing manifests have empty dependencies; workspace defaults and financial auto-posting also exist                                                     | Document optional-finance target separately                                            | Audit transitive defaults, menu, onboarding and posting dependencies without changing flags here |
| Interpretation to avoid: adjacent records prove complete reporting/Payments/Cash Flow                                     | E7 expense-count report, E8 config/payment records and cash entries                                                                                                         | Keep statuses partial and assess gaps                                                  | Validate source reliability and actual provider journeys                                         |
| Interpretation to avoid: historical summaries prove current completion                                                    | Dated implementation/status docs and test files are not fresh results                                                                                                       | Add historical framing; retain domain details                                          | Run appropriate scoped tests when engineering work is authorized                                 |
| Unresolved commercial-term placeholders                                                                                   | AGPL package/license; EE/licensing contacts and terms contain placeholders                                                                                                  | Link actual boundaries, make no new commercial claims                                  | Separate owner/legal review if commercial terms are needed                                       |

## Evidence-backed next engineering priorities

1. Audit legacy Booking per-operation authorization, tenant/workspace policy, atomic hold/
   booking/outbox handling and concurrency; exercise negative/retry scenarios.
2. Resolve replace-versus-complement adoption with a pilot candidate; verify public
   booking essentials and migration or one integration before promising coordination.
3. Scope employee identity/working-pattern/absence ownership and its privacy boundary;
   specify neutral availability and domain revalidation interfaces.
4. Validate thin employee Tasks and one Requests journey; keep workflow execution
   records distinct and reuse forms/approval infrastructure.
5. Evaluate AI approval/retrieval/execution boundaries and optional-finance defaults
   for that slice, then test real workflows. No engineering issues were fixed here.

## Documentation checks for this change

On 2026-11-07, these targeted checks passed:

- Installed `pnpm exec prettier --check` on all 35 changed Markdown/MDX files.
- Local path/anchor check: 406 Markdown/source references, no failures.
- Public documentation navigation: all 25 configured pages exist; four local MDX
  card links resolve.
- All 32 exact app IDs/names in catalog and mapping, linked row anchors and eight
  required profile fields per app.
- All 26 documented root command names checked against package scripts/CLI builtins;
  commands were verified, not started. AGENTS is 206 lines.
- Documentation-only file scope, stable inspected HEAD and `git diff --check`.

No application tests, migrations, deployments, license changes or tooling installs
were performed.

Root `docs:check` invokes `npx mintlify broken-links`; no local Mintlify binary was
available, so that checker was not run rather than downloading tooling. A targeted
local path/anchor/navigation check was used. External URL availability and full
Mintlify rendering are not established by that check. Historical OpenBuk test
passes and architecture-check failure remain historical, not freshly reproduced.
