# Focused operational launch proposal

2026-11-07 · Recommendation for validation, not a release commitment.
Read [strategy](README.md), [repository evidence](repository-alignment.md),
and [AI target policy](../../ai/ai-copilot.md).

## One package, three experiences

Hypothesis: **“Keep today’s appointments, staffing, and follow-up work coordinated
in one place.”** Proposed audience: Germany-first beauty/wellness teams with
approximately 5–30 staff across one to three locations. Geography, size, demand,
and willingness to adopt remain unvalidated.

| Experience | Smallest useful scope                                                                                            | Excluded from this proposal                                                               |
| ---------- | ---------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Schedule   | Today’s agenda, resource availability, conflicts, booking detail and existing public booking where needed        | A second booking owner; broad marketplace or every booking-provider integration           |
| Team       | Staff directory, authorized working patterns, narrow absence submission/decision and neutral availability effect | Payroll, comprehensive HR, medical reasons in operational views, full roster optimization |
| Daily Work | Recurring checklists, assigned follow-up, pending decisions, links to approved instructions                      | Full project management, universal form/workflow designers, collaborative wiki            |

Tasks, People, Appointments, and Requests supply parts of these experiences.
Knowledge starts as links, attachments, or simple approved pages. This explicitly
supersedes the interpretation that five complete independent apps must launch
together. The package is an outcome and scope boundary, not five deployments or
subscriptions. This document implements no package code.

Finance, CRM, POS, tax, classes, rentals, and existing verticals remain maintained
but are not required for adoption. Accounting must not be a prerequisite. Existing
defaults/dependencies require an audit before claiming every current configuration
already meets that target.

## Adoption and system of record

[STR-03's decision](pilot-booking-decision.md) selects **Corely/OpenBuk replacement**
and the existing OpenBuk `/app` staff surface. A controlled one-time import is the
selected path for existing future bookings; provider sync is out of implementation
scope. The record defines authority, source constraints, cutover/recovery and a
synthetic review. No real team migration or pilot readiness is established.

| Option                                           | Authority                                                                                                | Evidence required                                                                                                                                                                 |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Corely/OpenBuk replaces booking               | Booking is authoritative for reservations and occupancy; map staff to resources explicitly               | Migration/reconciliation, pilot-critical booking essentials, public journey, cancellation/rescheduling, notification policy, conflict/concurrency handling, recovery and rollback |
| 2. Corely complements an existing booking system | Chosen provider is authoritative for defined booking fields; Corely owns only agreed operational records | One verified integration: source IDs and ownership, freshness timestamps, permitted writes, conflict handling, retries, outages, reconciliation, revocation and recovery          |

Do not endorse duplicate manual schedule maintenance. The table retains the
alternatives considered; only replacement is selected. Qualify a pilot team's
actual export, freeze/write authority and migration feasibility before cutover.
If replacement is infeasible, record a revised decision before implementing a
provider connection. Preserve the existing public booking journey.

## Reference workflows (illustrative targets)

Neither scenario is validated customer demand. Connections and event names below
are illustrative unless identified as code evidence in the alignment.

### A. Normal daily operation

1. An authorized employee/manager opens today’s agenda with source and freshness.
2. They complete assigned opening/closing checklists and consult approved guides.
3. A manager assigns follow-up work with an owner and due time.
4. Authorized decision-makers resolve pending requests; the owning business
   domain validates and applies the corresponding state change.
5. The daily view shows current work and decisions, with manual controls available
   when AI is unavailable. An AI digest is a proposal with source links.

Booking CRUD/public flow exists; a unified daily view and employee checklist/
decision journey are targets, not delivered features.

### B. Absence exception

1. An employee submits a narrow absence request in a private personnel context.
2. An authorized approver decides; People records the approved operational
   availability effect without disclosing the reason to unrelated viewers.
3. Schedule and Daily Work expose affected bookings and work. Illustrative
   `people.absence-approved` and availability-change connections could trigger
   impact review; these events were not found as implemented.
4. AI proposes changes and communication drafts using permission-filtered context.
5. An authorized manager reviews each proposed booking/work change and message.
   Booking/Tasks revalidate current ownership, availability and permissions before
   application. Stale proposals must be rejected or refreshed.
6. Audit results and retry safely. No automatic cancellations, reassignment, or
   messages in this proposed AI-assisted absence flow.

Outside private personnel contexts share neutral **“unavailable”** information.
Do not expose absence reasons through prompts, search, notifications, or logs.
Existing explicitly configured deterministic automations retain their actual
policies; this proposed workflow does not disable them.

## Evidence-led phases

All counts/thresholds below are proposals, not observed results, validated targets,
or delivery dates.

| Phase             | Work                                                                                                                                             | Decision gate                                                                                                                                    |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Discover          | Proposed 6–10 manager/staff interviews in one candidate segment; observe a normal day and absence exception, including teams unwilling to switch | Repeated concrete problem, workflow baseline, adoption objections, existing systems and privacy constraints recorded                             |
| Select adoption   | Choose replace or complement for proposed 2–3 pilot teams; test migration or one integration                                                     | Feasible authority, freshness, permissions, conflict/recovery behavior; no duplicate schedule entry                                              |
| Scope and prepare | Define minimum booking essentials, staff/absence data, checklists and decisions; assess existing owners/safeguards                               | Separately reviewed engineering slices, critical scenario tests and security/reliability evidence; no catalog-wide scaffolding                   |
| Pilot             | Proposed 4–6 weeks after readiness, with manual workflows and support logging                                                                    | Proposed use on at least 3 operating days/week by managers and staff; compare coordination time, missed follow-ups and review effort to baseline |
| Decide            | Interview users again, test willingness to pay for the outcome, review support and incidents                                                     | Agree thresholds before measurement; expand, narrow, change segment/adoption, or stop based on evidence                                          |

Record consent, recruitment bias, unsuccessful adoption, and negative findings.
No interviews, usage, prices, or product-market-fit evidence are claimed today.

## AI evaluation and release gates

Evaluate completed work, review effort, correction rates, time saved, and
prevention of unauthorized actions against manual baselines. Include normal/
absence cases, stale data, concurrent changes, denied access, cross-tenant/
workspace requests, injected document instructions, and private personnel data.
Proposed hard gate: no unauthorized action or private-data leak in the agreed
evaluation set; this is not proof of universal safety.

Before a pilot, require evidence for:

- Tenant/workspace isolation, per-operation authorization, restricted personnel
  access and trusted public-workspace resolution.
- Deterministic availability/conflict checks, including concurrency, time zones
  and daylight-saving changes, revalidation and stale-source handling.
- Transactional state/outbox behavior, idempotency, retries, duplicate delivery,
  recovery, backup/restore and traceable audit results.
- Migration/integration reconciliation, outage behavior, source freshness,
  monitoring, support escalation and rollback.
- Public booking essentials and consent/communication behavior where applicable.
- Useful manual paths and visible failures when AI or integrations are down.
- Specialist review of applicable privacy, employment, accessibility, booking,
  messaging and AI-regulation obligations; no blanket compliance claim.

These are gates to verify, not claims that current controls are audited. No
environment-dependent tests or migrations were run for this prose alignment.

## Expansion gate

Require repeated team usage, improvement against baseline, willingness to pay,
feasible adoption, sustainable support costs and reliability/security evidence.
Shifts is a leading conditional candidate only if recurring coverage needs emerge.
Operational finance, Assets, Helpdesk and other capabilities follow demonstrated
problems and reusable implementation. Catalog order does not establish priority;
existing financial code remains maintained.
