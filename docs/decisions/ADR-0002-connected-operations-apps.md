# ADR-0002: Connected internal-operations apps

## Context

2026-11-07. Corely’s ERP/freelancer-first primary positioning suggests a broad
suite adoption requirement. Existing code already spans booking/OpenBuk, finance,
CRM, POS, public content and verticals on a modular monolith. A product catalog
must not be confused with this implementation inventory or a delivery commitment.

## Decision

Adopt the [connected-app positioning](../products/corely/README.md): Corely is a
collection of connected, AI-native apps for running a team’s internal operations.
Teams start with needed capabilities and expand into finance/specialists as work
demands. Finance is optional; accounting is not an operational prerequisite.

Retain modular-monolith ownership, hexagonal boundaries, shared contracts,
existing manifests/enablement/entitlements/permissions, shared UI, transactional
outbox/idempotency/audit requirements, API-hosted background execution and the
three-tier persistence policy. Product app, domain module, surface and customer
package are distinct. No schema-per-app or subscription-per-app decision is made.

Recommend validating one package with Schedule, Team and Daily Work, composing
parts of Tasks, People, Appointments, Requests and a small Knowledge layer. This
supersedes interpreting the direction as five complete independent app launches.
The 32-app catalog is a long-term map, not implementation authorization.

## Alternatives considered

1. Keep ERP-first positioning: familiar domain breadth but a larger perceived
   adoption burden and less focus on one operational outcome.
2. Launch five complete independent apps: clearer individual labels but expands
   scope and coordination cost before customer demand is demonstrated.
3. Create independently deployed services/schemas/frontends for every catalog app:
   strong packaging separation but duplicates infrastructure and conflicts with
   existing reuse/persistence rules without evidence of need.
4. Focus one connected operational package on the retained foundation: selected
   for validation while preserving financial/vertical investment.

## Consequences and tradeoffs

- Customers can approach an operational outcome rather than a whole ERP catalog.
  Optional-finance behavior needs a dependency/default audit; prose does not
  change runtime enablement or existing deterministic accounting integrations.
- Reuse Booking/OpenBuk and its public journey. Choose replacement or one verified
  complementary integration before a pilot; each has adoption/reliability costs.
- Capability composition can improve focus but requires explicit record ownership,
  privacy boundaries and cross-app freshness/revalidation. Menu visibility never
  substitutes for backend authorization.
- Missing employee-oriented slices need scoped design; workflow Tasks, CRM
  activities, parties, auth users and bookable resources cannot simply be renamed.
- AI proposes/explains; deterministic logic validates, authorized users approve
  sensitive actions, and existing configured deterministic automations keep policy.
- Existing finance, CRM, POS and vertical code remains maintained even if broader
  new investment is deferred. Deferral is separate from implementation status.

## Non-goals

No code rewrite, feature removal, new orchestration layer, 32-app scaffolding,
route/schema/table renames, license/commercial-term changes or storage-policy
changes. No commitment to segment, geography, prices or new delivery dates.
No autonomous employment decisions, ranking/scores, lending, bank-detail changes
or fund release in the proposed launch. No blanket compliance guarantee.

## Open validation questions

Is Germany-first beauty/wellness with roughly 5–30 staff and one to three locations
a useful segment? Will teams switch booking or adopt an integrated companion?
Which booking essentials and staff/privacy rules matter? What can be measured
against baseline, what will customers pay, which channels work and what support
cost is sustainable? What specialist review and reliability evidence are required?
These remain hypotheses; see [launch gates](../products/corely/launch-plan.md).

## Evidence and scope

[Repository alignment](../products/corely/repository-alignment.md) records commit,
inspection limits, current owners, discrepancies and engineering follow-ups.
This ADR records product framing, retained architecture and recommendations;
it does not declare missing features implemented or specialist decisions approved.
