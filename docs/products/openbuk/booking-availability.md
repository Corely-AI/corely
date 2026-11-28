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
and conflicts.

For a single-staff OpenBuk appointment, the manager's replacement preview
uses the same studio slot rules and excludes the appointment's own
allocation from the occupancy check. It returns the old and proposed times,
the resource, timezone and the booking's version. The preview does not
reserve the time. The internal apply operation checks the exact preview
again under the workspace, booking and resource locks before it writes.
The shared review workflow owns the human decision and replay record.

## Studio agenda

Studio owners and admins can view appointments and the selected staff member’s
available booking times by day or week. Studio dates use the studio timezone.
Available times identify the selected eligible staff member and their timezone.
The agenda keeps completed and cancelled bookings visible.

The manager selects an eligible service and staff member before taking a new
booking for a guest. The guest name and email are stored on that booking.
Any CRM Party association requires a separate explicit selection in the Booking
workflow. Agenda reads return the booking name while keeping customer email and
party history private.

Moving a future confirmed OpenBuk appointment shows the original and proposed
time before confirmation. Booking locks the resources and rechecks the original
version and the selected time. If the time is taken, the form reloads the
available options and preserves the draft. Cancellation requires a separate
confirmation and releases the time while preserving the appointment record.

## Guest management

Guests who confirm through the public OpenBuk page can save a private link to
their appointment. Links expire at the original appointment start or after 90
days. Cancellation revokes the link. The management view shows the booking
reference and appointment details. Booking keeps customer contact and workspace
records private.

When the original staff member and service still support the appointment’s
duration and buffers, a guest can choose another time. The move revalidates
availability and policy under the same Booking locks. Guest cancellation checks
the same booking policy and confirmation version before releasing the time.

Guests can choose to receive a confirmation email at checkout. The
optional checkbox starts unchecked. Booking commits the preference with
the appointment, and Notifications handles the message after the commit
using the recorded checkout language and timezone. Reviewed reminders use
their own approval and appointment version.
