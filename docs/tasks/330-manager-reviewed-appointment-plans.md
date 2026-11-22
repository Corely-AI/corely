# 330 Manager decisions for appointments and customer email

- Issue [#330](https://github.com/Corely-AI/corely/issues/330), parent [#288](https://github.com/Corely-AI/corely/issues/288).
- Branch `330-manager-reviewed-appointment-plans` targets `320-reviewed-appointment-delivery` ([#482](https://github.com/Corely-AI/corely/pull/482), `1e7bc99b`).
- Provides the exact review and apply workflow for [#472](https://github.com/Corely-AI/corely/issues/472) and [#474](https://github.com/Corely-AI/corely/issues/474). This slice handles one appointment replacement and a separately reviewed customer email. Multi-action plans, task changes, and general Copilot integration retain their own backlog scope.

## Decisions

The workspace manager uses the Backoffice review page to approve or reject
the stored details. The approval binds the action to its workspace, immutable
payload, version and 20-minute deadline. The legacy optional-policy gate can
return approval without a human decision. This path uses an affirmative
decision in a workspace-scoped Approvals record.

Booking and Notifications own their effects. On apply, Approvals checks the
acting user's and reviewer's current access. A database savepoint rolls back
an unsuccessful domain action so the outer transaction can record the
failure. A successful application persists its result with the domain effect.
A customer message is created from the confirmed appointment and its guest
contact. It has its own content and decision. Provider failures preserve the
committed booking.

## Verification

- Contracts build, API typecheck and Backoffice typecheck passed.
- PostgreSQL tests exercised scope, digest mismatch, human-only approval,
  denied reviewer, expiry, rejection, stale actions, rollback after an
  injected write failure, deduplicated applies and separate email approval.
- [English desktop](330-assets/appointment-review-desktop.png) and
  [German mobile](330-assets/customer-email-review-mobile.png) captured
  the Backoffice component rendered in Chromium with fixture data. Checked
  keyboard approval, touch rejection, denied loading and mobile overflow.
