# P1/P2 capability and reuse inventory

Deliverable for [STR-01 / #298](https://github.com/Corely-AI/corely/issues/298).
Reviewed 7 November 2026 on `development` at `fb7677cbc31715b6bebefe5c6c1f2d838d6be198`;
delivery branch: `298-map-capabilities-and-reuse`.

This maps all **13 apps and 68 feature keys** to current owners/candidates, source evidence and
remaining decisions. The [structured inventory](capability-reuse-inventory.json) is the equivalent
machine-readable view. Reuse the [32-app alignment](../repository-alignment.md) and
[import mapping](corely-p1-p2-issue-map.json); this is a deeper feature inventory, not a replacement
strategy or authorization to implement the catalog.

## Read the evidence correctly

- **Code present:** concrete existing code for a substantial subset, not full product completion.
- **Partial:** adjacent/shared or incomplete code; the proposed outcome is not established.
- **Documented only:** a target is documented, without dedicated implementation found in reviewed inventories.
- **Not found in reviewed scope:** no dedicated owner/model/route found in the named tracked inventories; not global absence.
- **Unknown:** evidence is insufficient. Operational/deployment readiness is unknown for every row.

Source paths below cover contracts, use cases/adapters, UI, persistence and tests or identify the
adjacent candidates when a target journey was not found. Test assertions were inspected, not run.
Directories are navigation/inventory evidence, not proof of behavior; selected use cases and
assertions support the observations. Each feature retains its original linked acceptance and
verification requirements. A residual gap describes work to assess/finish, not a claim that all
its acceptance items are absent. No runtime, migration, live provider or customer checks ran here.

The repository API returned **161 issues (85 open) and 203 PR records**, with REST pagination
exhausted. Open and closed issues were included; PRs were excluded from issue totals. No issue
comments were returned since 7 November 2026 UTC. Relevant earlier issue bodies and selected
implementation PR metadata were reviewed; not every historical discussion/review was audited.
The structured inventory retains layer-by-layer coverage (including explicitly unestablished layers),
a minimized 77-issue pre-initiative inventory and selected PR
records, without raw comments or credentials. New planning issues are not implementation evidence.

## App ownership and evidence

| Catalog app             | Scope | Existing owner / candidate                                          | Evidence status                            |
| ----------------------- | ----- | ------------------------------------------------------------------- | ------------------------------------------ |
| 02. Corely People       | P1    | Employee owner undecided; Identity / Party / Booking adjacent       | [partial](#ep-people)                      |
| 04. Corely Requests     | P1    | Forms / Approvals / Workflow candidates                             | [partial](#ep-requests)                    |
| 01. Corely Tasks        | P1    | Employee task owner undecided; Workflow / CRM adjacent              | [partial](#ep-tasks)                       |
| 03. Corely Appointments | P1    | Booking, including OpenBuk                                          | [code-present](#ep-appointments)           |
| 05. Corely Knowledge    | P1    | Private policy owner undecided; Documents / CMS candidates          | [partial](#ep-knowledge)                   |
| 11. Corely Shifts       | P2    | Roster owner undecided; Booking availability adjacent               | [documented-only](#ep-shifts)              |
| 12. Corely Time         | P2    | Provider/native authority undecided; integration-first              | [partial](#ep-time)                        |
| 16. Corely Expenses     | P2    | Expenses, with Documents / Approvals                                | [code-present](#ep-expenses)               |
| 18. Corely Assets       | P2    | Custody owner undecided; Inventory / Booking adjacent               | [documented-only](#ep-assets)              |
| 21. Corely Helpdesk     | P2    | Assess existing Issues before new ownership                         | [partial](#ep-helpdesk)                    |
| 26. Corely Invoices     | P2    | Invoices, not SaaS Billing                                          | [code-present](#ep-invoices)               |
| 27. Corely Bills        | P2    | Purchasing / VendorBill                                             | [code-present](#ep-bills)                  |
| 28. Corely Budgets      | P2    | Plan/projection owner undecided; Reporting / source owners adjacent | [not-found-in-reviewed-scope](#ep-budgets) |

## EP-STRATEGY

**Owner / candidate:** Product/docs. **Status:** partial; operational readiness unknown.

Canonical strategy, launch hypothesis, 32-app catalog and repository alignment already exist. STR-02 is covered by the documentation alignment commit; remaining work is per-feature reconciliation, adoption decisions and real pilot evidence. No customer validation is established.

Source/layer evidence (existing paths; tests are source evidence, not fresh results):

- [AGENTS.md](../../../../AGENTS.md)
- [README.md](../../../../README.md)
- [docs/products/corely/README.md](../../../../docs/products/corely/README.md)
- [docs/products/corely/app-catalog.md](../../../../docs/products/corely/app-catalog.md)
- [docs/products/corely/launch-plan.md](../../../../docs/products/corely/launch-plan.md)
- [docs/products/corely/repository-alignment.md](../../../../docs/products/corely/repository-alignment.md)

| Feature / acceptance                                                                                                                                           | Residual gap or decision                                                                                                | Verification to supply                                                                                                           |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| [STR-01](https://github.com/Corely-AI/corely/issues/298) — Map P1/P2 capabilities to code and existing issues                                                  | Review/integrate this 13-app and 68-feature inventory; later engineering tickets retain their own runtime verification. | Review the capability/evidence matrix and sample relevant source paths; report inspection limits and tests not run.              |
| [STR-02](https://github.com/Corely-AI/corely/commit/26d611e510c785ccad78341f6564ecdcf05de770) — Align AGENTS and canonical documentation with the app strategy | No duplicate implementation: retain the completed canonical alignment commit and maintain current guidance.             | Scoped documentation/link/format checks and diff review. Reuse the earlier documentation-alignment prompt as a specification.    |
| [STR-03](https://github.com/Corely-AI/corely/issues/299) — Choose the pilot booking authority and staff surface                                                | Choose one pilot booking authority and staff surface with actual adoption feasibility evidence.                         | Review a synthetic adoption walkthrough and capture actual provider/migration constraints, not assumed integration support.      |
| [STR-04](https://github.com/Corely-AI/corely/issues/300) — Define pilot evidence and P2 promotion criteria                                                     | Agree pilot observations, baseline measures and individual P2 promotion criteria without inventing customer results.    | Review the research protocol and measurement dictionary; real interview/payment evidence is required later, not fabricated here. |

## EP-PLATFORM

**Owner / candidate:** Platform / Identity / Workspaces. **Status:** partial; operational readiness unknown.

App enablement/dependency resolution, tenant entitlements, menu composition, workspace authorization and shared frontend infrastructure exist. Complete only the operational package composition, role/private-data checks, shell and resumable staff setup gaps; current generic controls do not establish package readiness.

Source/layer evidence (existing paths; tests are source evidence, not fresh results):

- [services/api/src/modules/platform/application/use-cases/enable-app.usecase.ts](../../../../services/api/src/modules/platform/application/use-cases/enable-app.usecase.ts)
- [services/api/src/modules/platform/application/services/tenant-entitlement.service.ts](../../../../services/api/src/modules/platform/application/services/tenant-entitlement.service.ts)
- [services/api/src/modules/platform/application/services/menu-builder.service.ts](../../../../services/api/src/modules/platform/application/services/menu-builder.service.ts)
- [services/api/src/modules/workspaces/application/use-cases/authorize-workspace.usecase.ts](../../../../services/api/src/modules/workspaces/application/use-cases/authorize-workspace.usecase.ts)
- [packages/contracts/src/platform/app-manifest.schema.ts](../../../../packages/contracts/src/platform/app-manifest.schema.ts)
- [packages/data/prisma/schema/20_workspaces.prisma](../../../../packages/data/prisma/schema/20_workspaces.prisma)
- [packages/web-shared/src/shared/workspaces/workspace-config-provider.tsx](../../../../packages/web-shared/src/shared/workspaces/workspace-config-provider.tsx)
- [services/api/src/modules/platform/**tests**/menu-builder.service.spec.ts](../../../../services/api/src/modules/platform/__tests__/menu-builder.service.spec.ts)
- [services/api/src/modules/platform/infrastructure/registries/app-registry.ts](../../../../services/api/src/modules/platform/infrastructure/registries/app-registry.ts)
- [packages/contracts/src/platform/index.ts](../../../../packages/contracts/src/platform/index.ts)
- [services/api/src/modules/platform/infrastructure/adapters/prisma-seeded-record-meta-repository.adapter.ts](../../../../services/api/src/modules/platform/infrastructure/adapters/prisma-seeded-record-meta-repository.adapter.ts)
- [apps/web/src/modules/platform/index.ts](../../../../apps/web/src/modules/platform/index.ts)

Related issue state at collection: [#112](https://github.com/Corely-AI/corely/issues/112) closed/completed; [#111](https://github.com/Corely-AI/corely/issues/111) closed/completed; [#170](https://github.com/Corely-AI/corely/issues/170) closed/completed.

| Feature / acceptance                                                                                            | Residual gap or decision                                                                                                | Verification to supply                                                                                         |
| --------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| [PLAT-01](https://github.com/Corely-AI/corely/issues/301) — Compose the package using existing app manifests    | Compose only the selected package and verify transitive defaults/optional finance instead of adding app registries.     | Configuration integration tests for enabled/disabled dependencies and regression of existing product packages. |
| [PLAT-02](https://github.com/Corely-AI/corely/issues/302) — Enforce operational roles and private-data access   | Verify operation-level roles, trusted tenant/workspace boundaries and private personnel access with negative cases.     | Negative API/tool/file/export tests with different roles and tenants; verify private-field redaction.          |
| [PLAT-03](https://github.com/Corely-AI/corely/issues/303) — Build the responsive manual-first operational shell | Deliver the selected responsive operational shell and manual-first navigation, not a second generic frontend framework. | Responsive navigation tests, keyboard smoke checks and an AI-disabled manual workflow.                         |
| [PLAT-04](https://github.com/Corely-AI/corely/issues/304) — Support resumable pilot setup and staff invitations | Complete resumable staff setup/invitations across actual membership/onboarding APIs and partial failures.               | E2E resumed setup, repeated invitation, timezone validation and unauthorized-publication tests.                |

## EP-PEOPLE

**Owner / candidate:** Employee owner undecided; Identity / Party / Booking adjacent. **Status:** partial; operational readiness unknown.

Identity User/Membership, Party records and BookingResource exist and represent different concepts. No dedicated people owner was found in reviewed API module names; this is not evidence of absence across every integration. Define only the staff/availability/private absence/self-service delta and explicit links, without cloning accounts or booking resources.

Source/layer evidence (existing paths; tests are source evidence, not fresh results):

- [packages/data/prisma/schema/10_identity.prisma](../../../../packages/data/prisma/schema/10_identity.prisma)
- [packages/data/prisma/schema/20_workspaces.prisma](../../../../packages/data/prisma/schema/20_workspaces.prisma)
- [packages/data/prisma/schema/45_party_crm.prisma](../../../../packages/data/prisma/schema/45_party_crm.prisma)
- [packages/data/prisma/schema/83_booking.prisma](../../../../packages/data/prisma/schema/83_booking.prisma)
- [services/api/src/modules/workspaces/application/use-cases/authorize-workspace.usecase.ts](../../../../services/api/src/modules/workspaces/application/use-cases/authorize-workspace.usecase.ts)
- [services/api/src/modules/booking/**tests**/openbuk.int.test.ts](../../../../services/api/src/modules/booking/__tests__/openbuk.int.test.ts)
- [packages/contracts/src/workspaces/workspace-members.schema.ts](../../../../packages/contracts/src/workspaces/workspace-members.schema.ts)
- [packages/contracts/src/booking/index.ts](../../../../packages/contracts/src/booking/index.ts)
- [apps/openbuk-web/src/modules/studio/setup-form.tsx](../../../../apps/openbuk-web/src/modules/studio/setup-form.tsx)
- [services/api/src/modules/workspaces/application/use-cases/authorize-workspace.spec.ts](../../../../services/api/src/modules/workspaces/application/use-cases/authorize-workspace.spec.ts)
- [packages/contracts/src/identity/index.ts](../../../../packages/contracts/src/identity/index.ts)
- [services/api/src/modules/identity/infrastructure/adapters/prisma-audit-repository.adapter.ts](../../../../services/api/src/modules/identity/infrastructure/adapters/prisma-audit-repository.adapter.ts)

Related issue state at collection: [#215](https://github.com/Corely-AI/corely/issues/215) closed/completed; [#111](https://github.com/Corely-AI/corely/issues/111) closed/completed.

| Feature / acceptance                                                                                                           | Residual gap or decision                                                                                            | Verification to supply                                                                                         |
| ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| [PEOPLE-01](https://github.com/Corely-AI/corely/issues/305) — Maintain the staff directory and explicit identity links         | Decide minimal employee ownership and explicit account/party/bookable-resource links without equating identities.   | Profile and link validation, tenant/privacy tests, directory UI and archive-history integration.               |
| [PEOPLE-02](https://github.com/Corely-AI/corely/issues/306) — Manage working patterns and dated availability exceptions        | Define dated working patterns/exceptions and a neutral availability interface on top of existing booking rules.     | Frozen-time/DST domain tests, effective-date cases and integration against authoritative Booking availability. |
| [PEOPLE-03](https://github.com/Corely-AI/corely/issues/307) — Record private absences and neutral availability effects         | Add the private absence lifecycle and authorized neutral effects; Booking rules do not establish personnel records. | Privacy, overlap, correction, transactional rollback and replay tests.                                         |
| [PEOPLE-04](https://github.com/Corely-AI/corely/issues/308) — Deliver staff self-service and controlled onboarding/offboarding | Provide controlled staff self-service/onboarding/offboarding with membership revocation and task handoffs.          | Role-escalation negatives, onboarding checklist reuse and departure with future commitments E2E.               |

## EP-REQUESTS

**Owner / candidate:** Forms / Approvals / Workflow candidates. **Status:** partial; operational readiness unknown.

Forms definitions/submissions and ApprovalGateService/WorkflowService are existing reuse points. CreateForm currently derives its tenant value from workspaceId with tenantId fallback: resolve the actual identity boundary before reuse. Approval is not proof that an owning domain applied a decision. Issue #52 was closed not_planned; it is not completion evidence. Deliver only a selected private request journey and safe domain handoff.

Source/layer evidence (existing paths; tests are source evidence, not fresh results):

- [services/api/src/modules/forms/application/use-cases/create-form.usecase.ts](../../../../services/api/src/modules/forms/application/use-cases/create-form.usecase.ts)
- [services/api/src/modules/approvals/application/approval-gate.service.ts](../../../../services/api/src/modules/approvals/application/approval-gate.service.ts)
- [services/api/src/modules/workflow/application/workflow.service.ts](../../../../services/api/src/modules/workflow/application/workflow.service.ts)
- [packages/contracts/src/approvals/approval.schemas.ts](../../../../packages/contracts/src/approvals/approval.schemas.ts)
- [packages/data/prisma/schema/66_forms.prisma](../../../../packages/data/prisma/schema/66_forms.prisma)
- [services/api/src/modules/forms/**tests**/forms-api.int.test.ts](../../../../services/api/src/modules/forms/__tests__/forms-api.int.test.ts)
- [services/api/src/modules/approvals/**tests**/approval-spec.builder.test.ts](../../../../services/api/src/modules/approvals/__tests__/approval-spec.builder.test.ts)
- [services/api/src/modules/approvals/adapters/http/approvals-requests.controller.ts](../../../../services/api/src/modules/approvals/adapters/http/approvals-requests.controller.ts)
- [apps/web/src/modules/forms/screens/FormDetailPage.tsx](../../../../apps/web/src/modules/forms/screens/FormDetailPage.tsx)
- [packages/contracts/src/forms/index.ts](../../../../packages/contracts/src/forms/index.ts)
- [services/api/src/modules/forms/infrastructure/adapters/prisma-form-repository.adapter.ts](../../../../services/api/src/modules/forms/infrastructure/adapters/prisma-form-repository.adapter.ts)
- [apps/web/src/modules/forms/index.ts](../../../../apps/web/src/modules/forms/index.ts)

Related issue state at collection: [#52](https://github.com/Corely-AI/corely/issues/52) closed/not_planned.

| Feature / acceptance                                                                                                          | Residual gap or decision                                                                                                 | Verification to supply                                                                    |
| ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| [REQ-01](https://github.com/Corely-AI/corely/issues/309) — Submit typed requests with supporting context                      | Compose one typed private request flow using Forms; resolve workspace/tenant meaning before reusing its storage context. | Form/contract and submit/retry/withdraw tests plus private-file denial cases.             |
| [REQ-02](https://github.com/Corely-AI/corely/issues/310) — Apply review decisions through safe domain handoffs                | Bind current reviewer decisions to owning-domain application, versions and retries; approval alone is not application.   | Decision-race, stale-version, unauthorized/self-approval and failed-handoff replay tests. |
| [REQ-03](https://github.com/Corely-AI/corely/issues/311) — Provide request tracking, the decision inbox and bounded reminders | Compose request tracking/decision inbox and bounded reminders with safe private context and delivery status.             | Inbox permission tests, reminder replay/cancellation and requester-to-reviewer E2E.       |

## EP-TASKS

**Owner / candidate:** Employee task owner undecided; Workflow / CRM adjacent. **Status:** partial; operational readiness unknown.

Workflow execution tasks and CRM activities already exist; neither establishes employee daily work. No dedicated tasks owner was found in reviewed API module names. Define the employee-facing task/checklist slice and reuse workflow background execution, documents and notifications without repurposing their records blindly.

Source/layer evidence (existing paths; tests are source evidence, not fresh results):

- [services/api/src/modules/workflow/application/workflow.service.ts](../../../../services/api/src/modules/workflow/application/workflow.service.ts)
- [services/api/src/modules/background/runtime/modules/workflows/task-runner.processor.ts](../../../../services/api/src/modules/background/runtime/modules/workflows/task-runner.processor.ts)
- [packages/core/src](../../../../packages/core/src)
- [services/api/src/modules/notifications/application/use-cases/list-notifications.usecase.ts](../../../../services/api/src/modules/notifications/application/use-cases/list-notifications.usecase.ts)
- [services/api/src/modules/workflow/infrastructure/**tests**/workflow-queue.client.test.ts](../../../../services/api/src/modules/workflow/infrastructure/__tests__/workflow-queue.client.test.ts)
- [packages/contracts/src/workflows/index.ts](../../../../packages/contracts/src/workflows/index.ts)
- [packages/data/prisma/schema/90_workflow.prisma](../../../../packages/data/prisma/schema/90_workflow.prisma)

| Feature / acceptance                                                                                           | Residual gap or decision                                                                                           | Verification to supply                                                             |
| -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| [TASK-01](https://github.com/Corely-AI/corely/issues/312) — Create, assign and complete employee-facing tasks  | Define employee-owned assignment/completion records; workflow execution Task and CRM Activity are not substitutes. | Lifecycle, concurrency/idempotency and create-to-complete UI tests.                |
| [TASK-02](https://github.com/Corely-AI/corely/issues/313) — Provide My work and simple team list/board views   | Build My work and a small team list/board using the employee task owner and selected shell.                        | Date/filter/query tests, board/list consistency, mobile and keyboard checks.       |
| [TASK-03](https://github.com/Corely-AI/corely/issues/314) — Generate recurring opening and closing checklists  | Generate dated recurring checklists with stable occurrence identity and retry/concurrency protection.              | Frozen-clock recurrence/DST tests, parallel replay and template-to-completion E2E. |
| [TASK-04](https://github.com/Corely-AI/corely/issues/315) — Attach context and link operational follow-up work | Link documents/procedures/source work through public owners without copying records or leaking private previews.   | File/link authorization tests, missing-source UI and follow-up replay tests.       |

## EP-APPOINTMENTS

**Owner / candidate:** Booking, including OpenBuk. **Status:** code-present; operational readiness unknown.

Booking owns reservations, resources and availability; OpenBuk already provides the EN/DE/VI public single-service/staff slice and workspace-scoped booking transaction. Legacy CreateBooking updates the hold before booking persistence and follows with audit/outbox; the manifest declares no operation permissions. Reuse existing Booking records and preserve public routes. Remaining acceptance covers team services/staff, availability/lifecycle, management tokens, delivery consumers, selected integration and distributed abuse protection; historical passes are not fresh results.

Source/layer evidence (existing paths; tests are source evidence, not fresh results):

- [services/api/src/modules/booking/application/use-cases/create-booking.usecase.ts](../../../../services/api/src/modules/booking/application/use-cases/create-booking.usecase.ts)
- [services/api/src/modules/booking/application/use-cases/openbuk-studio.usecase.ts](../../../../services/api/src/modules/booking/application/use-cases/openbuk-studio.usecase.ts)
- [services/api/src/modules/booking/infrastructure/adapters/prisma-openbuk-repository.adapter.ts](../../../../services/api/src/modules/booking/infrastructure/adapters/prisma-openbuk-repository.adapter.ts)
- [services/api/src/modules/booking/booking.manifest.ts](../../../../services/api/src/modules/booking/booking.manifest.ts)
- [services/api/src/modules/booking/http/openbuk.controller.ts](../../../../services/api/src/modules/booking/http/openbuk.controller.ts)
- [services/api/src/modules/booking/http/openbuk-rate-limit.guard.ts](../../../../services/api/src/modules/booking/http/openbuk-rate-limit.guard.ts)
- [packages/contracts/src/booking](../../../../packages/contracts/src/booking)
- [packages/data/prisma/schema/83_booking.prisma](../../../../packages/data/prisma/schema/83_booking.prisma)
- [apps/openbuk-web/src/app/app.tsx](../../../../apps/openbuk-web/src/app/app.tsx)
- [apps/web/src/modules/booking/screens/BookingEditorPage.tsx](../../../../apps/web/src/modules/booking/screens/BookingEditorPage.tsx)
- [services/api/src/modules/booking/**tests**/openbuk.int.test.ts](../../../../services/api/src/modules/booking/__tests__/openbuk.int.test.ts)
- [services/api/src/modules/booking/**tests**/openbuk-availability.spec.ts](../../../../services/api/src/modules/booking/__tests__/openbuk-availability.spec.ts)
- [docs/products/openbuk/README.md](../../../../docs/products/openbuk/README.md)
- [apps/web/src/app/router/booking-routes.tsx](../../../../apps/web/src/app/router/booking-routes.tsx)
- [apps/e2e/tests/openbuk/openbuk.e2e.spec.ts](../../../../apps/e2e/tests/openbuk/openbuk.e2e.spec.ts)
- [services/api/src/modules/booking/infrastructure/adapters/prisma-booking-repo.adapter.ts](../../../../services/api/src/modules/booking/infrastructure/adapters/prisma-booking-repo.adapter.ts)
- [packages/contracts/src/booking/index.ts](../../../../packages/contracts/src/booking/index.ts)
- [services/api/src/modules/booking/infrastructure/adapters/prisma-availability-rule-repo.adapter.ts](../../../../services/api/src/modules/booking/infrastructure/adapters/prisma-availability-rule-repo.adapter.ts)
- [apps/web/src/modules/booking/queries.ts](../../../../apps/web/src/modules/booking/queries.ts)

Related issue state at collection: [#215](https://github.com/Corely-AI/corely/issues/215) closed/completed.

| Feature / acceptance                                                                                                  | Residual gap or decision                                                                                             | Verification to supply                                                                                       |
| --------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| [APT-01](https://github.com/Corely-AI/corely/issues/316) — Extend services and eligible staff for a small team        | Extend existing services/resources for eligible team members and resolve employee-to-resource links.                 | Service/resource validation, historical-data regression and multi-service/staff setup E2E.                   |
| [APT-02](https://github.com/Corely-AI/corely/issues/317) — Unify availability inputs and harden booking concurrency   | Unify neutral availability inputs and verify all writers, holds, locks, outbox atomicity and workspace policy.       | Disposable-Postgres race tests across OpenBuk and existing writers; DST/buffer/hold/rollback regressions.    |
| [APT-03](https://github.com/Corely-AI/corely/issues/318) — Deliver the day/week agenda and reviewed booking lifecycle | Complete day/week agenda and reviewed lifecycle over existing booking commands; preserve public compatibility.       | Lifecycle E2E, stale-conflict handling, mobile/keyboard alternatives and customer-scope negatives.           |
| [APT-04](https://github.com/Corely-AI/corely/issues/319) — Secure the existing guest booking and management journey   | Complete scoped revocable guest-management tokens and lifecycle; existing anonymous booking is already code-present. | Token scope/replay/revocation and legacy bypass tests; guest booking-to-management E2E.                      |
| [APT-05](https://github.com/Corely-AI/corely/issues/320) — Deliver observable confirmations and reminders             | Connect actual Booking confirmation/reminder consumers and observe delivery/retry outcomes, not just outbox enqueue. | Redelivery/provider-failure/cancellation tests, locale snapshots and isolated message delivery E2E.          |
| [APT-06](https://github.com/Corely-AI/corely/issues/321) — Implement the selected import or calendar-connection path  | Implement only the adoption path chosen by STR-03, with real provider/import access, authority and reconciliation.   | Selected-path retry/replay, missing-access, timezone and failed-cutover/sync tests; do not build both paths. |
| [APT-07](https://github.com/Corely-AI/corely/issues/322) — Close public-booking abuse and isolation release gaps      | Close distributed public abuse/isolation release gaps beyond the current bounded per-process guard.                  | Shared-limit/multi-instance tests, public isolation and security review evidence.                            |

## EP-KNOWLEDGE

**Owner / candidate:** Private policy owner undecided; Documents / CMS candidates. **Status:** partial; operational readiness unknown.

Existing #130 is an open Articles/FAQ/Glossary epic with public pages and P0 body metadata. Preserve its scope/priority; this initiative is the distinct private approved-procedure slice. Documents/CMS are reuse candidates, not proof of private policy lifecycle or authorized cited answers. No knowledge owner was found in reviewed API module names; inspect access and versioning before implementation.

Source/layer evidence (existing paths; tests are source evidence, not fresh results):

- [services/api/src/modules/documents/application/use-cases/get-document/get-document.usecase.ts](../../../../services/api/src/modules/documents/application/use-cases/get-document/get-document.usecase.ts)
- [services/api/src/modules/cms/application/use-cases/get-public-cms-post.usecase.ts](../../../../services/api/src/modules/cms/application/use-cases/get-public-cms-post.usecase.ts)
- [services/api/src/modules/cms/**tests**/public-cms-posts.usecase.test.ts](../../../../services/api/src/modules/cms/__tests__/public-cms-posts.usecase.test.ts)
- [services/api/src/modules/documents/application/use-cases/get-download-url/get-download-url.usecase.test.ts](../../../../services/api/src/modules/documents/application/use-cases/get-download-url/get-download-url.usecase.test.ts)
- [packages/contracts/src/documents/index.ts](../../../../packages/contracts/src/documents/index.ts)
- [packages/contracts/src/cms/index.ts](../../../../packages/contracts/src/cms/index.ts)
- [packages/data/prisma/schema/70_documents.prisma](../../../../packages/data/prisma/schema/70_documents.prisma)
- [packages/data/prisma/schema/74_cms.prisma](../../../../packages/data/prisma/schema/74_cms.prisma)
- [services/api/src/modules/cms/infrastructure/prisma/prisma-cms-comment-repository.adapter.ts](../../../../services/api/src/modules/cms/infrastructure/prisma/prisma-cms-comment-repository.adapter.ts)
- [apps/web/src/modules/cms/index.ts](../../../../apps/web/src/modules/cms/index.ts)

Related issue state at collection: [#130](https://github.com/Corely-AI/corely/issues/130) open/no closure reason; [#131](https://github.com/Corely-AI/corely/issues/131) closed/not_planned.

| Feature / acceptance                                                                                                 | Residual gap or decision                                                                                       | Verification to supply                                                                            |
| -------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| [KNOW-01](https://github.com/Corely-AI/corely/issues/323) — Publish a minimal private policy/procedure collection    | Add a minimal private approved/versioned procedure collection; preserve the distinct public P0 scope of #130.  | Publication, version, private/public access tests and author-to-reader UI flow.                   |
| [KNOW-02](https://github.com/Corely-AI/corely/issues/324) — Find procedures and link them from operational work      | Add permission-filtered procedure lookup and operational links with freshness/version visibility.              | Search ACL/cache invalidation and task-to-procedure E2E.                                          |
| [KNOW-03](https://github.com/Corely-AI/corely/issues/325) — Answer policy questions with accessible source citations | Answer from accessible approved versions with citations and uncertainty, including revocation/injection cases. | Grounding/abstention evaluation, prompt-injection and tenant-leakage tests, provider-disabled UI. |

## EP-CONNECTED

**Owner / candidate:** Owning domains + existing AI Copilot / Background. **Status:** partial; operational readiness unknown.

Existing copilot has a tool registry, context helpers and streaming replay/approval machinery; API-hosted background handlers and notifications are present. Tool context has a workspace-to-tenant fallback and must be reviewed per owner. The absence-to-conflict/Today/briefing/resolution flows are not established; implement only typed authorized proposals with deterministic revalidation and sensitive-action confirmation.

Source/layer evidence (existing paths; tests are source evidence, not fresh results):

- [services/api/src/modules/ai-copilot/application/use-cases/stream-copilot-chat.usecase.ts](../../../../services/api/src/modules/ai-copilot/application/use-cases/stream-copilot-chat.usecase.ts)
- [services/api/src/modules/ai-copilot/infrastructure/tools/tool-registry.ts](../../../../services/api/src/modules/ai-copilot/infrastructure/tools/tool-registry.ts)
- [services/api/src/modules/ai-copilot/infrastructure/tools/tool-utils.ts](../../../../services/api/src/modules/ai-copilot/infrastructure/tools/tool-utils.ts)
- [services/api/src/modules/ai-copilot/**tests**/tools.factory.spec.ts](../../../../services/api/src/modules/ai-copilot/__tests__/tools.factory.spec.ts)
- [services/api/src/modules/notifications/application/use-cases/list-notifications.usecase.ts](../../../../services/api/src/modules/notifications/application/use-cases/list-notifications.usecase.ts)
- [services/api/src/modules/background/runtime/modules/workflows/task-runner.processor.ts](../../../../services/api/src/modules/background/runtime/modules/workflows/task-runner.processor.ts)
- [docs/ai/ai-copilot.md](../../../../docs/ai/ai-copilot.md)
- [services/api/src/modules/ai-copilot/infrastructure/adapters/prisma-agent-run-repository.adapter.ts](../../../../services/api/src/modules/ai-copilot/infrastructure/adapters/prisma-agent-run-repository.adapter.ts)

Related issue state at collection: [#185](https://github.com/Corely-AI/corely/issues/185) closed/completed; [#196](https://github.com/Corely-AI/corely/issues/196) closed/completed.

| Feature / acceptance                                                                                                        | Residual gap or decision                                                                                                           | Verification to supply                                                                              |
| --------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| [OPS-01](https://github.com/Corely-AI/corely/issues/326) — Expose authorized operational tools through the existing copilot | Expose only selected owner use cases through existing tools with retrieval/execution authorization and precise workspace identity. | Contract/access/stale-version tests, adversarial tool input, redacted audit and AI-disabled checks. |
| [OPS-02](https://github.com/Corely-AI/corely/issues/327) — Propagate approved absence into scheduling conflict review       | Propagate approved neutral absence into conflict review; no automatic booking cancellation or private reasons.                     | Approval-to-conflict E2E, reorder/replay/correction tests and privacy negatives.                    |
| [OPS-03](https://github.com/Corely-AI/corely/issues/328) — Build the Today view and operational exception inbox             | Compose Today and an operational exception inbox from authoritative owners, with manual actions and freshness.                     | Projection reconciliation/rebuild/source-failure tests and staff/manager daily-work E2E.            |
| [OPS-04](https://github.com/Corely-AI/corely/issues/329) — Generate a source-linked morning operations briefing             | Prepare a source-linked morning briefing from the composed views, with clear unknowns and disabled-AI fallback.                    | Fixed-fixture factual/citation evaluation, role-specific cases and provider/source-failure tests.   |
| [OPS-05](https://github.com/Corely-AI/corely/issues/330) — Preview and apply manager-reviewed resolution plans              | Preview/apply manager-reviewed typed plans with current versions, constraints and per-action failure/retry visibility.             | Read-only preview, stale-plan/concurrent-booking, partial-failure/replay and explicit-send E2E.     |

## EP-RELEASE

**Owner / candidate:** Cross-owner acceptance; API Background / E2E reuse. **Status:** unknown; operational readiness unknown.

OpenBuk isolated PostgreSQL/browser and finance E2E source files exist. These were inspected, not executed. No current full-package acceptance, restore exercise, accessibility acceptance or pilot promotion evidence is established. Historical OpenBuk verification and worker-check notes must not be repeated as fresh results.

Source/layer evidence (existing paths; tests are source evidence, not fresh results):

- [services/api/src/modules/booking/**tests**/openbuk.int.test.ts](../../../../services/api/src/modules/booking/__tests__/openbuk.int.test.ts)
- [apps/e2e/tests/invoices.spec.ts](../../../../apps/e2e/tests/invoices.spec.ts)
- [apps/e2e/tests/expenses.spec.ts](../../../../apps/e2e/tests/expenses.spec.ts)
- [docs/products/openbuk/README.md](../../../../docs/products/openbuk/README.md)
- [docs/products/corely/launch-plan.md](../../../../docs/products/corely/launch-plan.md)
- [docs/products/corely/repository-alignment.md](../../../../docs/products/corely/repository-alignment.md)

| Feature / acceptance                                                                                                        | Residual gap or decision                                                                                                   | Verification to supply                                                                                     |
| --------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| [REL-01](https://github.com/Corely-AI/corely/issues/331) — Verify complete pilot workflows and critical regressions         | Execute complete disposable-environment pilot scenarios and actual regressions; test files are not passing results.        | Run agreed E2E/integration and relevant existing regression suites; report environment blockers honestly.  |
| [REL-02](https://github.com/Corely-AI/corely/issues/332) — Complete mobile, accessibility and locale acceptance             | Record actual phone/desktop/keyboard/locale acceptance, preserving OpenBuk EN/DE/VI.                                       | Automated accessibility checks plus manual keyboard/mobile/locale workflow review.                         |
| [REL-03](https://github.com/Corely-AI/corely/issues/333) — Verify operational telemetry, restore and data-handling runbooks | Demonstrate isolated recovery/restore and support/data-handling runbooks; source instrumentation is insufficient.          | Failure injection, restore/replay drill and redaction inspection with recorded limits.                     |
| [REL-04](https://github.com/Corely-AI/corely/issues/334) — Review pilot evidence and decide which P2 work to promote        | Collect actual pilot evidence and record continue/refine/stop plus individual P2 decisions; a plan cannot close this gate. | Review real pilot evidence against the defined protocol; retain unresolved questions and negative results. |

## EP-SHIFTS

**Owner / candidate:** Roster owner undecided; Booking availability adjacent. **Status:** documented-only; operational readiness unknown.

Booking availability rules and workspace capability configuration are reuse points, not a published employee roster. No dedicated shifts owner was found in reviewed API module names. Define demand, versioned roster, coverage and swaps only after the conditional promotion decision; do not confuse POS register shifts with staff rosters.

Source/layer evidence (existing paths; tests are source evidence, not fresh results):

- [packages/data/prisma/schema/83_booking.prisma](../../../../packages/data/prisma/schema/83_booking.prisma)
- [services/api/src/modules/booking/domain/openbuk-availability.ts](../../../../services/api/src/modules/booking/domain/openbuk-availability.ts)
- [services/api/src/modules/platform/application/services/workspace-template.service.ts](../../../../services/api/src/modules/platform/application/services/workspace-template.service.ts)
- [services/api/src/modules/booking/**tests**/openbuk-availability.spec.ts](../../../../services/api/src/modules/booking/__tests__/openbuk-availability.spec.ts)
- [packages/contracts/src/booking/index.ts](../../../../packages/contracts/src/booking/index.ts)
- [apps/openbuk-web/src/modules/studio/setup-form.tsx](../../../../apps/openbuk-web/src/modules/studio/setup-form.tsx)
- [services/api/src/modules/booking/application/use-cases/upsert-availability-rule.usecase.ts](../../../../services/api/src/modules/booking/application/use-cases/upsert-availability-rule.usecase.ts)
- [services/api/src/modules/booking/infrastructure/adapters/prisma-availability-rule-repo.adapter.ts](../../../../services/api/src/modules/booking/infrastructure/adapters/prisma-availability-rule-repo.adapter.ts)
- [apps/web/src/modules/booking/queries.ts](../../../../apps/web/src/modules/booking/queries.ts)

| Feature / acceptance                                                                                                          | Residual gap or decision                                                                                          | Verification to supply                                                                                         |
| ----------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| [SHIFT-01](https://github.com/Corely-AI/corely/issues/335) — Validate demand and define a versioned roster model              | Validate a real coverage need, then define a versioned roster distinct from Booking and POS register sessions.    | Roster lifecycle/permission/timezone tests and review of the validated problem and jurisdictional review gaps. |
| [SHIFT-02](https://github.com/Corely-AI/corely/issues/336) — Assign shifts and expose deterministic coverage gaps             | Add deterministic assignment/coverage checks against neutral availability, eligibility and dated constraints.     | Coverage/overlap/DST fixture tests, permission negatives and stale-edit cases.                                 |
| [SHIFT-03](https://github.com/Corely-AI/corely/issues/337) — Publish roster versions and expose approved booking availability | Publish roster versions with an explicit Booking availability policy and convergent event handling.               | Publish-to-booking integration, replay/version ordering, conflict and mobile self-service tests.               |
| [SHIFT-04](https://github.com/Corely-AI/corely/issues/338) — Handle open-shift claims and manager-reviewed swaps              | Compose claims/swaps through Requests with current roster/availability validation and competing-claim protection. | Concurrent claims, stale approvals, replay and requester/manager swap E2E.                                     |

## EP-TIME

**Owner / candidate:** Provider/native authority undecided; integration-first. **Status:** partial; operational readiness unknown.

Workspace templates expose time.tracking as a capability key; no dedicated time owner was found in reviewed API module names. This does not prove actual time-recording integrations or absence of external systems. Validate one integration-first use case and correction/export boundaries before choosing new storage; no payroll or surveillance scope.

Source/layer evidence (existing paths; tests are source evidence, not fresh results):

- [services/api/src/modules/platform/application/services/workspace-template.service.ts](../../../../services/api/src/modules/platform/application/services/workspace-template.service.ts)
- [packages/data/prisma/schema/20_workspaces.prisma](../../../../packages/data/prisma/schema/20_workspaces.prisma)
- [services/api/src/modules/integrations](../../../../services/api/src/modules/integrations)
- [services/api/src/modules/approvals/application/approval-gate.service.ts](../../../../services/api/src/modules/approvals/application/approval-gate.service.ts)
- [packages/contracts/src/integrations/index.ts](../../../../packages/contracts/src/integrations/index.ts)
- [packages/data/prisma/schema/64_integrations.prisma](../../../../packages/data/prisma/schema/64_integrations.prisma)
- [services/api/src/modules/integrations/infrastructure/prisma/prisma-integration-connection-repository.adapter.ts](../../../../services/api/src/modules/integrations/infrastructure/prisma/prisma-integration-connection-repository.adapter.ts)

| Feature / acceptance                                                                                                  | Residual gap or decision                                                                                                   | Verification to supply                                                                                  |
| --------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| [TIME-01](https://github.com/Corely-AI/corely/issues/339) — Choose the first time-recording use case and integration  | Choose working-time or project time and verify one integration/provider; a capability key is not recording support.        | Provider proof of access using synthetic data and a written contract/ownership decision.                |
| [TIME-02](https://github.com/Corely-AI/corely/issues/340) — Import or record time and support transparent corrections | Implement selected source/import with visible original/correction history, deterministic duration and revocation handling. | Import replay/correction/version tests, DST/overlap fixtures and staff-access negatives.                |
| [TIME-03](https://github.com/Corely-AI/corely/issues/341) — Review periods and export approved time with traceability | Review/export periods with stable batch/source identities and adjustment history; do not infer payroll correctness.        | Period state and export reconciliation fixtures, correction-after-export and unauthorized export tests. |

## EP-EXPENSES

**Owner / candidate:** Expenses, with Documents / Approvals. **Status:** code-present; operational readiness unknown.

Expense/ExpenseLine, capture, transitions, UI and adapter/E2E tests already exist. TransitionExpense updates the repository and then separately logs audit/enqueues an event; status names alone do not prove employee approval/reimbursement correctness. Reuse this owner and publish only staff-claim, reviewed policy/reimbursement/export and extraction-review gaps after scoped audit.

Source/layer evidence (existing paths; tests are source evidence, not fresh results):

- [packages/data/prisma/schema/65_expenses.prisma](../../../../packages/data/prisma/schema/65_expenses.prisma)
- [packages/contracts/src/expenses](../../../../packages/contracts/src/expenses)
- [services/api/src/modules/expenses/application/use-cases/create-expense.usecase.ts](../../../../services/api/src/modules/expenses/application/use-cases/create-expense.usecase.ts)
- [services/api/src/modules/expenses/application/use-cases/transition-expense.usecase.ts](../../../../services/api/src/modules/expenses/application/use-cases/transition-expense.usecase.ts)
- [services/api/src/modules/expenses/expenses.manifest.ts](../../../../services/api/src/modules/expenses/expenses.manifest.ts)
- [apps/web/src/modules/expenses](../../../../apps/web/src/modules/expenses)
- [services/api/src/modules/expenses/application/use-cases/**tests**/create-expense.usecase.test.ts](../../../../services/api/src/modules/expenses/application/use-cases/__tests__/create-expense.usecase.test.ts)
- [services/api/src/modules/expenses/**tests**/expenses-api.int.test.ts](../../../../services/api/src/modules/expenses/__tests__/expenses-api.int.test.ts)
- [apps/e2e/tests/expenses.spec.ts](../../../../apps/e2e/tests/expenses.spec.ts)
- [packages/web-features/src/modules/expenses/index.ts](../../../../packages/web-features/src/modules/expenses/index.ts)
- [apps/web/src/modules/expenses/index.ts](../../../../apps/web/src/modules/expenses/index.ts)
- [services/api/src/modules/expenses/infrastructure/adapters/prisma-expense-repository.adapter.ts](../../../../services/api/src/modules/expenses/infrastructure/adapters/prisma-expense-repository.adapter.ts)
- [packages/contracts/src/expenses/index.ts](../../../../packages/contracts/src/expenses/index.ts)

| Feature / acceptance                                                                                                      | Residual gap or decision                                                                                                   | Verification to supply                                                                                                 |
| ------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| [EXP-01](https://github.com/Corely-AI/corely/issues/342) — Audit and complete employee claim capture                      | Audit existing capture and add only employee-claim ownership, evidence and submitted-history gaps.                         | Existing-expense regression, currency/validation and private-receipt access tests.                                     |
| [EXP-02](https://github.com/Corely-AI/corely/issues/343) — Route claims for review and resolve policy exceptions          | Connect reviewed claim routing/version/self-approval policy to existing approvals, separate from reimbursement/posting.    | Routing threshold, stale/concurrent decisions, resubmission and authorization tests.                                   |
| [EXP-03](https://github.com/Corely-AI/corely/issues/344) — Track reimbursement evidence and export claims for bookkeeping | Record confirmed reimbursement evidence and reconciled accountant exports without releasing funds or requiring Accounting. | Export reconciliation, duplicate/partial reimbursement and accountant-handoff fixture review.                          |
| [EXP-04](https://github.com/Corely-AI/corely/issues/345) — Prepare receipt extraction and duplicate-review suggestions    | Add source-preserving receipt suggestions and duplicate review with explicit confirmation and manual fallback.             | Representative/ambiguous receipt fixtures, false-positive duplicate cases, prompt-injection and manual-fallback tests. |

## EP-ASSETS

**Owner / candidate:** Custody owner undecided; Inventory / Booking adjacent. **Status:** documented-only; operational readiness unknown.

Inventory owns products, stock moves, reservations and locations; Booking has equipment resources. These are not established equipment custody/handovers. No dedicated assets owner was found in reviewed API module names. Determine the minimal custody delta and public owner interfaces before adding any records; reuse documents and Tasks for follow-up.

Source/layer evidence (existing paths; tests are source evidence, not fresh results):

- [packages/data/prisma/schema/71_inventory.prisma](../../../../packages/data/prisma/schema/71_inventory.prisma)
- [packages/data/prisma/schema/83_booking.prisma](../../../../packages/data/prisma/schema/83_booking.prisma)
- [services/api/src/modules/inventory/application/use-cases/create-product.usecase.ts](../../../../services/api/src/modules/inventory/application/use-cases/create-product.usecase.ts)
- [services/api/src/modules/documents/application/use-cases/link-document/link-document.usecase.ts](../../../../services/api/src/modules/documents/application/use-cases/link-document/link-document.usecase.ts)
- [packages/contracts/src/inventory/index.ts](../../../../packages/contracts/src/inventory/index.ts)
- [apps/web/src/modules/inventory/screens/ProductDetailPage.tsx](../../../../apps/web/src/modules/inventory/screens/ProductDetailPage.tsx)
- [services/api/src/modules/inventory/infrastructure/adapters/prisma-document-repository.adapter.ts](../../../../services/api/src/modules/inventory/infrastructure/adapters/prisma-document-repository.adapter.ts)
- [apps/web/src/modules/inventory/index.ts](../../../../apps/web/src/modules/inventory/index.ts)

| Feature / acceptance                                                                                                        | Residual gap or decision                                                                                                   | Verification to supply                                                                               |
| --------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| [ASSET-01](https://github.com/Corely-AI/corely/issues/346) — Create the minimal equipment register                          | Validate custody demand and choose a minimal equipment register owner; stock quantity and bookable equipment are adjacent. | Identifier validation, custody/history preservation, file permissions and register UI tests.         |
| [ASSET-02](https://github.com/Corely-AI/corely/issues/347) — Record assignments, handovers and returns                      | Record exclusive custody, handover/acknowledgment and returns with history and competing-write checks.                     | Concurrent custody/replay tests and employee departure-to-return workflow.                           |
| [ASSET-03](https://github.com/Corely-AI/corely/issues/348) — Provide warranty/return follow-up and source-linked assistance | Link due returns/warranties to deduplicated Tasks and authorized assistance; avoid implicit financial valuation.           | Reminder deduplication, date/source checks, AI authorization and optional-integration absence tests. |

## EP-HELPDESK

**Owner / candidate:** Assess existing Issues before new ownership. **Status:** partial; operational readiness unknown.

Closed completed #93 and Issues code already cover intake, attachments, assignment, comments and lifecycle for field/customer/manufacturer contexts. Reuse and validate that owner rather than recreating a generic ticket system. The residual work is choosing an internal support function, private access, queue/response-target fit, safe follow-up and authorized Knowledge drafts; no internal-support readiness is inferred.

Source/layer evidence (existing paths; tests are source evidence, not fresh results):

- [services/api/src/modules/issues/application/use-cases/create-issue.usecase.ts](../../../../services/api/src/modules/issues/application/use-cases/create-issue.usecase.ts)
- [services/api/src/modules/issues/application/use-cases/assign-issue.usecase.ts](../../../../services/api/src/modules/issues/application/use-cases/assign-issue.usecase.ts)
- [services/api/src/modules/issues/application/use-cases/resolve-issue.usecase.ts](../../../../services/api/src/modules/issues/application/use-cases/resolve-issue.usecase.ts)
- [packages/contracts/src/issues/issue.types.ts](../../../../packages/contracts/src/issues/issue.types.ts)
- [packages/data/prisma/schema/77_issues.prisma](../../../../packages/data/prisma/schema/77_issues.prisma)
- [apps/web/src/modules/issues/screens/IssuesListPage.tsx](../../../../apps/web/src/modules/issues/screens/IssuesListPage.tsx)
- [services/api/src/modules/issues/**tests**/issue-rules.spec.ts](../../../../services/api/src/modules/issues/__tests__/issue-rules.spec.ts)
- [services/api/src/modules/issues/domain/issue.rules.ts](../../../../services/api/src/modules/issues/domain/issue.rules.ts)
- [services/api/src/modules/issues/infrastructure/prisma/prisma-issue-repository.adapter.ts](../../../../services/api/src/modules/issues/infrastructure/prisma/prisma-issue-repository.adapter.ts)
- [packages/contracts/src/issues/index.ts](../../../../packages/contracts/src/issues/index.ts)
- [services/api/src/modules/issues/infrastructure/documents/documents-port.adapter.ts](../../../../services/api/src/modules/issues/infrastructure/documents/documents-port.adapter.ts)
- [apps/web/src/modules/issues/index.ts](../../../../apps/web/src/modules/issues/index.ts)

Related issue state at collection: [#93](https://github.com/Corely-AI/corely/issues/93) closed/completed.

| Feature / acceptance                                                                                                | Residual gap or decision                                                                                        | Verification to supply                                                                                       |
| ------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| [HELP-01](https://github.com/Corely-AI/corely/issues/349) — Validate the support function and deliver ticket intake | Choose one internal support function; assess extending Issues site contexts and private requester access first. | Intake validation, tenant/requester privacy and existing-Issues regression tests.                            |
| [HELP-02](https://github.com/Corely-AI/corely/issues/350) — Manage queue assignment, replies and resolution history | Extend queue/reply semantics with internal-note privacy, current permissions and resolution history.            | Private-versus-public reply tests, concurrent assignment, reopen and idempotent notification cases.          |
| [HELP-03](https://github.com/Corely-AI/corely/issues/351) — Add simple response targets and support follow-up       | Define one response-target clock/pause policy and bounded follow-up; no employee scoring or SLA guarantee.      | Clock/pause/closure fixtures, notification replay and linked-approval failure tests.                         |
| [HELP-04](https://github.com/Corely-AI/corely/issues/352) — Draft support responses using authorized Knowledge      | Draft reviewed responses from accessible Knowledge, excluding internal notes and unrelated personnel data.      | Grounded-response, unsupported-question and cross-role leakage evaluations; explicit-send and AI-off checks. |

## EP-INVOICES

**Owner / candidate:** Invoices, not SaaS Billing. **Status:** code-present; operational readiness unknown.

Customer invoices already have create/finalize, reminder drafting, delivery and tax snapshot code plus UI/tests; SaaS subscriptions are separate. FinalizeInvoice requires workspace context and has accounting-related dependencies; optional-finance behavior needs scoped verification. Reuse existing functionality and #141 reminder work; the delta is pilot build-or-integrate choice, operational-source drafts, reviewed delivery/receivables and selected-format accountant handoff, not another invoice engine.

Source/layer evidence (existing paths; tests are source evidence, not fresh results):

- [services/api/src/modules/invoices/application/use-cases/create-invoice/create-invoice.usecase.ts](../../../../services/api/src/modules/invoices/application/use-cases/create-invoice/create-invoice.usecase.ts)
- [services/api/src/modules/invoices/application/use-cases/finalize-invoice/finalize-invoice.usecase.ts](../../../../services/api/src/modules/invoices/application/use-cases/finalize-invoice/finalize-invoice.usecase.ts)
- [services/api/src/modules/invoices/application/use-cases/copilot/draft-reminder-email.usecase.ts](../../../../services/api/src/modules/invoices/application/use-cases/copilot/draft-reminder-email.usecase.ts)
- [packages/contracts/src/invoices](../../../../packages/contracts/src/invoices)
- [packages/data/prisma/schema/60_billing.prisma](../../../../packages/data/prisma/schema/60_billing.prisma)
- [apps/web/src/modules/invoices](../../../../apps/web/src/modules/invoices)
- [services/api/src/modules/invoices/**tests**/invoices-api.int.test.ts](../../../../services/api/src/modules/invoices/__tests__/invoices-api.int.test.ts)
- [services/api/src/modules/invoices/application/use-cases/copilot/draft-reminder-email.usecase.test.ts](../../../../services/api/src/modules/invoices/application/use-cases/copilot/draft-reminder-email.usecase.test.ts)
- [apps/e2e/tests/invoices.spec.ts](../../../../apps/e2e/tests/invoices.spec.ts)
- [packages/web-features/src/modules/invoices/index.ts](../../../../packages/web-features/src/modules/invoices/index.ts)
- [services/api/src/modules/invoices/application/use-cases/send-invoice-reminders/send-invoice-reminders.usecase.test.ts](../../../../services/api/src/modules/invoices/application/use-cases/send-invoice-reminders/send-invoice-reminders.usecase.test.ts)
- [services/api/src/modules/invoices/infrastructure/adapters/prisma-invoice-repository.adapter.ts](../../../../services/api/src/modules/invoices/infrastructure/adapters/prisma-invoice-repository.adapter.ts)
- [packages/contracts/src/invoices/copilot/index.ts](../../../../packages/contracts/src/invoices/copilot/index.ts)
- [services/api/src/modules/invoices/infrastructure/adapters/legal-entity-query.adapter.ts](../../../../services/api/src/modules/invoices/infrastructure/adapters/legal-entity-query.adapter.ts)
- [apps/web/src/modules/invoices/index.ts](../../../../apps/web/src/modules/invoices/index.ts)

Related issue state at collection: [#141](https://github.com/Corely-AI/corely/issues/141) closed/not_planned.

| Feature / acceptance                                                                                                   | Residual gap or decision                                                                                                               | Verification to supply                                                                                              |
| ---------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| [INV-01](https://github.com/Corely-AI/corely/issues/353) — Validate billing scope and close invoice-lifecycle gaps     | Validate build-versus-integrate scope and correction/credit lifecycle over Invoices/Tax/Party, including optional-Accounting behavior. | Existing invoice regression, numbering race/retry, currency/rounding and correction tests with reviewed fixtures.   |
| [INV-02](https://github.com/Corely-AI/corely/issues/354) — Prepare invoice drafts from approved operational records    | Prepare reviewed invoice drafts from permitted source work with duplicate/partial billing provenance and deterministic amounts.        | Duplicate-source, partial billing, authorization, AI proposal review and manual-fallback tests.                     |
| [INV-03](https://github.com/Corely-AI/corely/issues/355) — Track invoice delivery, receivables and reviewed reminders  | Verify existing delivery/reminder/settlement behavior and residual reviewed-retry gaps; #141 was not_planned, not proof of delivery.   | Delivery failure/retry, partial settlement/credit reconciliation and reminder cancellation tests.                   |
| [INV-04](https://github.com/Corely-AI/corely/issues/356) — Validate the selected invoice format and accountant handoff | Select and validate the exact invoice/export format with actual accountant/specification evidence; no blanket compliance claims.       | Format validator fixtures, export reconciliation, unsupported-format behavior and documented accountant acceptance. |

## EP-BILLS

**Owner / candidate:** Purchasing / VendorBill. **Status:** code-present; operational readiness unknown.

Purchasing already owns VendorBill, lines, BillPayment and supplier queries; create bill checks supplier and duplicate bill number and has idempotency helpers. Reuse Purchasing/Party/Documents and review existing approval/accounting settings. The residual is selected bill intake/extraction review, approval-versus-settlement semantics and reconciled accountant export; no duplicate supplier/payable ledger or fund release.

Source/layer evidence (existing paths; tests are source evidence, not fresh results):

- [services/api/src/modules/purchasing/application/use-cases/create-vendor-bill.usecase.ts](../../../../services/api/src/modules/purchasing/application/use-cases/create-vendor-bill.usecase.ts)
- [services/api/src/modules/purchasing/application/use-cases/approve-vendor-bill.usecase.ts](../../../../services/api/src/modules/purchasing/application/use-cases/approve-vendor-bill.usecase.ts)
- [services/api/src/modules/purchasing/purchasing.manifest.ts](../../../../services/api/src/modules/purchasing/purchasing.manifest.ts)
- [packages/contracts/src/purchasing](../../../../packages/contracts/src/purchasing)
- [packages/data/prisma/schema/69_purchasing.prisma](../../../../packages/data/prisma/schema/69_purchasing.prisma)
- [apps/web/src/modules/purchasing](../../../../apps/web/src/modules/purchasing)
- [services/api/src/modules/approvals/**tests**/approval-spec.builder.test.ts](../../../../services/api/src/modules/approvals/__tests__/approval-spec.builder.test.ts)
- [services/api/src/modules/purchasing/infrastructure/adapters/prisma-vendor-bill-repository.adapter.ts](../../../../services/api/src/modules/purchasing/infrastructure/adapters/prisma-vendor-bill-repository.adapter.ts)
- [apps/web/src/modules/purchasing/screens/VendorBillDetailPage.tsx](../../../../apps/web/src/modules/purchasing/screens/VendorBillDetailPage.tsx)
- [packages/contracts/src/purchasing/index.ts](../../../../packages/contracts/src/purchasing/index.ts)
- [services/api/src/modules/purchasing/infrastructure/adapters/prisma-account-mapping-repository.adapter.ts](../../../../services/api/src/modules/purchasing/infrastructure/adapters/prisma-account-mapping-repository.adapter.ts)
- [apps/web/src/modules/purchasing/index.ts](../../../../apps/web/src/modules/purchasing/index.ts)

| Feature / acceptance                                                                                                         | Residual gap or decision                                                                                                  | Verification to supply                                                                                     |
| ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| [BILL-01](https://github.com/Corely-AI/corely/issues/357) — Map existing payables and complete bill intake                   | Complete original-document bill intake and review over Purchasing/VendorBill/Party/Documents, not a second payable store. | Existing-payable regression, malformed document/amount validation and supplier/file authorization tests.   |
| [BILL-02](https://github.com/Corely-AI/corely/issues/358) — Extract bill fields and review duplicate or matching suggestions | Add evidence-backed field/duplicate/matching suggestions with reviewer confirmation; purchase matching remains optional.  | Ambiguous/duplicate/partial-match fixtures, prompt injection, permissions and extraction-off manual entry. |
| [BILL-03](https://github.com/Corely-AI/corely/issues/359) — Approve bills and track due amounts separately from settlement   | Connect configured approval/version review and reconciled due/settlement evidence, without equating approval to payment.  | Approval race/replay, partial settlement/adjustment and due-balance reconciliation tests.                  |
| [BILL-04](https://github.com/Corely-AI/corely/issues/360) — Export supplier documents and reconcile handoff corrections      | Provide an agreed export batch/acknowledgment/correction trail preserving originals and stable source IDs.                | Batch replay/reconciliation, rejected-row and post-export correction fixtures plus recipient review.       |

## EP-BUDGETS

**Owner / candidate:** Plan/projection owner undecided; Reporting / source owners adjacent. **Status:** not-found-in-reviewed-scope; operational readiness unknown.

Reporting currently has an expense-count dashboard and monthly-pack owner; Purchasing/Expenses provide transaction-source candidates. No dedicated budgets owner was found in reviewed API module names. Select and reconcile one reliable spending basis/source before defining a projection. EXP-03/BILL-03/external sources are alternatives, not mandatory AND dependencies; no spending blocks or new ledger.

Source/layer evidence (existing paths; tests are source evidence, not fresh results):

- [services/api/src/modules/reporting/application/use-cases/get-dashboard-report.usecase.ts](../../../../services/api/src/modules/reporting/application/use-cases/get-dashboard-report.usecase.ts)
- [services/api/src/modules/reporting/application/use-cases/get-monthly-pack.usecase.ts](../../../../services/api/src/modules/reporting/application/use-cases/get-monthly-pack.usecase.ts)
- [packages/contracts/src/reporting](../../../../packages/contracts/src/reporting)
- [packages/data/prisma/schema/65_expenses.prisma](../../../../packages/data/prisma/schema/65_expenses.prisma)
- [packages/data/prisma/schema/69_purchasing.prisma](../../../../packages/data/prisma/schema/69_purchasing.prisma)
- [services/api/src/modules/reporting/adapters/http/reporting.controller.ts](../../../../services/api/src/modules/reporting/adapters/http/reporting.controller.ts)
- [packages/contracts/src/reporting/index.ts](../../../../packages/contracts/src/reporting/index.ts)
- [services/api/src/modules/reporting/infrastructure/prisma/prisma-reporting-query.adapter.ts](../../../../services/api/src/modules/reporting/infrastructure/prisma/prisma-reporting-query.adapter.ts)

| Feature / acceptance                                                                                                      | Residual gap or decision                                                                                                      | Verification to supply                                                                                    |
| ------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| [BUD-01](https://github.com/Corely-AI/corely/issues/361) — Define spending basis, source ownership and promotion evidence | Validate one reliable spending source/basis and non-double-counting rules before choosing a budget owner.                     | Review sample transaction lifecycle calculations and source reconciliation with the owner/accountant.     |
| [BUD-02](https://github.com/Corely-AI/corely/issues/362) — Manage budget periods, allocations and auditable versions      | Add authorized budget periods/allocations/version history without copying source transactions or requiring Accounting.        | Version/amendment, permission, amount/period and retry tests.                                             |
| [BUD-03](https://github.com/Corely-AI/corely/issues/363) — Project commitments and actuals from the selected sources      | Project only selected sources through contracts/events with replay/rebuild/reconciliation; EXP-03/BILL-03 are alternatives.   | Lifecycle/replay/rebuild and source-total reconciliation tests, including partial/cancelled transactions. |
| [BUD-04](https://github.com/Corely-AI/corely/issues/364) — Explain variances and provide advisory spending warnings       | Explain advisory variance from permitted sources/freshness and labeled assumptions; do not enforce automatic spending blocks. | Variance fixture/reconciliation checks, warning deduplication, explanation-grounding and AI-off tests.    |

## Existing work, closure reasons and PR evidence

Knowledge [#130](https://github.com/Corely-AI/corely/issues/130) remains open with its original
Articles/FAQ/Glossary and public-content scope/P0 body metadata. The private-policy slice is distinct.
Forms [#52](https://github.com/Corely-AI/corely/issues/52), public Knowledge foundation
[#131](https://github.com/Corely-AI/corely/issues/131), and invoice reminder
[#141](https://github.com/Corely-AI/corely/issues/141) are closed **not_planned**. None is proof of
implementation. Current Forms and reminder code are separate source evidence; verify the residual
journey rather than reopening or rebuilding from a closure label.

Booking #215, Issues #93, entitlements #112, notifications #196, command centre #185 and menu #170
are closed completed. Their code/PRs provide reuse candidates, not proof of all new acceptance.
STR-02 maps to the existing documentation commit, with no duplicate delivery issue.

| Related PR                                                                                                            | Observed state | Actual target at merge |
| --------------------------------------------------------------------------------------------------------------------- | -------------- | ---------------------- |
| [#280](https://github.com/Corely-AI/corely/pull/280) — feat(openbuk): add multilingual booking product vertical slice | MERGED         | `development`          |
| [#217](https://github.com/Corely-AI/corely/pull/217) — Fix booking module type errors                                 | MERGED         | `development`          |
| [#218](https://github.com/Corely-AI/corely/pull/218) — 215 booking                                                    | MERGED         | `development`          |
| [#219](https://github.com/Corely-AI/corely/pull/219) — booking                                                        | MERGED         | `main`                 |
| [#106](https://github.com/Corely-AI/corely/pull/106) — 93 issue module                                                | MERGED         | `development`          |
| [#113](https://github.com/Corely-AI/corely/pull/113) — 112 tenant entitlements feature management                     | MERGED         | `development`          |
| [#231](https://github.com/Corely-AI/corely/pull/231) — 196 notification module                                        | MERGED         | `development`          |
| [#189](https://github.com/Corely-AI/corely/pull/189) — 185 comand centre                                              | MERGED         | `development`          |
| [#171](https://github.com/Corely-AI/corely/pull/171) — 170 scalable app grouped menu                                  | MERGED         | `development`          |

## Retained domains and surfaces

The structured inventory lists every tracked API module directory, including modules outside the
13 catalog apps. Keep accounting/tax/cash/payment methods, Party/CRM/sales/catalog, POS/inventory/import,
CMS/website/portfolio/rentals/classes/coaching/directory/restaurant/portal and platform/support owners.
Their presence is not a global registration or readiness claim. In particular, specialized portfolio
team members, class instructors/attendance, rental availability, coaching bookings and POS
`ShiftSession` do not establish employee People, Time, Shifts or generic Projects records.

The Vite admin and focused clients, Next.js public/website surfaces, Expo POS and .NET ERiC gateway
retain their existing roles. `apps/e2e` is a test workspace. Focused clients reuse package exports;
Expenses and Invoices admin entrypoints already re-export `packages/web-features` implementations.
No surface/module, finance capability or public journey is removed by this inventory.

## Stale assumptions and follow-up ownership

| Observation                                                                                                                                         | Consequence / scoped next owner                                                                                                |
| --------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `services/worker` and historical mock-server runtime are absent from tracked source; Background is imported by API composition.                     | Reuse API-hosted execution. Do not recreate services to satisfy old prose.                                                     |
| `scripts/architecture-check.mjs` still scans the absent worker path; deployment YAML retains worker references.                                     | Tooling/runtime reconciliation needs scoped maintenance. This ticket does not report an old checker failure as a fresh run.    |
| The actual default branch is `development`; checked-in CI/deploy push triggers reference `main`, and CI names an absent root `e2e:smoke` script.    | Verify actual workflow coverage before relying on push/CI evidence; do not rewrite delivery infrastructure here.               |
| App installs/feature enablement, workspace templates/capabilities, subscriptions, menu composition and operation permissions are separate controls. | PLAT-01/02 must audit effective defaults and operation access; menu visibility is not authorization or optional-finance proof. |
| Legacy Booking hold, booking, audit and outbox calls are separate; OpenBuk uses a scoped transaction and shared resource locks.                     | APT-02 must review every writer/retry path, not generalize OpenBuk atomicity to legacy writes.                                 |
| Booking manifest permissions are empty; legacy repository queries shown are tenant-filtered while OpenBuk explicitly scopes tenant/workspace.       | PLAT-02/APT-02 need effective guard and cross-workspace policy tests; static observations are not a runtime exploit claim.     |
| Forms and tool helpers contain workspace/tenant fallbacks; private personnel ownership is unresolved.                                               | REQ-01/PLAT-02/OPS-01 resolve identity semantics before reuse.                                                                 |
| Existing expense transition and bill approval flows call persistence/audit in separate steps.                                                       | EXP-02/BILL-03 verify transaction, approval/version and retry semantics within their scoped delivery.                          |
| Human workflow tasks refuse automatic completion; configured email tasks call their email port.                                                     | Preserve explicit deterministic automation policies separately from reviewed AI-originated actions.                            |
| Deployment/provider behavior, actual pilot authority, employee/privacy flows and customer demand are unverified.                                    | STR-03/04 and each delivery/release ticket must supply the named evidence; do not invent a decision.                           |

Hard prerequisites retain the imported acyclic graph. P2 remains conditional on REL-04 or a documented
promotion equivalent; limited discovery is not implementation approval. Budgets EXP-03/BILL-03/external
sources are alternatives, selected by BUD-01, not an AND requirement. See the existing
[execution layers](import-report.md#suggested-execution-order) rather than treating catalog order as
implementation order. No closed issue, new PR or inventory row satisfies a pilot gate by itself.

## Verification and limits

The task record links actual structural/path/format/whitespace checks and the draft PR. Counts and
keys were reconciled against the imported specification and current issue mapping. Source existence,
app/feature coverage and issue closure reasons were checked independently; none proves deployment,
private-data safety, legal compliance, customer demand or complete feature implementation.

Application unit/integration/E2E suites, production configuration, provider access, migrations,
access/concurrency scenarios and UI visual checks were not executed for this documentation ticket.
UI/UX evidence is N/A because no product interface changes. The issue remains open until its
review/integration requirements are satisfied.
