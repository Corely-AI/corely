# Corely long-term app catalog

2026-11-07 · Target product map, not a delivery commitment or availability list.

IDs preserve discussion order, not delivery order or runtime app IDs. Apps need
not be independently deployed or billed. Customers buy an operational outcome.
Implementation status lives in the linked alignment rows; recommendations below
are investment choices. **Deferred** does not mean missing, delete, or stop
maintaining existing code. See [strategy](README.md) and [focused launch](launch-plan.md).

All assistance below is **proposed**. Apply the [AI target policy](../../ai/ai-copilot.md):
authorize retrieval/execution, isolate tenant/workspace, cite sources/freshness,
validate deterministically, revalidate proposals, audit and retry safely. Manual
workflows must remain useful. Profiles do not claim these controls are universally
implemented. Sensitive AI-originated changes and external communications require
authorized confirmation; configured deterministic automations retain actual policy.

Finance is the umbrella; Accounting is bookkeeping and financial records;
Financing is funding and borrowing administration. None is a prerequisite for
the operational package.

## Daily work and coordination

### 01. Corely Tasks

- **User/job:** Employees and team leads: know and finish assigned daily work.
- **Smallest scope:** Assigned tasks, due times, completion and recurring checklists.
- **Non-goals:** Full project planning, CRM activities or workflow-execution queues.
- **AI/approval target:** Draft checklists and follow-up; user reviews creation/assignment and confirms sensitive changes.
- **Ownership/connections target:** Proposed employee task records; Projects groups the same tasks; Requests links decisions and Knowledge links instructions. No dedicated owner established.
- **Current implementation:** [Evidence/status row 01](repository-alignment.md#app-01); status is separate from priority.
- **Recommendation:** Validate then build only a thin slice, reusing execution/scheduling infrastructure where appropriate.
- **Customer evidence needed:** Repeated missed follow-up or checklist problems, employee usage and measurable reduction in chasing.

### 02. Corely People

- **User/job:** Staff and authorized managers: find colleagues and understand operational availability.
- **Smallest scope:** Directory, working patterns and narrow absence information with restricted access.
- **Non-goals:** Payroll, comprehensive HR, medical case management or employment decisions.
- **AI/approval target:** Explain policy and draft requests; employee/authorized approver confirms changes; no autonomous personnel decisions.
- **Ownership/connections target:** Proposed employee profile/availability owner, related to but distinct from auth users, parties and bookable resources; supplies authorized absence effects to Schedule/Shifts.
- **Current implementation:** [Evidence/status row 02](repository-alignment.md#app-02); status is separate from priority.
- **Recommendation:** Assess identity/party reuse and define narrow employee ownership before scoped extension/build.
- **Customer evidence needed:** Staff privacy expectations, actual absence process, access roles and willingness to use self-service.

### 03. Corely Appointments

- **User/job:** Scheduling staff and managers: coordinate customer appointments and resource availability.
- **Smallest scope:** Existing Booking appointments/resources, availability and conflict visibility; keep internal reservations distinct.
- **Non-goals:** Another booking domain, marketplace, or automatic absence-driven cancellations.
- **AI/approval target:** Explain conflicts and propose alternatives; authorized manager confirms rescheduling, cancellation and outgoing messages.
- **Ownership/connections target:** Existing booking owns reservations/occupancy; links parties/services/resources. People supplies neutral availability; Shifts supplies coverage, not booking authority.
- **Current implementation:** [Evidence/status row 03](repository-alignment.md#app-03); status is separate from priority.
- **Recommendation:** Reuse/extend Booking; choose adoption model and verify safeguards before launch.
- **Customer evidence needed:** Migration willingness or one feasible integration, pilot-essential public booking and recurring coordination problems.

### 04. Corely Requests

- **User/job:** Employees and decision-makers: submit a request and see its decision.
- **Smallest scope:** Narrow forms, explicit approver routing, pending decisions and history for one request type.
- **Non-goals:** Universal workflow designer or direct mutation of another domain’s records.
- **AI/approval target:** Draft request/summary and suggest routing; requester confirms submission, authorized approver decides; domain revalidates application.
- **Ownership/connections target:** Forms and approvals are candidates; Requests owns submission/decision, business domain owns effects; Workflows orchestrates larger processes.
- **Current implementation:** [Evidence/status row 04](repository-alignment.md#app-04); status is separate from priority.
- **Recommendation:** Reuse forms/approval services and extend one validated journey.
- **Customer evidence needed:** Repeated approval delays, clear decision authority and domain integration requirements.

### 05. Corely Knowledge

- **User/job:** Staff and content owners: find approved policies and instructions.
- **Smallest scope:** Links, attachments or simple approved pages with an owner and review information.
- **Non-goals:** Full collaborative wiki, general file storage, contract obligations or training completion.
- **AI/approval target:** Answer with approved sources/freshness and uncertainty; content owner approves publishing and policy changes.
- **Ownership/connections target:** Proposed approved-content boundary over documents/CMS candidates; links Tasks and Learning without owning their records.
- **Current implementation:** [Evidence/status row 05](repository-alignment.md#app-05); status is separate from priority.
- **Recommendation:** Reuse approved links/pages; defer rich authoring.
- **Customer evidence needed:** Repeated instruction lookup problems, content ownership and demand for approval/version controls.

### 06. Corely Projects

- **User/job:** Team leads: organize milestones and larger initiatives.
- **Smallest scope:** Milestones, initiative status and grouping of the same employee-facing Tasks.
- **Non-goals:** A second task system, portfolio showcase projects, full job costing or resource optimization.
- **AI/approval target:** Draft milestones and summarize progress; owner reviews creation and confirms consequential work changes.
- **Ownership/connections target:** Proposed initiative records link shared Tasks and documents; existing portfolio projects are not equivalent.
- **Current implementation:** [Evidence/status row 06](repository-alignment.md#app-06); status is separate from priority.
- **Recommendation:** Defer; extend after Tasks and initiative demand are demonstrated.
- **Customer evidence needed:** Recurring initiatives exceeding daily checklists and evidence milestone coordination improves outcomes.

### 07. Corely Goals

- **User/job:** Teams and managers: maintain objectives and periodic check-ins.
- **Smallest scope:** Objectives, owners, progress notes and check-in history.
- **Non-goals:** Employee performance scoring, surveillance or automated employment decisions.
- **AI/approval target:** Suggest wording and summarize check-ins; owners approve goals and updates.
- **Ownership/connections target:** Proposed objective/check-in owner; links Projects/Insights without deriving employee scores.
- **Current implementation:** [Evidence/status row 07](repository-alignment.md#app-07); status is separate from priority.
- **Recommendation:** Defer.
- **Customer evidence needed:** Teams already reviewing objectives regularly and willingness to maintain a lightweight record.

### 08. Corely Meetings

- **User/job:** Meeting organizers and participants: capture agendas, decisions and actions.
- **Smallest scope:** Agenda, decision notes and links to existing Tasks.
- **Non-goals:** Video conferencing, recording/transcription platform or a second task owner.
- **AI/approval target:** Draft agenda/minutes/actions with source uncertainty; participants approve decision records and task creation.
- **Ownership/connections target:** Proposed shared meeting feature links Knowledge/documents and Tasks; does not own their content/work lifecycle.
- **Current implementation:** [Evidence/status row 08](repository-alignment.md#app-08); status is separate from priority.
- **Recommendation:** Lightweight feature/integration first; defer standalone app.
- **Customer evidence needed:** Repeated lost decisions or follow-up, meeting frequency and current tool gaps.

### 09. Corely Updates

- **User/job:** Managers and staff: share announcements and useful team digests.
- **Smallest scope:** Audience-scoped announcement and digest with source links.
- **Non-goals:** Chat/social network, employee monitoring or a duplicate notification service.
- **AI/approval target:** Draft announcements/digests; authorized author confirms publishing and external communication.
- **Ownership/connections target:** Shared editorial feature candidate using notifications and existing records; notifications own delivery, not policy content.
- **Current implementation:** [Evidence/status row 09](repository-alignment.md#app-09); status is separate from priority.
- **Recommendation:** Shared feature before standalone app.
- **Customer evidence needed:** Missed announcements, audience/access needs and measurable reduction in repeated messaging.

### 10. Corely Workflows

- **User/job:** Process owners: coordinate repeatable processes across capabilities.
- **Smallest scope:** Explicit configured steps using existing execution, approval and retry infrastructure.
- **Non-goals:** Broad visual builder, another orchestrator or bypassing business-domain validation.
- **AI/approval target:** Draft/explain process configuration; authorized owner approves activation and sensitive AI-originated execution. Existing deterministic policy remains separate.
- **Ownership/connections target:** Existing workflow/core/background owners execute processes; domain use cases own state changes. Workflow Tasks are execution records.
- **Current implementation:** [Evidence/status row 10](repository-alignment.md#app-10); status is separate from priority.
- **Recommendation:** Reuse/extend execution; defer broad designer.
- **Customer evidence needed:** Stable repeated processes, safe configuration demand and operator recovery/support capacity.

## People and team operations

### 11. Corely Shifts

- **User/job:** Managers and staff: plan rosters and coverage.
- **Smallest scope:** Roster periods, assigned coverage and visible gaps with working/absence inputs.
- **Non-goals:** Booking ownership, register cash shifts, payroll or automatic staffing optimization.
- **AI/approval target:** Propose coverage alternatives and explain constraints; authorized manager approves roster/reassignment and communication.
- **Ownership/connections target:** Proposed roster owner uses People availability; Booking still validates occupancy/reservations.
- **Current implementation:** [Evidence/status row 11](repository-alignment.md#app-11); status is separate from priority.
- **Recommendation:** Conditional leading expansion after pilot demand; assess integrations.
- **Customer evidence needed:** Repeated coverage gaps, roster complexity, staff acceptance and improved coverage versus baseline.

### 12. Corely Time

- **User/job:** Staff and approving managers: record time, breaks and timesheets.
- **Smallest scope:** Entries, corrections, review and export to an agreed destination.
- **Non-goals:** Payroll, comprehensive jurisdiction-specific labor rules or productivity scores.
- **AI/approval target:** Draft entries from explicit user input and flag inconsistencies; employee/manager approves corrections and submission.
- **Ownership/connections target:** Proposed time-entry owner; links People/Projects as justified; a workspace capability flag is not an implementation.
- **Current implementation:** [Evidence/status row 12](repository-alignment.md#app-12); status is separate from priority.
- **Recommendation:** Assess integrations before building specialist rules.
- **Customer evidence needed:** Existing tracking burden, required exports, correction policy and specialist review of applicable rules.

### 13. Corely Hiring

- **User/job:** Recruiters and hiring managers: coordinate recruitment administration.
- **Smallest scope:** Candidate administration, interview scheduling and explicit human decisions.
- **Non-goals:** Automated candidate ranking, employment decisions or broad applicant-tracking replacement.
- **AI/approval target:** Draft interview logistics and communications; authorized humans approve sends and all decisions.
- **Ownership/connections target:** Proposed/integrated recruitment records with restricted access; share identity/contact interfaces only where authorized.
- **Current implementation:** [Evidence/status row 13](repository-alignment.md#app-13); status is separate from priority.
- **Recommendation:** Defer or integrate.
- **Customer evidence needed:** Recruitment volume, current-system gaps, consent/retention needs and willingness to adopt.

### 14. Corely Learning

- **User/job:** Staff and training owners: complete required learning.
- **Smallest scope:** Training paths, approved material links and completion records.
- **Non-goals:** Full learning platform, inferred competence scores or relabeling classes as staff training.
- **AI/approval target:** Suggest material and reminders; owner approves paths, staff/authorized reviewer attests completion.
- **Ownership/connections target:** Proposed completion owner reuses Knowledge; classes/attendance is adjacent vertical code, not automatic ownership.
- **Current implementation:** [Evidence/status row 14](repository-alignment.md#app-14); status is separate from priority.
- **Recommendation:** Defer; reuse approved Knowledge.
- **Customer evidence needed:** Repeated onboarding/training gaps, required evidence and sustainable content maintenance.

### 15. Corely Feedback

- **User/job:** Staff and facilitators: collect suggestions, surveys and retrospective input.
- **Smallest scope:** Templates, submissions, visible follow-up and explicit anonymity/access policy.
- **Non-goals:** Employee surveillance scores or inferred individual performance.
- **AI/approval target:** Summarize permitted responses with limitations; facilitator reviews publication; no exposing anonymous respondents.
- **Ownership/connections target:** Forms/integration candidate owns submissions; link follow-up Tasks without copying personnel data.
- **Current implementation:** [Evidence/status row 15](repository-alignment.md#app-15); status is separate from priority.
- **Recommendation:** Templates/integration first.
- **Customer evidence needed:** Trusted participation, real survey cadence, anonymity requirements and acted-on findings.

## Resources and internal services

### 16. Corely Expenses

- **User/job:** Employees and finance reviewers: claim expenses and track reimbursement.
- **Smallest scope:** Receipts, claims, explicit approval and reimbursement status for agreed policy.
- **Non-goals:** Payroll, automatic fund release or assuming existing statuses prove the entire claim journey.
- **AI/approval target:** Extract receipt fields and draft claims; claimant confirms submission, authorized reviewer approves; deterministic calculations.
- **Ownership/connections target:** Existing expenses owns expense records/lines; reuse documents/approvals and accounting/payment interfaces without duplicating them.
- **Current implementation:** [Evidence/status row 16](repository-alignment.md#app-16); status is separate from priority.
- **Recommendation:** Reuse/assess existing implementation; extend employee reimbursement only when needed.
- **Customer evidence needed:** Expense volume, policy, approval authority and actual reimbursement reconciliation needs.

### 17. Corely Purchasing

- **User/job:** Buyers and operational managers: request/order supplies and coordinate delivery.
- **Smallest scope:** Purchase requests/orders, supplier reference and delivery progress.
- **Non-goals:** A new supplier master, sourcing marketplace or complete warehouse management.
- **AI/approval target:** Draft orders and highlight mismatches; authorized buyer approves commitments and external sends.
- **Ownership/connections target:** Existing purchasing owns orders/payables; party owns suppliers, inventory owns stock and Requests may supply decisions.
- **Current implementation:** [Evidence/status row 17](repository-alignment.md#app-17); status is separate from priority.
- **Recommendation:** Reuse/extend purchasing ownership.
- **Customer evidence needed:** Recurring procurement mistakes, approval/delivery needs and supplier coordination volume.

### 18. Corely Assets

- **User/job:** Equipment custodians and managers: know custody and lifecycle.
- **Smallest scope:** Equipment register, assignment, handover and retirement records.
- **Non-goals:** Inventory stock ownership, depreciation suite or service work execution.
- **AI/approval target:** Draft handovers and flag missing information; authorized custodian confirms assignments/disposals.
- **Ownership/connections target:** Proposed asset owner, assess inventory links; Maintenance owns servicing, documents stores attachments.
- **Current implementation:** [Evidence/status row 18](repository-alignment.md#app-18); status is separate from priority.
- **Recommendation:** Conditional expansion; assess reuse before build.
- **Customer evidence needed:** Equipment volume, loss/handover problems and recurring custody/lifecycle needs.

### 19. Corely Vendors

- **User/job:** Buyers and administrators: maintain trusted supplier information.
- **Smallest scope:** Supplier details, ownership and narrow onboarding checks.
- **Non-goals:** Duplicate parties, supplier marketplace or AI-approved bank-detail changes.
- **AI/approval target:** Draft onboarding summaries and flag missing evidence; authorized human approves master-data changes; bank-detail changes excluded from proposed launch.
- **Ownership/connections target:** Existing party is supplier master-data candidate; purchasing references supplierPartyId; Contracts links obligations.
- **Current implementation:** [Evidence/status row 19](repository-alignment.md#app-19); status is separate from priority.
- **Recommendation:** Reuse/extend party boundaries.
- **Customer evidence needed:** Duplicate supplier problems, onboarding friction and required restricted-data controls.

### 20. Corely Contracts

- **User/job:** Contract owners: track agreements, obligations and renewals.
- **Smallest scope:** Register, owner, document link, key dates and renewal reminders.
- **Non-goals:** Legal advice, full contract lifecycle platform or new e-signature provider.
- **AI/approval target:** Extract candidate dates/obligations with sources; owner verifies and approves records/reminders and signing communications.
- **Ownership/connections target:** Proposed register links shared documents and parties; coaching signing is specialization; integrate signing where needed.
- **Current implementation:** [Evidence/status row 20](repository-alignment.md#app-20); status is separate from priority.
- **Recommendation:** Defer generic register; assess existing contract/signing interfaces.
- **Customer evidence needed:** Missed renewals, obligation ownership, document quality and specialist review needs.

### 21. Corely Helpdesk

- **User/job:** Employees and support agents: resolve internal tickets in queues.
- **Smallest scope:** Submission, triage, assignment, status and resolution history.
- **Non-goals:** Automatic equivalence to Tasks or a full omnichannel customer-support suite.
- **AI/approval target:** Suggest triage and responses; agent approves consequential routing/resolution and outgoing messages.
- **Ownership/connections target:** Assess issues owner for support semantics; queue tickets link Tasks/Knowledge but retain their own lifecycle/access.
- **Current implementation:** [Evidence/status row 21](repository-alignment.md#app-21); status is separate from priority.
- **Recommendation:** Conditional extension after ticket-volume evidence.
- **Customer evidence needed:** Sustained internal ticket volume, queue/access needs and measurable support improvement.

### 22. Corely Maintenance

- **User/job:** Equipment managers and technicians: plan and record service work.
- **Smallest scope:** Preventive servicing, repair work, inspections and service history.
- **Non-goals:** Asset custody ownership, broad field-service suite or unsupported safety certification.
- **AI/approval target:** Draft service checklists/schedules; qualified authorized staff approve plans and attest inspections.
- **Ownership/connections target:** Proposed service-work owner links Assets; issues/inventory are candidates to assess, not complete maintenance implementation.
- **Current implementation:** [Evidence/status row 22](repository-alignment.md#app-22); status is separate from priority.
- **Recommendation:** Defer for equipment-heavy teams.
- **Customer evidence needed:** Equipment-critical operations, missed maintenance, qualified owner and required inspection evidence.

### 23. Corely Visitors

- **User/job:** Reception staff and hosts: coordinate expected guests.
- **Smallest scope:** Guest registration, visit status, host coordination and defined retention.
- **Non-goals:** Identity verification platform, surveillance or building-access replacement.
- **AI/approval target:** Draft host instructions; host/reception confirms registrations and messages.
- **Ownership/connections target:** Proposed/integrated visit records link authorized hosts; minimize guest data and reuse notifications.
- **Current implementation:** [Evidence/status row 23](repository-alignment.md#app-23); status is separate from priority.
- **Recommendation:** Defer or integrate.
- **Customer evidence needed:** Visitor volume, reception burden, access-system constraints and retention expectations.

### 24. Corely Travel

- **User/job:** Employees and approvers: coordinate trips and approvals.
- **Smallest scope:** Trip request, decision and itinerary links.
- **Non-goals:** Travel marketplace, automatic booking or complete expense/payments system.
- **AI/approval target:** Draft request/itinerary summary; traveler confirms, approver decides, user approves bookings/communications.
- **Ownership/connections target:** Forms/Requests candidate for decisions; linked itineraries/documents, Expenses for claims; restrict personal travel data.
- **Current implementation:** [Evidence/status row 24](repository-alignment.md#app-24); status is separate from priority.
- **Recommendation:** Templates/integration first.
- **Customer evidence needed:** Travel frequency, approval burden, existing booking-tool fit and privacy constraints.

## Insights and optional finance

### 25. Corely Insights

- **User/job:** Managers and teams: understand operational outcomes.
- **Smallest scope:** Basic contextual reports within Schedule, Team and Daily Work with source/freshness.
- **Non-goals:** Broad standalone BI platform or employee productivity scoring.
- **AI/approval target:** Explain metrics and propose queries with sources/uncertainty; user reviews interpretation, authorized owner approves saved/shared reports.
- **Ownership/connections target:** Existing reporting/read-model candidates; owning apps define measures and authorize source access.
- **Current implementation:** [Evidence/status row 25](repository-alignment.md#app-25); status is separate from priority.
- **Recommendation:** Basic in-experience reports first; standalone analytics later.
- **Customer evidence needed:** Repeated decisions needing consistent measures, reliable sources and demonstrated action on findings.

### 26. Corely Invoices

- **User/job:** Business owners and receivables staff: invoice customers and track amounts due.
- **Smallest scope:** Invoices, assessed credit-note scope and receivables tracking.
- **Non-goals:** SaaS subscription billing or a requirement for operational-app adoption.
- **AI/approval target:** Draft invoice/reminder with deterministic amounts; authorized user approves issuance, credit changes and sends.
- **Ownership/connections target:** Existing invoices owner with party/documents/payment/tax connections; preserve financial records and audit.
- **Current implementation:** [Evidence/status row 26](repository-alignment.md#app-26); status is separate from priority.
- **Recommendation:** Reuse/extend existing code by customer need.
- **Customer evidence needed:** Billing volume, actual credit-note/receivables gaps and willingness to adopt existing journey.

### 27. Corely Bills

- **User/job:** Payables staff and approvers: track supplier invoices and due dates.
- **Smallest scope:** Vendor bills, explicit approvals and payment-status/due-date tracking.
- **Non-goals:** A second payables owner or autonomous fund release.
- **AI/approval target:** Extract/draft bills and flag duplicates; reviewer approves posting and sensitive changes; no launch fund release.
- **Ownership/connections target:** Existing purchasing owns VendorBill/BillPayment; party owns supplier master, documents owns files, accounting owns ledger.
- **Current implementation:** [Evidence/status row 27](repository-alignment.md#app-27); status is separate from priority.
- **Recommendation:** Reuse/assess purchasing payables before anything new.
- **Customer evidence needed:** Bill volume, capture/approval bottlenecks, due-date needs and reconciliation accuracy.

### 28. Corely Budgets

- **User/job:** Budget owners: plan spending and compare commitments and actuals.
- **Smallest scope:** Defined spending plans, commitments and variance for one reliable source set.
- **Non-goals:** Full planning suite, guaranteed forecasts or new ledger ownership.
- **AI/approval target:** Draft scenarios and explain variance; owner approves budget/commitment changes; calculations deterministic.
- **Ownership/connections target:** Proposed budget owner references purchasing/expenses/accounting source records without becoming their authority.
- **Current implementation:** [Evidence/status row 28](repository-alignment.md#app-28); status is separate from priority.
- **Recommendation:** Defer until reliable source records and demand exist.
- **Customer evidence needed:** Trusted actuals/commitments, repeated budget decisions and ability to maintain plans.

### 29. Corely Cash Flow

- **User/job:** Owners and finance staff: see cash position and forecast scenarios.
- **Smallest scope:** Source-reconciled visibility and explicit forecast assumptions/freshness.
- **Non-goals:** Equating cash registers/day close with forecasting or guaranteeing future liquidity.
- **AI/approval target:** Explain scenarios and missing data; authorized user approves saved assumptions and sharing, never fund release.
- **Ownership/connections target:** Proposed forecasting/read-model boundary consumes accounts/receivables/payables; cash-management remains register/entry authority.
- **Current implementation:** [Evidence/status row 29](repository-alignment.md#app-29); status is separate from priority.
- **Recommendation:** Defer forecasting; assess source reliability and integrations.
- **Customer evidence needed:** Repeated cash decisions, reconciled sources, uncertainty tolerance and useful forecast horizon.

### 30. Corely Payments

- **User/job:** Finance operators: coordinate collections, disbursements, refunds and settlements.
- **Smallest scope:** One verified provider integration and clear payment/settlement status ownership.
- **Non-goals:** A new payment processor, bank-detail changes or AI fund release in proposed launch.
- **AI/approval target:** Explain exceptions and draft reconciliation suggestions; authorized operator approves sensitive actions under provider controls.
- **Ownership/connections target:** Existing invoice/bill payments and provider adapters are candidates; payment-method configuration is separate, preserve domain/provider authority.
- **Current implementation:** [Evidence/status row 30](repository-alignment.md#app-30); status is separate from priority.
- **Recommendation:** Provider integration first; assess current journeys.
- **Customer evidence needed:** Transaction volume, provider fit, reconciliation/support costs and specialist security/regulatory review.

### 31. Corely Accounting

- **User/job:** Bookkeepers and accountants: maintain ledger, reconcile and close periods.
- **Smallest scope:** Existing ledger/statements plus scoped reconciliation/closing needs after assessment.
- **Non-goals:** Mandatory operational dependency, deletion of existing code or broad new specialist commitments.
- **AI/approval target:** Explain entries and draft proposals with sources; authorized professional approves sensitive postings/closing; configured deterministic postings keep actual policy.
- **Ownership/connections target:** Existing accounting owns bookkeeping/financial records; source domains retain their records and posting interfaces.
- **Current implementation:** [Evidence/status row 31](repository-alignment.md#app-31); status is separate from priority.
- **Recommendation:** Preserve/maintain; optional adoption, defer broad investment unless separately justified.
- **Customer evidence needed:** Specific specialist gaps, qualified review, reliable sources and demand beyond current implementation.

### 32. Corely Financing

- **User/job:** Owners and finance administrators: track existing funding obligations.
- **Smallest scope:** Existing loan/lease register, funding documents and repayment tracking.
- **Non-goals:** Lending, credit scoring, financing marketplace or autonomous funding decisions.
- **AI/approval target:** Extract candidate obligations with source uncertainty; authorized owner verifies records and schedules; no lending decisions or payments.
- **Ownership/connections target:** Proposed obligation owner links Contracts/documents and payment records; distinct from Accounting and Finance umbrella.
- **Current implementation:** [Evidence/status row 32](repository-alignment.md#app-32); status is separate from priority.
- **Recommendation:** Defer.
- **Customer evidence needed:** Recurring administration of actual loans/leases, document quality and repayment-tracking burden.
