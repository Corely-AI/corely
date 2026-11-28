# Appointment confirmations and reviewed delivery

Related to [APT-05 / #320](https://github.com/Corely-AI/corely/issues/320).
This branch stacks on [private guest management](https://github.com/Corely-AI/corely/pull/553) and the guarded Booking lifecycle.
Notifications owns the receipt and post-commit delivery. Booking owns the
appointment state, selected service and staff, current guest address, locale
and timezone. Approvals owns the exact message decision.

An approved message is enqueued transactionally with its recipient, reviewed
text and current appointment version. For a reviewed reminder, include an
exact UTC send time before the appointment. A version has one update and
one reminder identity. Reusing either identity requires the exact message.
The outbox payload carries only the workspace and delivery IDs.

The API-hosted worker rechecks the current appointment version and guest
address before sending. An obsolete reminder is marked superseded when
its appointment was rescheduled or cancelled. Delivery is due at its
scheduled time. A provider failure is recorded independently of Booking.
Recovery retries the same provider idempotency key, within five attempts
and the bounded window ending at the earlier of one hour from the send
time and the appointment start. Accepted means a provider handed back
a message ID.

The reviewed workflow obtains wording, locale, timezone and recipient from
an affirmative approval and current Booking data. A manual reminder keeps
its own exact approval, time and version checks.

Public OpenBuk checkout offers a voluntary booking-confirmation checkbox
that starts unchecked. Booking records affirmative opt-in with the
confirmation snapshot, then the API outbox handles the committed creation
event. Notifications reads the current scoped appointment and recipient,
formats the message in the persisted checkout locale and timezone, and
enqueues one confirmation per booking. The creation and delivery event
payloads contain identifiers and state only. Delivery rechecks the pending
message before claiming it and keeps the same provider identity on retries.
Older requests, unchecked choices, manager bookings, and imports stay
silent. Cancellation releases the slot without scheduling an email.

## Verification

Run the API’s `appointment-delivery.int.test.ts` and
`openbuk-reviewed-change.int.test.ts` against a disposable `openbuk_test_*`
PostgreSQL database. An isolated sink verifies the confirmed booking event,
opt-in, recipient, locale/timezone, provider failure, retry and replay. It
also covers exact reviewed content, reminder scheduling and invalidation.
The guest and team Playwright scenarios check keyboard opt-in and the
omitted optional preference when the checkbox stays unchecked.

- [Checkout at 390 × 844](assets/320/confirmation-opt-in-mobile.png)
- [Checkout at 1280 × 800](assets/320/confirmation-opt-in-desktop.png)
