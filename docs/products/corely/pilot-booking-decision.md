# Pilot booking authority and staff surface

7 November 2026 · [STR-03 / #299](https://github.com/Corely-AI/corely/issues/299),
under [EP-STRATEGY / #281](https://github.com/Corely-AI/corely/issues/281).
Prerequisite: [STR-01 / #298](https://github.com/Corely-AI/corely/issues/298),
integrated through [PR #365](https://github.com/Corely-AI/corely/pull/365).

## Decision and status

**Select replacement: Corely/OpenBuk replaces the pilot's booking system.**
The maintainer selected this mode during issue delivery on 7 November 2026.
Select the existing **`apps/openbuk-web`** client as the initial staff surface:
`/app` for the daily appointment list, `/app/calendar` for its date-selected view,
and `/app/settings` for studio configuration. Keep `/book/:studioSlug` as the
guest journey. The two staff agenda routes currently render the same list;
neither is evidence of a full day/week calendar.

This is the engineering/adoption direction for dependent work, not a customer
commitment or permission to migrate, publish, send messages or start a pilot.
No pilot team, previous provider, real export or production environment has
been supplied. Adoption feasibility for a particular team remains unverified.
The existing slice has one location, one service and one staff resource. A
5–30-person audience remains a hypothesis; this decision does not redefine it
as a validated single-person market or claim a team-ready product.

Choose replacement because Booking already owns occupancy and OpenBuk already
has the public-to-staff journey. No verified provider connection is available in
the reviewed scope. Complementary sync, bidirectional provider writes, provider
discovery, a new frontend and a second booking owner are out of implementation
scope. Reconsider this decision explicitly if a recruited team cannot switch;
do not quietly introduce dual authority or build both adoption paths.

## Authority and identities

| Record / operation                    | Before cutover                                              | After cutover and constraint                                                                                                                                                      |
| ------------------------------------- | ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Reservations, lifecycle and occupancy | Previous system is the sole live writer                     | Booking records, allocations and active holds are authoritative. All writes use Booking use cases; no direct import writes to tables.                                             |
| Services and bookable staff           | Previous system's stable IDs, captured in the migration map | Existing BookingServiceOffering / BookingResource, explicitly mapped within the target tenant/workspace. A name match never establishes identity.                                 |
| Hours, buffers, blocks, timezone      | Exported and reconciled with the manager                    | Existing BookingAvailabilityRule plus Booking-owned OpenBuk settings. Resolve overlaps before publishing.                                                                         |
| Customer contact                      | Authorized minimum source export                            | Preserve necessary booking contact snapshots; reuse Party for customer identity where needed. Do not create another customer master or infer identity from a display name.        |
| Employees and login accounts          | Existing personnel and identity owners                      | An employee, an auth account and a BookingResource remain distinct. An approved employee-to-resource link is future work under APT-01, not implicit in `staffName`.               |
| Staff operations                      | Previous system until the authority switch                  | OpenBuk `/app` is the selected destination. Today's appointment list currently requires owner/admin authority; employee self-service and lifecycle controls remain delivery work. |
| Public bookings                       | Previous public entry point until freeze                    | Existing OpenBuk guest journey resolves the workspace on the server. Never route registered OpenBuk studios through legacy checkout as a fallback.                                |

Corely administration under `apps/web` retains its existing Booking screens and
records. It is not selected as the pilot team's second daily schedule, and its
legacy writers must pass the same workspace, permission and availability gates
before any operational use. Selecting OpenBuk does not authorize importing its
private screens into another app. Future Team/Daily Work composition reuses
public package exports and the existing platform; it does not create new surfaces.
Finance/accounting is not an adoption requirement; effective app dependencies
and entitlements still need the checks in PLAT-01.

## Inspected implementation and actual constraints

Reviewed `development` at **`4ed3292a2c556cff9d13b2cb6c85672be48fb2f3`**, 7 November
2026, on ticket branch `299-pilot-booking-authority`. This is static inspection;
existing test assertions are evidence of coverage intent, not fresh test results.

| Evidence                                                                                                                                                                                                                                                                             | What it establishes / limits                                                                                                                                                                                                                |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [OpenBuk routes](../../../apps/openbuk-web/src/app/app.tsx), [staff screen](../../../apps/openbuk-web/src/modules/studio/studio-page.tsx)                                                                                                                                            | Existing staff/public entry points; appointments load on day change or reload. No polling, last-successful-fetch timestamp or offline write queue is established by this screen. Its “live” page indicator is not a freshness guarantee.    |
| [Setup contract](../../../packages/contracts/src/booking/openbuk.schema.ts), [setup form](../../../apps/openbuk-web/src/modules/studio/setup-form.tsx)                                                                                                                               | One service and one `staffName`; timezone, currency, weekly hours, blocks, buffers and booking horizon. Saving the current form publishes the workspace; it is unsuitable for private migration staging without a separately verified gate. |
| [OpenBuk use cases](../../../services/api/src/modules/booking/application/use-cases/openbuk-studio.usecase.ts), [HTTP adapter](../../../services/api/src/modules/booking/http/openbuk.controller.ts)                                                                                 | Workspace authorization, owner/admin appointment access, public module checks, locked availability revalidation and transactional receipt/audit/outbox. Admin endpoints expose setup and list, not an import or guest-management API.       |
| [Repository adapter](../../../services/api/src/modules/booking/infrastructure/adapters/prisma-openbuk-repository.adapter.ts), [Booking models](../../../packages/data/prisma/schema/83_booking.prisma)                                                                               | Reuses Booking tables and Booking-owned `ext.kv`. OpenBuk refuses offerings with deposits, non-staff resources or unmet required tags. No import identity/reconciliation mechanism was found in these paths.                                |
| [Guest screen](../../../apps/openbuk-web/src/modules/booking/booking-page.tsx), [public API client](../../../apps/openbuk-web/src/shared/api.ts)                                                                                                                                     | Slot selection, consent, receipt and retry key reuse; slot conflict triggers refresh. EN/DE/VI are retained. A receipt/outbox event does not establish email delivery.                                                                      |
| [Corely booking routes](../../../apps/web/src/app/router/booking-routes.tsx), [legacy booking contract](../../../packages/contracts/src/booking/create-booking.schema.ts)                                                                                                            | Existing CRUD/lifecycle is reusable ownership, not proof of safe OpenBuk lifecycle or an importer. The create contract has no source-system/source-ID import field.                                                                         |
| [Browser scenario](../../../apps/e2e/tests/openbuk/openbuk.e2e.spec.ts), [PostgreSQL scenarios](../../../services/api/src/modules/booking/__tests__/openbuk.int.test.ts), [availability scenarios](../../../services/api/src/modules/booking/__tests__/openbuk-availability.spec.ts) | Existing assertions cover signup/setup, guest booking, replay, legacy exclusion, persisted staff visibility, races, rollback, isolation and DST. Not run for this documentation change.                                                     |

Searches of Booking contracts/use cases/adapters and the two booking UIs found
no CSV/ICS importer or booking-provider calendar sync. This is a scoped absence
finding, not a claim about every integration in Corely. No provider API access,
export availability, credential scope, rate limit, cancellation propagation,
historical-data entitlement or reversible provider freeze has been verified.
Those facts must come from the selected team's actual source. A calendar feed
or screenshots alone must not be assumed to preserve customers, cancellations,
stable identity or all occupied time.

## Selected migration and cutover path

Select a **controlled one-time import**, with preview and reconciliation, for a
team that has existing future appointments. Implementation belongs to
[APT-06 / #321](https://github.com/Corely-AI/corely/issues/321), not this decision.
An empty schedule can avoid import only after an explicit team-specific decision
and evidence that no future bookings/holds are being left behind; it is not the
default assumption. Do not copy a live schedule by hand into two systems.

1. **Qualify the source.** Record the team's consent/authority to export, source
   system/version, accessible format and fields, stable IDs, timezone semantics,
   booking horizon, update/cancellation behavior, pending holds, unsupported
   deposits/resources and ability to disable every old write channel. Record a
   cutover operator and approving manager by role until actual people are known.
   Missing export access or an inability to freeze old writes blocks cutover.
2. **Map and preview privately.** A future importer must show row-level errors
   and an immutable run manifest: target tenant/workspace, source namespace,
   export time/hash, source booking/service/resource IDs, explicit target IDs,
   timestamp/offset/timezone, status, contact minimum and reconciliation result.
   Stable identity is `(target tenant, workspace, source namespace, source ID)`;
   identical replays must not create a booking or send a message again. Changed
   source rows need explicit revision review. Do not overload a guest receipt
   key or a display name as source identity. Choose storage through existing
   Booking ports/extension policy in APT-06; this record adds no schema.
3. **Resolve every exception.** Reject ambiguous/nonexistent local times and
   missing mappings. Include buffers, blocks, active holds and all occupied time
   across the full future booking horizon. Record cancellations separately from
   active occupancy; reconcile completed/history and deposits explicitly with
   the team. Do not silently truncate to one visible day or reprice historical
   bookings using today's service price. Private personnel reasons are excluded.
4. **Rehearse without public writes.** Use synthetic data and a disposable
   environment first, with outbound delivery disabled. Real staging needs a
   verified publication/write gate: the current Save & Publish form alone is
   insufficient. Demonstrate retry, changed-row handling, cross-workspace
   rejection, conflicting allocations and atomic failure through owning use
   cases. No bypass of locks, audit or outbox is acceptable for import.
5. **Freeze, reconcile, then switch.** At an agreed instant, stop all old writes
   (public, staff and integrations), record the final export/watermark and keep
   Corely public writes closed. Apply the final previewed run; reconcile stable
   IDs, counts/statuses, times, staff/service mappings and allocation intervals,
   with zero unresolved or silently discarded rows. Confirm backup/recovery and
   staff/public acceptance. Only then approve Corely as sole writer and replace
   public links. Keep the old system read-only; redirect or close old entry
   points. Never open both booking systems for the same resource/time horizon.
6. **Operate and reconcile.** Staff use OpenBuk and reload after a change or
   uncertain response. The current agenda has no freshness timestamp; a failed
   fetch must not be treated as an empty/free schedule. No offline confirmations
   or secondary schedule are allowed. During an outage pause confirmations;
   retain a minimal private incident log of unconfirmed enquiries and reconcile
   it through Booking after recovery. AI is not required for manual operation.

Import must not replay historical customer notifications. The import delivery
must distinguish migration effects from live events and verify existing
deterministic notification policies. Before launch agree how live confirmations,
reminders, cancellations and consent work, and demonstrate delivery where
promised. This issue sends no messages or changes automation policies.

### Abort and recovery

Before the authority switch, any mapping/conflict/access/publication failure
keeps the previous system authoritative. Clean up or roll back the isolated run
using its manifest through Booking; verify no public booking or notification was
created, then reopen old writes only after confirming Corely remains closed.

After the switch, **do not simply restore the old export or reopen the old
system**. First freeze Corely writes, identify every post-cutover create/change/
cancellation using the cutover watermark and audit trail, and reconcile those
effects into the chosen recovery authority. Verify recovery/restore, occupancy
and customer communication with the approving manager before opening exactly
one writer. If reverse transfer is unproven, keep confirmations paused and
recover Corely. No automatic fallback to legacy public endpoints or bidirectional
sync is selected. This is a required recovery design; no restore drill is claimed.

## Synthetic adoption walkthrough — reviewed outcome

Tabletop review performed on 7 November 2026 against the inspected contracts,
screens and use cases. No importer, database, browser or provider was exercised.
All identities below are synthetic, scoped to workspace `studio-a` in tenant
`tenant-a`, source namespace `old-schedule-demo`. An authorized manager operates
the destination; employee self-service is deliberately not assumed.

Use Monday **9 November 2026**, `Europe/Berlin` (UTC+01:00), service `svc-a`,
resource `staff-a`, 45-minute appointments and a 10-minute trailing buffer.
Explicitly map source service `s1` and resource `r1` to those existing targets.

| Source row / case       | Input                                          | Required preview/reconciliation result                                                                 | Observed feasibility                                                                                      |
| ----------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| `a101`                  | Confirmed, 09:00–09:45, `s1/r1`                | One booking at 08:00–08:45Z; occupancy through 08:55Z                                                  | Representable in existing Booking/OpenBuk records; import path absent.                                    |
| `a101` identical replay | Same identity and payload                      | Same target ID; no extra allocation/event/message                                                      | Existing guest retry is not proof of import replay; APT-06 must implement it.                             |
| `a102`                  | Confirmed, 10:00–10:45, `s1/r1`                | One booking at 09:00–09:45Z; occupancy through 09:55Z                                                  | Representable; source snapshot must reconcile with `a101` and active holds.                               |
| `a103`                  | Cancelled, 11:00–11:45                         | Accounted for as cancelled/excluded from active import, with explicit disposition; no active occupancy | Guest create always confirms; do not replay this as a public booking.                                     |
| `a104`                  | Confirmed, 09:30–10:15, `s1/r1`                | Row conflict with `a101`; block cutover until source correction and new preview                        | Locked availability exists, but no import conflict preview exists.                                        |
| `a105`                  | Local 28 March 2027 02:30, no offset, `s1/r1`  | Reject nonexistent Berlin DST time; obtain a corrected source instant                                  | Existing public contract accepts UTC instants; importer must resolve source local time before conversion. |
| `a106`                  | Confirmed, 12:00–12:45, resource `r2` unmapped | Reject; obtain approved mapping and multi-staff support if this is a second employee                   | Current OpenBuk setup cannot configure a second staff resource.                                           |

Seven rows contain six distinct source IDs: two eligible bookings, one identical
duplicate, one cancelled disposition and three blocking exceptions. Expected
preview is **two eligible bookings and three blocking exceptions**; no unresolved
reservation may be dropped to make counts match. The final import count depends
on corrected source rows and the manager's explicit dispositions. Replaying the
two eligible rows must preserve their target IDs. These are reviewed expectations,
not executed import results.

After a successful rehearsal/cutover, a guest uses `/book/:studioSlug`, sees the
service/staff, timezone and price, selects an unoccupied slot and receives one
receipt. Reloading `/app` on the same studio day must show that persisted
appointment; no staff re-entry is needed. A repeated confirmation must return
the same receipt; a competing booking must refresh availability. The existing browser
scenario covers much of this one-staff journey, but was not rerun here.

Review result: replacement preserves a single owner and existing entry points,
but this sample is **NO-GO for live cutover**: the importer is absent, three rows
need resolution, publication staging needs a gate, and lifecycle/team/recovery
acceptance remains outstanding. This concrete failure is a constraint to resolve,
not evidence of a functioning migration or a successful customer pilot.

## Dependent scope and gates

These decisions narrow existing tickets; they do not implement or close them.
Unresolved source/team facts block the affected delivery or cutover, while
backlog creation and independent discovery can continue.

| Existing work                                                    | Consequence of this decision                                                                                                                                                                            |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [PLAT-01 / #301](https://github.com/Corely-AI/corely/issues/301) | Compose the focused package on the selected existing OpenBuk staff surface, with optional finance and actual enablement/entitlement checks. No new frontend or private cross-app screen imports.        |
| [PLAT-04 / #304](https://github.com/Corely-AI/corely/issues/304) | Resume setup/invitations without duplicate identities; verify locale/timezone, authorized publication and an explicit unpublished staging state before cutover.                                         |
| [APT-01 / #316](https://github.com/Corely-AI/corely/issues/316)  | Extend shared Booking services/resources and explicit employee links for a real team; the initial single-staff screen does not satisfy team acceptance.                                                 |
| [APT-02 / #317](https://github.com/Corely-AI/corely/issues/317)  | Verify all Booking writers, neutral availability, workspace authority, holds, locks, buffers, DST and atomic state/events. Do not generalize OpenBuk safeguards to legacy CRUD.                         |
| [APT-03 / #318](https://github.com/Corely-AI/corely/issues/318)  | Complete staff lifecycle/calendar operations on shared Booking; cancellation/rescheduling must revalidate current authority and occupancy.                                                              |
| [APT-04 / #319](https://github.com/Corely-AI/corely/issues/319)  | Preserve OpenBuk creation and EN/DE/VI; complete scoped, revocable guest management. No fallback through legacy checkout.                                                                               |
| [APT-05 / #320](https://github.com/Corely-AI/corely/issues/320)  | Verify promised notification delivery, consent and replay behavior. A queued event alone is insufficient.                                                                                               |
| [APT-06 / #321](https://github.com/Corely-AI/corely/issues/321)  | Implement the selected controlled import only after real export/mapping facts are available; preview, stable identities, row errors and failed-cutover recovery. Provider sync criteria are unselected. |
| [STR-04 / #300](https://github.com/Corely-AI/corely/issues/300)  | Recruit/qualify a team, agree evidence and baseline, obtain export/freeze authority and review cutover/recovery results before pilot entry. Do not interpret this decision as pilot acceptance.         |

Pilot entry also requires demonstrated role/tenant/workspace isolation, useful
manual/error paths, current freshness behavior, public abuse protection,
accessibility/locales and a recovery drill under the existing
[launch gates](launch-plan.md#ai-evaluation-and-release-gates). Those are delivery
and operational checks, not new work bundled into STR-03. No runtime, schema,
deployment, data migration or customer communication changes are made here.
