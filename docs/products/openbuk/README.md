# OpenBuk

Open-source booking for salons & studios. A focused product/client on the Corely platform,
reusing the existing Booking owner.

## Product direction alignment — 2026-11-07

Corely’s [connected-app strategy](../corely/README.md) focuses on internal operations
with optional finance. OpenBuk is existing implementation to reuse when assessing
Appointments and the proposed Schedule experience; public booking may be necessary
for adoption. Preserve this public journey, the language requirements below, and
the existing shared Booking records. Do not create another booking domain.

The [launch proposal](../corely/launch-plan.md) recommends one package with Schedule,
Team and Daily Work; it does not authorize five complete app launches. Choosing
Corely/OpenBuk as authoritative booking or complementing one existing system through
a verified integration remains an adoption decision. Do not promise both models or
duplicate manual schedules. The [repository alignment](../corely/repository-alignment.md)
separates implementation evidence from priority and readiness.

The implementation details, release gates and **2026-10-04** verification below
are retained as historical evidence, not fresh tests from this documentation task.
The historical architecture-check failure must be reverified before treating it as
current. This alignment changes no code, licensing, deployment or free/paid policy.

[Screenshot walkthrough](screenshots.md) · captured 2026-10-04; retained historical evidence.

## Repository findings and implementation plan

The repository already owns booking in `services/api/src/modules/booking`, contracts in
`packages/contracts/src/booking`, and seven booking models in the `commerce` bucket.
Reuse these; do not create another booking bounded context or database.

| Capability                            | Existing owner / integration                                                  |
| ------------------------------------- | ----------------------------------------------------------------------------- |
| Identity, sessions                    | Identity `/auth/*`, `@corely/auth-client`                                     |
| Studios, membership, slug publication | Workspaces application API and public workspace resolver                      |
| Customer master                       | Party / CRM (guest contact snapshots already exist on Booking)                |
| Bookable services                     | Existing BookingServiceOffering; catalog enrichment must use Catalog's API    |
| Staff, schedules, blocks              | BookingResource and BookingAvailabilityRule                                   |
| Payments / product pricing            | Billing productKey and billing plans; no second entitlement/billing engine    |
| Notifications                         | Notifications + API-hosted background runtime (there is no standalone worker) |
| Transactions, audit, events           | UnitOfWorkPort, AuditPort, OutboxPort from kernel/data                        |
| Frontend primitives                   | `@corely/ui`, shared contracts and auth client; no ERP screen imports         |

## First increment

Add `apps/openbuk-web` with marketing `/`, branded `/login` and `/signup`, studio
setup and operations under `/app`, and public `/book/:studioSlug`. The first slice
supports one location, one service and one staff member, recurring hours, blocked
periods, buffers, authoritative availability and guest booking visible in the admin.
The app is deliberately independent of Corely navigation. Marketing, authentication,
studio administration and public booking support English, Deutsch and Tiếng Việt.
The language selector persists the visitor's choice. Studios can set any of these
three languages as their public booking default; an explicit visitor choice takes
precedence. Dates, times and prices use the selected locale. Service and staff names
remain the studio's own content.

Add strict contracts, deterministic availability logic, application use cases and a
workspace-scoped repository inside the existing Booking module. Small studio settings
use Booking-owned `ext.kv` (`workspace:<id>`, `openbuk-studio`). Existing Booking tables
remain the source of truth for services, staff, rules and appointments. No migration
or new customer, identity, catalog or payment tables are required for this increment.

Public API: `/w/:studioSlug/public/openbuk/{studio,availability,bookings}`. Corely's
public resolver supplies the tenant and workspace; client tenant IDs are never used.
Admin API: `/openbuk/studio`, `/openbuk/bookings`. Membership is checked by Workspaces;
only owners/admins can configure the studio. A persisted studio registration represents
opt-in to this free initial product, not a paid entitlement. The `openbuk` product key and initial free plan are registered in the existing Billing
catalog; paid plans and subscription enforcement remain later work.

Booking confirmation acquires the same transaction advisory resource lock as existing
Booking writes, reloads the schedule, checks active holds and allocations, derives the
end and price, then commits appointment, receipt/idempotency, audit and `booking.created`
outbox event together. Reusing a key with a changed payload is rejected. No email call
is made in the transaction. Public receipts contain no tenant/workspace identifiers. Corely’s legacy public booking
endpoints reject registered OpenBuk studios, including inactive ones, so older checkout
paths cannot bypass the OpenBuk availability policy.

