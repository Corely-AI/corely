# 320 Delivery of a reviewed appointment email

- Issue [#320](https://github.com/Corely-AI/corely/issues/320), parent [#286](https://github.com/Corely-AI/corely/issues/286).
- Branch `320-reviewed-appointment-delivery` targets `327-approved-absence-booking-impact` ([#481](https://github.com/Corely-AI/corely/pull/481), `32265121`).
- Supplies the delivery path for [#330](https://github.com/Corely-AI/corely/issues/330) and [#474](https://github.com/Corely-AI/corely/issues/474). Applies to one reviewed guest email for a confirmed appointment version. Guest management and broader automatic confirmation and reminder policies stay in their own scope.

## Implementation

Notifications owns a workspace-scoped receipt for each appointment version.
Queueing records the exact approved content and writes a redacted outbox
event. The API-hosted worker rechecks the current booking and recipient
before attempting to send. The provider call happens after commit.

Delivery records expose pending, provider accepted, failed and superseded.
Recovery uses the same provider idempotency key. The five-attempt limit and
one-hour ceiling also apply to manual retries. The appointment start can
end that window earlier. This is within the
[Resend idempotency period](https://resend.com/docs/dashboard/emails/idempotency-keys).
Provider acceptance records the provider handoff.

## Verification

- The transaction tests use PostgreSQL and an isolated email sink. The sink
  records a send before losing its first response, then returns the same
  receipt after recovery. Tests also cover stale booking and expired work.
- Backend-only changes. The human review and CLI views use the status in
  dependent tickets.
