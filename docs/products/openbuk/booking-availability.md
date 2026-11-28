# Booking availability and write consistency

OpenBuk offers times inside the resource rule's effective hours in the studio
timezone. It intersects those hours with linked staff working patterns, dated
exceptions and approved neutral absence blocks. An unlinked legacy resource
keeps its Booking rules. The offering must be active and the resource must
still meet its eligibility. Service duration and buffers must fit the resulting
window. Active holds and live allocations then remove overlapping times.
Overlap is half-open. An interval ending at the candidate's start is adjacent,
and a hold expiring at the check time stops blocking. Public checkout validates
the selected time again under the resource lock.

Schedule writes reuse tenant and resource advisory locks. A move retains the
original allocation roles and buffers, checks active holds and other bookings,
and rechecks authoritative linked staff availability before updating. Cancellation
and rescheduling serialize on the same booking lock. Booking creation and hold
consumption, and a move's booking and changed allocations, commit with their
audit, outbox and new idempotency receipts in the same transaction. Availability
rule edits take the same resource lock and commit with their audit entry. An
availability rule for a workspace-owned resource is editable and readable only
in that workspace. Legacy tenant-wide resources keep their existing scope.

New legacy booking and hold create receipt keys are scoped to tenant and workspace. Reschedule
receipts are scoped to tenant and booking. The same key and payload returns the
result captured at commit. Changing the payload returns a conflict. Historical
create receipts continue to replay in their original workspace. Their stored
format contains no request fingerprint. A newly created hold and its receipt
commit together, so simultaneous retries of the same request reserve time once.

The OpenBuk public slot calculation and internal reservation intake have
different rules. The internal intake continues to accept explicit intervals
through the booking API. It checks resource scope, linked staff availability
and conflicts. Reviewed appointment management uses the studio's slot rules
for a customer replacement and has separate acceptance under
[#318](https://github.com/Corely-AI/corely/issues/318).
