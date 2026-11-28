# 319 OpenBuk guest management

- Issue [#319](https://github.com/Corely-AI/corely/issues/319), parent [#286](https://github.com/Corely-AI/corely/issues/286).
- Branch `319-openbuk-guest-management` targets the OpenBuk agenda, which already shares the selected-staff slot engine with public checkout. Prerequisite #299 is complete and #317 is in the stack.

A confirmed public checkout returns a private link for that appointment. The
credential is opaque and scoped to the server-resolved studio. Booking stores a
digest with the appointment and expiry. It keeps the raw token in the URL
fragment and HTTPS POST body so request paths and referrers omit it. Responses
are non-cacheable and expose the appointment’s public reference, service, staff,
times and review version. Manager intake and historical bookings remain usable
through their existing workflows.

Guest changes check the existing appointment, eligible staff, current policy,
chosen slot and Booking transaction locks. A successful cancellation revokes the
link and returns the same result for an exact retry before expiry. New requests
using an invalid, expired, revoked or other-studio credential share one error.

The configured API signing secret must contain at least 32 characters to issue
new management links. Checkout can continue without the link when that setting
is absent. Existing links validate against stored digests. Secret rotation can
prevent reissuing a link for a past checkout retry. Links expire at the original
appointment start or after 90 days, whichever comes first.

## Verification

- Contracts and API build, API and web typecheck passed.
- 21 targeted OpenBuk tests passed, including digest-only storage, expiry, studio scope, replay and revocation, and the current PostgreSQL booking/availability checks.
- The Playwright guest scenario passed with a local web/API and disposable `openbuk_test_p1_319` PostgreSQL database. It covers public checkout, isolated details, move, cancel and exact cancellation replay. The test screenshots use English at 390 × 844 with reduced motion.
- [Guest appointment details](assets/319/guest-management-mobile.png) and [explicit cancellation](assets/319/guest-cancel-mobile.png).
