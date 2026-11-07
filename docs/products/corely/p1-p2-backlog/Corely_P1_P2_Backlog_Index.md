# Corely P1/P2 backlog index

Prepared 7 November 2026. **17 epics + 68 features = 85 logical entries before reconciliation.** No GitHub issues have been created by this package.

P1 covers five catalog apps plus shared delivery work. P2 covers eight conditional expansion apps. All detailed ticket decomposition is proposed; implementation status must be checked.

| Scope | Epic key          | Epic                                                     | Features |
| ----- | ----------------- | -------------------------------------------------------- | -------: |
| P1    | `EP-STRATEGY`     | Confirm the launch package and reuse plan                |        4 |
| P1    | `EP-PLATFORM`     | Provide the shared operational workspace                 |        4 |
| P1    | `EP-PEOPLE`       | Corely People — operational staff and availability       |        4 |
| P1    | `EP-REQUESTS`     | Corely Requests — narrow forms and approvals             |        3 |
| P1    | `EP-TASKS`        | Corely Tasks — daily work and recurring checklists       |        4 |
| P1    | `EP-APPOINTMENTS` | Corely Appointments and OpenBuk — dependable scheduling  |        7 |
| P1    | `EP-KNOWLEDGE`    | Corely Knowledge — private approved procedures           |        3 |
| P1    | `EP-CONNECTED`    | Connect daily operations with controlled AI assistance   |        5 |
| P1    | `EP-RELEASE`      | Verify pilot readiness and recoverability                |        4 |
| P2    | `EP-SHIFTS`       | Corely Shifts — coverage and published rosters           |        4 |
| P2    | `EP-TIME`         | Corely Time — integration-first actual time records      |        3 |
| P2    | `EP-EXPENSES`     | Corely Expenses — employee claims and accountant handoff |        4 |
| P2    | `EP-ASSETS`       | Corely Assets — equipment custody and handovers          |        3 |
| P2    | `EP-HELPDESK`     | Corely Helpdesk — one internal support queue             |        4 |
| P2    | `EP-INVOICES`     | Corely Invoices — bounded customer billing               |        4 |
| P2    | `EP-BILLS`        | Corely Bills — supplier documents and payable review     |        4 |
| P2    | `EP-BUDGETS`      | Corely Budgets — advisory spending plans and variance    |        4 |

## Feature coverage

### P1 · EP-STRATEGY · Confirm the launch package and reuse plan

- `STR-01` — Map P1/P2 capabilities to code and existing issues
- `STR-02` — Align AGENTS and canonical documentation with the app strategy
- `STR-03` — Choose the pilot booking authority and staff surface
- `STR-04` — Define pilot evidence and P2 promotion criteria

### P1 · EP-PLATFORM · Provide the shared operational workspace

- `PLAT-01` — Compose the package using existing app manifests
- `PLAT-02` — Enforce operational roles and private-data access
- `PLAT-03` — Build the responsive manual-first operational shell
- `PLAT-04` — Support resumable pilot setup and staff invitations

### P1 · EP-PEOPLE · Corely People — operational staff and availability

- `PEOPLE-01` — Maintain the staff directory and explicit identity links
- `PEOPLE-02` — Manage working patterns and dated availability exceptions
- `PEOPLE-03` — Record private absences and neutral availability effects
- `PEOPLE-04` — Deliver staff self-service and controlled onboarding/offboarding

### P1 · EP-REQUESTS · Corely Requests — narrow forms and approvals

- `REQ-01` — Submit typed requests with supporting context
- `REQ-02` — Apply review decisions through safe domain handoffs
- `REQ-03` — Provide request tracking, the decision inbox and bounded reminders

### P1 · EP-TASKS · Corely Tasks — daily work and recurring checklists

- `TASK-01` — Create, assign and complete employee-facing tasks
- `TASK-02` — Provide My work and simple team list/board views
- `TASK-03` — Generate recurring opening and closing checklists
- `TASK-04` — Attach context and link operational follow-up work

### P1 · EP-APPOINTMENTS · Corely Appointments and OpenBuk — dependable scheduling

- `APT-01` — Extend services and eligible staff for a small team
- `APT-02` — Unify availability inputs and harden booking concurrency
- `APT-03` — Deliver the day/week agenda and reviewed booking lifecycle
- `APT-04` — Secure the existing guest booking and management journey
- `APT-05` — Deliver observable confirmations and reminders
- `APT-06` — Implement the selected import or calendar-connection path
- `APT-07` — Close public-booking abuse and isolation release gaps

### P1 · EP-KNOWLEDGE · Corely Knowledge — private approved procedures

- `KNOW-01` — Publish a minimal private policy/procedure collection
- `KNOW-02` — Find procedures and link them from operational work
- `KNOW-03` — Answer policy questions with accessible source citations

### P1 · EP-CONNECTED · Connect daily operations with controlled AI assistance

