# E2E (Playwright)

- Run all E2E tests: `pnpm --filter apps/e2e e2e`
- Run POS E2E suite: `pnpm --filter @corely/e2e e2e:pos`
- Run only CRM tests: `pnpm --filter apps/e2e e2e tests/crm.spec.ts`
- Run only CRM tests in Chromium: `pnpm --filter apps/e2e e2e --project=chromium tests/crm.spec.ts`
- Run Classes Cohort Academy v1.1 suite: `pnpm --filter @corely/e2e e2e tests/classes/*.spec.ts`
- Run a single Classes scenario (Chromium): `pnpm --filter @corely/e2e e2e --project=chromium tests/classes/programs-and-cohorts.spec.ts`
- Run Directory API/background/seed E2E suite: `pnpm --filter @corely/e2e e2e --project=chromium tests/directory/**/*.e2e.spec.ts`

## Directory E2E prerequisites

- API must be reachable at `API_URL` (default `http://localhost:3000`).
- Database migrations must already include Directory tables (`content.DirectoryRestaurant`, `content.DirectoryLead`).
- Test harness secret defaults to `test-secret-key` and can be overridden via `TEST_HARNESS_SECRET`.
- Background job tests call `POST /internal/background/outbox/run` on the API.

## Restaurant E2E actor credentials

The restaurant Phase 1 API E2E suite does not use fixed restaurant logins. It seeds restaurant actors per test run in [restaurant-fixtures.ts](/Users/hadoan/Documents/GitHub/Kerniflow/apps/e2e/tests/helpers/restaurant-fixtures.ts).

- Seed owner email pattern: `e2e-test-<timestamp>-<rand>@corely.local`
- Restaurant cashier email pattern: `<seed-owner-prefix>+restaurant-cashier-<nonce>@corely.local`
- Restaurant manager email pattern: `<seed-owner-prefix>+restaurant-manager-<nonce>@corely.local`
- Shared E2E password for all of the above: `E2ETestPassword123!`

Notes:

- The email addresses are generated dynamically per test run. Do not rely on a fixed restaurant username.
- The shared password comes from [testData.ts](/Users/hadoan/Documents/GitHub/Kerniflow/apps/e2e/utils/testData.ts).
- The bootstrap seed owner is not a restaurant role; it is the tenant owner used to create the restaurant cashier and manager actors.
