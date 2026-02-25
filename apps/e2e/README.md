# E2E (Playwright)

- Run all E2E tests: `pnpm --filter apps/e2e e2e`
- Run POS E2E suite: `pnpm --filter @corely/e2e e2e:pos`
- Run only CRM tests: `pnpm --filter apps/e2e e2e tests/crm.spec.ts`
- Run only CRM tests in Chromium: `pnpm --filter apps/e2e e2e --project=chromium tests/crm.spec.ts`
- Run Classes Cohort Academy v1.1 suite: `pnpm --filter @corely/e2e e2e tests/classes/*.spec.ts`
- Run a single Classes scenario (Chromium): `pnpm --filter @corely/e2e e2e --project=chromium tests/classes/programs-and-cohorts.spec.ts`
- Run Directory API/worker/seed E2E suite: `pnpm --filter @corely/e2e e2e --project=chromium tests/directory/**/*.e2e.spec.ts`

## Directory E2E prerequisites

- API must be reachable at `API_URL` (default `http://localhost:3000`).
- Database migrations must already include Directory tables (`content.DirectoryRestaurant`, `content.DirectoryLead`).
- Test harness secret defaults to `test-secret-key` and can be overridden via `TEST_HARNESS_SECRET`.
- Worker tick tests call `pnpm --filter @corely/worker start:tick` with `WORKER_TICK_RUNNERS=outbox`.
