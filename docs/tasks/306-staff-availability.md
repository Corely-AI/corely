# 306 — Staff working patterns and availability

- Issue: [#306 / PEOPLE-02](https://github.com/Corely-AI/corely/issues/306).
- Parent: [#283](https://github.com/Corely-AI/corely/issues/283).
- Prerequisite #305 is merged through #373 into `development`.
- Branch: `306-staff-availability`; initial base: `development` at `c4d2241e7`; rebased onto `426954b77`
  after #304 / PR #374 merged. Both pilot publication and staff constraints are preserved.
- Outcome: explicit recurring staff hours, effective dates, IANA timezone and neutral
  dated exceptions constrain linked Booking resources. Future conflicts are flagged;
  commitments are never automatically rewritten or cancelled.

## Ownership and scope

People owns staff patterns in existing extension storage. Booking owns resource
hours/blackouts, reservations, holds and occupancy. Booking intersects neutral
People windows with its own rules; no staff patterns are copied into Booking.
Staff without a Booking resource can maintain patterns. Existing unlinked resources
retain their current behavior; linked staff without a pattern are unavailable.
This does not implement absence requests/reasons, payroll, an approvals engine or
new infrastructure. No database migration.

## Plan and verification

1. Shared validated contracts and deterministic effective-date/DST/overnight rules.
2. Scoped manager use case with optimistic versions, transactional audit/outbox,
   idempotency and Booking resource locks; live future-impact projection.
3. Booking slot and transactional allocation/hold/reschedule checks.
4. Shared People manager UI, EN/DE/VI, responsive interaction evidence.
5. Disposable PostgreSQL integration, domain/UI tests, builds and scoped review.

## Actual verification (7–8 November 2026)

Disposable PostgreSQL 16 cluster on loopback port 55436, databases
`people_test_306` and `openbuk_test_306`; all existing migrations applied using
`prisma migrate deploy`. Suites accept only the explicit test database names;
no shared database reset, production data or real outbound delivery. No migration
is added. The task-owned server is stopped after verification.

| Check                                                                                                                                                                                                                                                                                | Actual result                                                                                                    |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| `PEOPLE_TEST_DATABASE_URL=<owned> OPENBUK_TEST_DATABASE_URL=<owned> pnpm --dir services/api exec vitest run src/modules/people/__tests__ src/modules/booking/__tests__/openbuk.int.test.ts src/modules/booking/__tests__/openbuk-availability.spec.ts --maxWorkers=1 --minWorkers=1` | 57 tests / 6 files passed, no skips: 33 PostgreSQL-backed checks and 24 domain checks                            |
| `pnpm --dir packages/web-features exec vitest run src/modules/people --maxWorkers=1 --minWorkers=1`                                                                                                                                                                                  | 15 tests / 5 files passed, no skips                                                                              |
| `DATABASE_URL=<owned> SKIP_PRISMA_CONNECT=true pnpm --dir services/api exec vitest run src/__tests__/di-smoke.int.test.ts --maxWorkers=1 --minWorkers=1`                                                                                                                             | 10 tests passed; full AppModule instantiates                                                                     |
| `pnpm --filter @corely/api typecheck`, `pnpm --filter @corely/contracts typecheck`                                                                                                                                                                                                   | Passed                                                                                                           |
| `pnpm --filter @corely/contracts build`, `pnpm --filter @corely/api build`, `pnpm --filter @corely/web build`                                                                                                                                                                        | Passed; web retains existing large-chunk warnings                                                                |
| ESLint on all changed TypeScript/TSX                                                                                                                                                                                                                                                 | Passed, zero errors; existing Booking warnings and configured API test exclusions reported                       |
| Installed Prettier on all changed text files; `git diff --check`; local documentation references                                                                                                                                                                                     | Passed                                                                                                           |
| `pnpm --filter @corely/web typecheck`                                                                                                                                                                                                                                                | Blocked by 8 unchanged Assistant/Cash errors, outside this diff                                                  |
| `pnpm arch:check`                                                                                                                                                                                                                                                                    | Existing checker crashes scanning absent historical `services/worker/src`; checker and absent path are unchanged |

After rebasing onto #304, reran the API command above with
`src/modules/workspaces/__tests__/pilot-setup.int.test.ts` and
`src/modules/workspaces/application/use-cases/authorize-workspace.spec.ts` added:
**74 tests / 8 files passed, no skips**, including 11 pilot setup and 6 workspace
authorization cases. Full AppModule DI (10 checks), API typecheck/build, web build
and the rendered browser flow were checked again on this base. Combined with the
15 People UI tests, this is **99 targeted passing tests**. The conflict resolution
keeps both `PilotSetupUseCase.publish` and the neutral People constraint dependency;
the existing pilot fixtures explicitly represent unlinked resources.

Cases include civil-date and UTC effective boundaries, pending timezone replacement,
exclusive expiry/no fallback, DST gap/fold, skipped civil dates, overnight spill,
closed/replacement exceptions and overlaps; manager permissions, two-tenant/three-
workspace scope, strict requests, replay, optimistic races, audit/outbox rollback,
neutral projections, public slots/buffers, public confirmation races and generic
allocation/hold/reschedule enforcement. A changed pattern rejecting a hold leaves
it active; accepted confirmation consumes it atomically. Existing booking records
are compared before/after publication and remain unchanged.

## Rendered UI/UX evidence

Actual administration client `/people/staff/staff-anna`, synthetic manager and
Staff identities, Chrome, desktop 1440×1800 and phone 390×844. Route-mocked
browser verification proves client interactions; PostgreSQL tests separately
exercise real owner integration and HTTP policy. It does not prove deployed JWT
issuance, production providers or a deployed full-stack browser session.

- [Desktop pattern, dated closure and impact](./assets/306/pattern-desktop.png).
- [Phone dates and impact](./assets/306/pattern-mobile.png).
- [Phone exception, precedence and publication](./assets/306/exceptions-mobile.png).
- [Phone failed-save/reload state](./assets/306/stale-mobile.png).

Inspected these captures. Verified empty, loading, denied/error/retry, successful
publication, overnight and dated-closure payloads, impact links, retained stale
draft and reload, keyboard label/focus order, phone overflow, and EN/DE/VI.
Staff receives no manager editor and makes no availability request. Manual flow
has no AI dependency. The installed Playwright CLI wrapper lacked its executable;
verification used the installed Playwright browser runtime and synthetic local
route fixtures in ignored `tmp/306`, with captures in ignored `output/playwright/306`.
The four retained sanitized PNGs above are the review artifacts.

## Review and limits

Self-review corrected a pending-timezone replacement edge case and the existing
hold-consumption ordering that became reachable on staff-rule rejection; both
have persisted regression checks. The ownership and precedence policy is maintained
in [People availability](../backend/people-availability.md). No private absence
reasons or new reservation records are introduced.

The existing generic availability endpoint still has a stub slot generator;
this slice integrates authoritative OpenBuk availability and enforces all covered
Booking writes. Broader repository type/architecture gates remain blocked as
recorded above. Full repository tests, deployment and pilot acceptance are not
claimed. The ticket stays open and its PR remains Draft; no merge or deployment.
