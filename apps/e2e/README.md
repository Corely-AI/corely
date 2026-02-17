# E2E (Playwright)

- Run all E2E tests: `pnpm --filter apps/e2e e2e`
- Run only CRM tests: `pnpm --filter apps/e2e e2e tests/crm.spec.ts`
- Run only CRM tests in Chromium: `pnpm --filter apps/e2e e2e --project=chromium tests/crm.spec.ts`