## Pilot setup

[Resumable pilot setup](../../platform/pilot-setup.md) adds private saved checkpoints,
atomic explicit publication and manually shared member invitation links in this client.
It preserves Booking ownership and normal Identity accounts. No invitation email is sent;
member accounts do not yet gain employee self-service or bookable-resource associations.

## Next increments / release gates

The [Corely pilot adoption decision](../corely/pilot-booking-decision.md) selects
OpenBuk replacement and this client's existing staff surface. It defines import,
authority and cutover/recovery gates; it does not implement the missing team,
lifecycle or migration capabilities or establish pilot readiness.

This is the first vertical slice, not the complete production MVP. Next: Catalog-linked
service editing, multiple staff and service capabilities, add-ons and physical resources,
Party customer resolution/history, full lifecycle and day/week calendar, secure revocable
management tokens, notification/reminder consumers, and Billing-backed deposits.
Do not advertise those capabilities as implemented. An outbox event alone does not mean
an email was delivered. Public endpoints have a bounded per-process rate limit and still need distributed abuse controls before
public deployment. The initial browser and PostgreSQL acceptance checks below pass; wider accessibility,
load and security review remain release gates.

## Deployment

Run `pnpm dev:openbuk` with the existing Corely API. Configure `VITE_API_URL` (default
`/api`), `VITE_OPENBUK_APP_URL` and `VITE_OPENBUK_BOOKING_URL`. The Vite dev proxy
forwards `/api` to the existing API at localhost:3000; `OPENBUK_API_PROXY_TARGET`
can select an isolated test API instead.

One static frontend build can serve all three domains. The app recognizes configured
app/booking hosts: `/` on the app host maps to `/app`; `/:slug` on the booking host maps
to `/book/:slug`. Configure SPA rewrites to index.html, TLS, API CORS and auth origins.
Marketing HTML includes crawlable initial copy and metadata. No DNS or deployment is
changed by this implementation. Custom domains remain a later Workspaces integration.

## Verification

Verified on 2026-10-04:

- API and OpenBuk strict TypeScript checks and frontend production build.
- 21 focused tests: DST gaps/folds, fractional timezones, buffers/blocks/effective dates,
  input validation, Workspace membership, real PostgreSQL same-slot races (including
  the existing Corely writer), idempotent retries, tenant/workspace isolation, atomic
  rollback and legacy public-route exclusion.
- One full Playwright acceptance scenario using real APIs: signup, studio publication,
  anonymous mobile booking, replay of the same request, legacy-route exclusion and
  persisted appointment visibility after reloading the studio.
- Desktop and mobile visual inspection, including German copy.

From the repository root:

```sh
pnpm --filter @corely/api typecheck
pnpm --filter @corely/openbuk-web typecheck
pnpm --filter @corely/openbuk-web build
pnpm --dir services/api exec vitest run --config vitest.openbuk.config.ts --maxWorkers=1 --minWorkers=1
pnpm --dir apps/e2e exec playwright test --config playwright.openbuk.config.ts
```

The PostgreSQL suite only runs when `OPENBUK_TEST_DATABASE_URL` explicitly points to a
prepared disposable database named `openbuk_test_*`; otherwise those tests are skipped.
Prepare it with the repository's Prisma schema in `packages/data/prisma/schema`.
Never point these tests or the browser acceptance flow at a real customer environment.
The browser suite requires OpenBuk on localhost:8091 and its API connected to that
isolated database. Use `OPENBUK_BASE_URL` for a different frontend URL and
`OPENBUK_BROWSER_CHANNEL=chrome` to use an installed Chrome. Disable background
outbound delivery for isolated acceptance (`OUTBOX_DISPATCH_DRIVER=disabled`,
`JOB_SCHEDULER_DRIVER=noop`, `WORKER_DISABLE_POLLING=true`).

`pnpm arch:check` currently fails in the existing checker while reading the removed
`services/worker/src` directory. It does not reach the architecture assertions; this
is an outstanding repository tooling issue rather than a successful architecture check.
