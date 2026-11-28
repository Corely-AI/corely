# 318 OpenBuk agenda and reviewed appointment lifecycle

- Issue [#318](https://github.com/Corely-AI/corely/issues/318), parent [#286](https://github.com/Corely-AI/corely/issues/286).
- Branch `318-openbuk-studio-agenda` targets the #317 follow-up. The Booking work from [#480](https://github.com/Corely-AI/corely/pull/480) was ported onto the current Booking records and team eligibility. The operational shell is tracked in [#303](https://github.com/Corely-AI/corely/issues/303).
- Studio owners and admins can review appointments and available times by day or week. Creation uses the same active service and staff rules as public checkout. The move review describes the current and proposed time and keeps the existing staff member, offering and buffers. Cancellation frees the time and leaves the cancelled record visible.
- Studio intake stores a guest contact snapshot on the booking. Any CRM Party association requires a separate explicit selection in the Booking workflow. The agenda returns the booking name without customer email or account history. Multi-resource internal reservations remain managed through the Booking module.
- Reviewed moves remain available to the workflows tracked in [#330](https://github.com/Corely-AI/corely/issues/330) and [#472](https://github.com/Corely-AI/corely/issues/472).

## Verification

- Use `pnpm --dir services/api exec vitest run --config vitest.openbuk.config.ts --maxWorkers=1 --minWorkers=1` with a disposable `OPENBUK_TEST_DATABASE_URL` to verify the Booking and OpenBuk adapters. The reviewed replacement suite covers manager and workspace checks, read-only preview, a competing public reservation, stale versions and a successful commit.
- Use `pnpm --dir apps/e2e exec playwright test --config playwright.openbuk.config.ts studio-agenda.e2e.spec.ts` with the local web and API. The scenario creates, moves and cancels an appointment, verifies a competing checkout leaves the manager’s draft intact, and exercises keyboard and mobile controls.
