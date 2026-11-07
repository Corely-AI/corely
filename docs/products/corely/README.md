# Corely product strategy

Direction recorded 2026-11-07. This defines product intent, not delivered
capabilities. See [repository alignment](repository-alignment.md), the long-term
[catalog](app-catalog.md), and the focused [launch proposal](launch-plan.md).

## Positioning

Corely is a collection of connected, AI-native apps for running a team’s
internal operations. Teams start with the capabilities they need and expand
into finance and specialist operations as their work demands.

Customers buy an operational outcome; apps are how we organize capabilities.
Internal operations come first. Connected apps replace an ERP-first buying
experience while retaining the existing modular monolith. Finance is optional;
accounting is not a prerequisite for using operational apps.

Internal-first does not mean internal-only. Public booking may be essential for
adoption; preserve the existing public booking journey.

## Direction, recommendations, and open questions

| Category                                                  | Statement                                                                                                                                                              |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Agreed direction for documentation and future scoped work | Internal operations first; connected apps; optional finance; preserve modular monolith and existing domains; expand on customer evidence.                              |
| Recommendation to validate                                | One operational package with Schedule, Team, and Daily Work; Knowledge as a small approved content layer.                                                              |
| Audience hypothesis                                       | Germany-first beauty/wellness teams with approximately 5–30 staff and one to three locations. No customer evidence supplied establishes this segment or geography.     |
| Open adoption decision                                    | Replace booking with Corely/OpenBuk, or complement an existing system through one verified integration. Neither model is broadly promised.                             |
| Unvalidated commercial questions                          | Pricing, acquisition channels, willingness to pay/switch, support cost, and product-market fit. No approved prices or per-app subscription terms are established here. |

Segment numbers are hypotheses, not market statistics. Base.vn is inspiration
for connected applications, not a specification to copy or evidence that other
products lack AI or integrated workflows. No new competitor, legal, or market
research was performed for this alignment.

## Problems to validate

- Can managers see today’s bookings and staffing constraints without reconciling
  several conflicting views?
- Does recurring preparation, closing, and follow-up work have clear ownership?
- Are pending decisions visible and resolved with less chasing?
- Can absence changes expose operational impact without disclosing private reasons?
- Can teams adopt alongside or instead of their current booking workflow without
  duplicate manual schedule maintenance?

These are interview and pilot questions, not observed customer demand.

## Shared vocabulary

| Concept          | Meaning and consequence                                                                                                                                                      |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Platform         | Shared identity, tenant/workspace context, authorization, documents, notifications, audit, integrations, background execution, and AI infrastructure. Reuse existing owners. |
| Product app      | Recognizable capability such as Tasks, People, or Expenses; no necessary one-to-one mapping to modules.                                                                      |
| Domain module    | Implementation boundary owning business rules and records; existing ownership takes precedence over marketing labels.                                                        |
| Surface          | Deployed client or entry point under `apps/*`; many apps may share a surface.                                                                                                |
| Customer package | Focused offering composed of capabilities; does not automatically create a service, database, or subscription for every app.                                                 |

See [architecture and ownership](../../architecture/connected-apps.md). The 32
catalog IDs are discussion order, neither runtime identifiers nor delivery order.
The catalog is not a claim of availability or authorization to build all apps.

## Focused initial package

Proposed promise: **“Keep today’s appointments, staffing, and follow-up work
coordinated in one place.”** This is a hypothesis to test.

| Experience | Proposed outcome                                                   | Capability contributors                       |
| ---------- | ------------------------------------------------------------------ | --------------------------------------------- |
| Schedule   | Today’s appointments, availability, and conflicts                  | Appointments, reusing Booking                 |
| Team       | Staff information, working patterns, narrow absence/approval flows | People and Requests                           |
| Daily Work | Recurring checklists, assigned follow-up, pending decisions        | Tasks and Requests, linked approved Knowledge |

This supersedes any interpretation that five complete independent apps must
launch together. Compose parts of several apps without implementing full catalog
profiles. Booking exists; employee Tasks and People/absence ownership were not
found in reviewed scope. Implementation needs separately scoped engineering work.

## Optional finance and retained capabilities

Finance is the umbrella. Accounting means bookkeeping and financial records;
Financing means administration of funding and borrowing. Preserve existing
accounting, expenses, purchasing, invoices, tax, cash-management, billing, and
payment-related code. Defer broad new specialist commitments until justified;
deferral does not mean missing, deletion, or stopping maintenance.

SaaS subscription billing is separate from customers’ invoices and bills.
Payment-method configuration is not a complete Payments app. Cash-management
records are not cash-flow forecasting. CRM, POS, websites/CMS, classes, rentals,
and other verticals remain intact without becoming launch priorities.

## Relationship with OpenBuk

OpenBuk is the existing booking-oriented product/client on Corely. Assess it for
the initial package, reusing Booking rather than creating another Appointments
domain. [OpenBuk’s implementation note](../openbuk/README.md) records the first
one-location/service/staff slice, English/German/Vietnamese support, historical
verification and release gates. Its focused client, Corely admin booking, and
legacy public booking coexist; registered OpenBuk studios use the OpenBuk public
policy. Preserve these journeys and do not infer that the broader package exists.

## Non-goals and expansion

No 32-app rewrite, service/database per app, automatic per-app billing, broad
workflow designer, full HR/payroll, or new orchestration layer is authorized.
No autonomous employment decisions, candidate ranking, employee productivity
scores, lending decisions, bank-detail changes, or fund release belong in the
proposed launch. Specialist review is needed for applicable privacy, employment,
accounting/tax, payments, and AI regulation; no compliance guarantee is made.

Expand only after repeated team use, improvement against an agreed workflow
baseline, willingness to pay, feasible adoption, manageable support cost, and
reliability/security evidence. Shifts is a conditional leading candidate when
coverage problems recur. Operational finance, Assets, Helpdesk, and other apps
follow actual need and available implementation, not catalog order.

## Open-source and commercial boundaries

The open-source direction remains. Root [package metadata](../../../package.json)
declares AGPL-3.0-only; [LICENSE](../../../LICENSE) contains AGPL v3 text.
[Licensing notes](../../devops/licensing.md) describe the community/EE boundary;
[ee/README.md](../../../ee/README.md) is a separate commercial-distribution
placeholder. OSS must not import EE directly. Commercial contacts/terms contain
placeholders; this strategy approves no license change, pricing, or new terms.
