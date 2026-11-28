# OpenBuk private booking import

Related to [APT-06 / #321](https://github.com/Corely-AI/corely/issues/321) and the
[replacement decision](../products/corely/pilot-booking-decision.md). The
import prepares future reservations for a privately configured OpenBuk workspace.
Use the selected provider's authorized export and its explicit stable identifiers.
The synthetic fixture establishes the Corely path. A pilot-specific source and
cutover have yet to be qualified.

## Operator contract

Configure the Booking studio, active service and staff roster privately. Public
booking must remain closed. Use an active workspace owner or admin session,
sending the current workspace header. Use the authenticated OpenBuk API.

1. Normalize an authorized source export into batches of up to 20 rows. Include
   the source namespace, export timestamp and SHA-256 of the original export,
   the source IANA timezone and explicit maps of source service and staff IDs to
   existing target IDs. Names are display values and do not map identities.
2. POST the batch to `/openbuk/import/preview`. Each confirmed row specifies an
   explicit offset timestamp for start and end, price/currency and the minimum
   existing customer name and email. Each cancelled row supplies its stable
   source ID and cancelled status. An explicit offset disambiguates a repeated
   hour. A nonexistent time, inconsistent offset or unavailable target interval
   produces a row error.
3. Check all row codes, exact target IDs, timestamps and price against the
   export. Correct and preview again if any row has an error. Confirm freeze
   of the source writers with the approving manager.
4. POST to `/openbuk/import/apply` with the exact batch, the returned `preview`
   digest and `sourceWritesFrozen: true`. Corely rechecks private publication,
   scope, current schedule, buffers, holds, staff availability and booking
   policies under the existing Booking locks. A batch with any row error has
   `applied: false` and leaves its records unchanged.
5. Reconcile all source IDs, counts, returned Booking IDs and schedules. A
   repeated unchanged row returns its established result. Changed source rows
   need explicit reconciliation. A cancelled source row is recorded in the
   import ledger and creates no occupancy. History, deposits, unsupported
   mappings and non-bookable times require an explicit reconciliation decision.

Existing Booking records and allocations own the resulting occupancy. A
workspace-scoped import receipt binds each source ID to its exact normalized
row and result. Audit and the Booking event carry source identity and no
customer contact. The historical import is flagged as `openbuk-import` so
live communication policies can exclude it. The import path has no customer
sender and does not publish the workspace.

Keep the run manifest and export in the authorized private workflow. Store
identifiers, approved cutover time, operator, receipt and reconciliation counts.
The companion connector is outside the selected pilot mode. Actual source
format, commercial history, a provider-side freeze and production cutover
remain dependent on participant and operator evidence.
