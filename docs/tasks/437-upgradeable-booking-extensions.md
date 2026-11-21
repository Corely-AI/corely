# 437 Upgradeable Booking extensions

[Issue #437](https://github.com/Corely-AI/corely/issues/437). Branch
437-upgradeable-booking-extensions targets development. Related work includes issues
#301 and #400. Booking is the concrete extraction and upgrade pilot.

Booking owns reservations, holds and availability. The API still resolves scope and
runs the existing writes. The new Booking workspace package supplies pure availability
and extension logic. The UI package supplies the public receipt and an optional footer.
The customer fixture registers both extensions to one published workspace. No migration
is required by this change.

## Verified

- Frozen offline workspace install and Booking dependency builds.
- 37 focused Vitest tests against a disposable PostgreSQL database, including OpenBuk
  time boundaries, held staff bookings, idempotency, outbox behavior and retained data.
- Four real-browser cases passed on the 1.0 fixture and again on the 1.1 fixture.
  The existing Acme reservations and explicit 60-minute studio setting were checked
  before creating new bookings on the candidate.
- The candidate preview reported Booking 1.1.0 and Booking UI 1.0.1 with the same
  1.0.0 customer packages. It rejected independent backend and UI 2.0.0 fixtures and
  identified the affected peer ranges.
- The existing signup-to-studio browser test timed out after signup in the local
  environment. The new browser fixtures use the API to provision studios and cover
  the guest booking and rejection paths. Direct HTTP coverage of legacy public
  confirm variations remains separate from the shared backend policy tests.
- The repository architecture checker reports existing Prisma placement violations.

## Browser evidence

The guest route is /openbuk/book/:studioSlug. Candidate captures show the original
English receipt and customer arrival instructions. Browser assertions also check that a
rejected booking shows the rule message and does not render the success footer.

| Viewport | Default                                                                          | Acme                                                                       |
| -------- | -------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| 1280 px  | [Default desktop](../products/openbuk/evidence/booking-upgrade-default-1280.jpg) | [Acme desktop](../products/openbuk/evidence/booking-upgrade-acme-1280.jpg) |
| 390 px   | [Default mobile](../products/openbuk/evidence/booking-upgrade-default-390.jpg)   | [Acme mobile](../products/openbuk/evidence/booking-upgrade-acme-390.jpg)   |

The [operator guide](../products/openbuk/self-host-upgrades.md) documents local extension
registration, version and compatibility checks, source-edit migration and recovery.
