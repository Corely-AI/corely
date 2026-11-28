# 316 OpenBuk team and services

- Issue [#316](https://github.com/Corely-AI/corely/issues/316), parent [#286](https://github.com/Corely-AI/corely/issues/286).
- Prerequisites [#298](https://github.com/Corely-AI/corely/issues/298), [#299](https://github.com/Corely-AI/corely/issues/299) and [#305](https://github.com/Corely-AI/corely/issues/305) are complete.
- Branch `316-openbuk-team-services`, based on `development` at `87563c122`.

## Ownership and scope

OpenBuk settings use Booking offerings, staff resources and availability rules.
Eligibility and receipts are Booking-owned workspace extension records. People
continues to own employee profiles and explicit links to resources. The existing
first-service setup and guest routes remain valid. Catalog enrichment and
individual staff scheduling use their existing owning boundaries.

The workspace lock serializes roster edits with public checkout. New direct
bookings and hold creation acquire a service lock after their resource locks so
they cannot use an archived offering. A roster edit checks owner/admin authority
and its revision, then commits Booking changes, audit and an outbox event together.

The manager can turn off new bookings and review upcoming appointments in the
schedule. OpenBuk saves service, staff and price details with new bookings so a
later roster change cannot rewrite the confirmed details. Appointments created
before these snapshots keep their prior Booking record projection.

See the [OpenBuk product guide](../products/openbuk/README.md#small-team-booking).

## Verification

| Check                                                                                                      | Result                                                                                                                                                                                                                                            |
| ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm build:api`                                                                                           | Passed.                                                                                                                                                                                                                                           |
| `pnpm --filter @corely/api typecheck` and `pnpm --filter @corely/web typecheck`                            | Passed.                                                                                                                                                                                                                                           |
| `pnpm --dir services/api exec vitest run --config vitest.openbuk.config.ts --maxWorkers=1 --minWorkers=1`  | 39 tests passed. PostgreSQL suite used the disposable local `openbuk_test_p1_316` database. Covers the existing single-staff path, tenant/workspace isolation, exclusive availability, write replay, rollback and historical appointment details. |
| `pnpm --dir apps/e2e exec playwright test --config playwright.openbuk.config.ts team-services.e2e.spec.ts` | Passed with the local API and PostgreSQL. Verified invalid staff selection, saved eligibility, anonymous booking access, no guest access to team settings, archive and persistence in the schedule.                                               |
| OpenBuk locale key coverage                                                                                | All ten catalogs include the new keys.                                                                                                                                                                                                            |
| Repository-wide architecture and locale checks                                                             | Existing architecture violations in unchanged files and missing keys in unrelated shared catalogs.                                                                                                                                                |

The existing fresh-signup browser scenario reaches Backoffice’s workspace
onboarding redirect before OpenBuk setup can render. The team scenario starts an
authorized synthetic studio through the existing pilot API before opening
Settings. The release needs no schema migration.

## UI evidence

- [Manager eligibility settings](assets/316/team-settings-desktop.png) and
  [archived offering with a commitment](assets/316/archived-service-desktop.png),
  Backoffice studio settings, desktop Chrome at 1280 × 720, English.
- [Guest service selection](assets/316/guest-service-mobile.png), public
  OpenBuk, Chrome at 390 × 844, English, reduced motion. The browser check
  verified the selected staff and that the page fit the viewport.