- `OPS-01` — Expose authorized operational tools through the existing copilot
- `OPS-02` — Propagate approved absence into scheduling conflict review
- `OPS-03` — Build the Today view and operational exception inbox
- `OPS-04` — Generate a source-linked morning operations briefing
- `OPS-05` — Preview and apply manager-reviewed resolution plans

### P1 · EP-RELEASE · Verify pilot readiness and recoverability

- `REL-01` — Verify complete pilot workflows and critical regressions
- `REL-02` — Complete mobile, accessibility and locale acceptance
- `REL-03` — Verify operational telemetry, restore and data-handling runbooks
- `REL-04` — Review pilot evidence and decide which P2 work to promote

### P2 · EP-SHIFTS · Corely Shifts — coverage and published rosters

- `SHIFT-01` — Validate demand and define a versioned roster model
- `SHIFT-02` — Assign shifts and expose deterministic coverage gaps
- `SHIFT-03` — Publish roster versions and expose approved booking availability
- `SHIFT-04` — Handle open-shift claims and manager-reviewed swaps

### P2 · EP-TIME · Corely Time — integration-first actual time records

- `TIME-01` — Choose the first time-recording use case and integration
- `TIME-02` — Import or record time and support transparent corrections
- `TIME-03` — Review periods and export approved time with traceability

### P2 · EP-EXPENSES · Corely Expenses — employee claims and accountant handoff

- `EXP-01` — Audit and complete employee claim capture
- `EXP-02` — Route claims for review and resolve policy exceptions
- `EXP-03` — Track reimbursement evidence and export claims for bookkeeping
- `EXP-04` — Prepare receipt extraction and duplicate-review suggestions

### P2 · EP-ASSETS · Corely Assets — equipment custody and handovers

- `ASSET-01` — Create the minimal equipment register
- `ASSET-02` — Record assignments, handovers and returns
- `ASSET-03` — Provide warranty/return follow-up and source-linked assistance

### P2 · EP-HELPDESK · Corely Helpdesk — one internal support queue

- `HELP-01` — Validate the support function and deliver ticket intake
- `HELP-02` — Manage queue assignment, replies and resolution history
- `HELP-03` — Add simple response targets and support follow-up
- `HELP-04` — Draft support responses using authorized Knowledge

### P2 · EP-INVOICES · Corely Invoices — bounded customer billing

- `INV-01` — Validate billing scope and close invoice-lifecycle gaps
- `INV-02` — Prepare invoice drafts from approved operational records
- `INV-03` — Track invoice delivery, receivables and reviewed reminders
- `INV-04` — Validate the selected invoice format and accountant handoff

### P2 · EP-BILLS · Corely Bills — supplier documents and payable review

- `BILL-01` — Map existing payables and complete bill intake
- `BILL-02` — Extract bill fields and review duplicate or matching suggestions
- `BILL-03` — Approve bills and track due amounts separately from settlement
- `BILL-04` — Export supplier documents and reconcile handoff corrections

### P2 · EP-BUDGETS · Corely Budgets — advisory spending plans and variance

- `BUD-01` — Define spending basis, source ownership and promotion evidence
- `BUD-02` — Manage budget periods, allocations and auditable versions
- `BUD-03` — Project commitments and actuals from the selected sources
- `BUD-04` — Explain variances and provide advisory spending warnings

## Dependency validation

All 68 feature keys have valid references, and the proposed hard-dependency graph is acyclic. Conditional P2 promotion and alternative source dependencies remain separate from that graph.

Suggested topological order is a planning aid, not a committed sprint schedule. Existing implementation can satisfy a prerequisite without rebuilding it.

STR-01 → PLAT-02 → STR-02 → STR-03 → BUD-01 → KNOW-01 → OPS-01 → PEOPLE-01 → PLAT-01 → STR-04 → BILL-01 → BUD-02 → INV-01 → APT-01 → PEOPLE-02 → PLAT-03 → PLAT-04 → REQ-01 → TASK-01 → ASSET-01 → BILL-02 → BUD-03 → EXP-01 → HELP-01 → INV-03 → TIME-01 → APT-02 → PEOPLE-03 → PEOPLE-04 → REQ-02 → TASK-02 → TASK-03 → TASK-04 → BUD-04 → EXP-04 → HELP-02 → INV-04 → SHIFT-01 → APT-03 → APT-04 → APT-06 → KNOW-02 → OPS-02 → REQ-03 → ASSET-02 → BILL-03 → EXP-02 → HELP-03 → SHIFT-02 → TIME-02 → APT-05 → APT-07 → KNOW-03 → OPS-03 → REL-02 → ASSET-03 → BILL-04 → EXP-03 → INV-02 → SHIFT-03 → TIME-03 → OPS-04 → OPS-05 → REL-03 → HELP-04 → SHIFT-04 → REL-01 → REL-04

## Usage

Give `Corely_P1_P2_GitHub_Project_Prompt.md` to an authenticated coding agent. The prompt is self-contained. The JSON and individual Markdown bodies are convenience copies for reliable reconciliation/import. All GitHub identifiers must be discovered live; null values are intentional.
