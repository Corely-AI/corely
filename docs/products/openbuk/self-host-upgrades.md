# Upgrade a customized Booking installation

Keep the source revision, pnpm lockfile, deployment configuration and customer extension
revisions together in each release record. Record the Booking product version and the exact
versions of the Booking, Booking UI and contracts packages. If the contracts workspace uses
the internal version 0.0.0, the source revision and lockfile identify the exact contract build.

## Build with a company rule

Create a private workspace package, export a synchronous NewBookingPolicy from
@corely/booking/extensions and declare the supported @corely/booking version as a peer
dependency. In the self-host checkout, add the customer package as a dependency of the API
and register its policy with the tenant and workspace IDs in
services/api/src/modules/booking/booking-extensions.ts. Use IDs from the operator's workspace
records. The policy receives the selected interval and current time as timestamps. Return
an actionable message to reject the booking or return undefined to allow Corely's normal
checks to proceed. Use deterministic logic and perform side effects through the host.

The OpenBuk receipt component and the optional confirmationFooter slot are exported by
@corely/booking-ui. In the self-host web host, add the customer package as a dependency and
register its React component against the canonical published studio slug in
apps/web/src/modules/openbuk/confirmation-extensions.ts. Review the registration when a slug
changes or is reassigned. Supply user-specific copy and translations in the extension. The
footer renders only on a successful confirmation. See the example [policy][policy] and [UI][ui]
packages. Install from the local workspace and rebuild the API and web host.

For a local customer package already declared as a pnpm workspace, link it with
`pnpm --filter @corely/api add @acme/booking-rules@workspace:*` or
`pnpm --filter @corely/web add @acme/booking-ui@workspace:*` in the self-host checkout.
Register the imported exports with the appropriate scope. For example, the API array may
contain `{ tenantId, workspaceId, validate: acmeBookingPolicy }`, and the web map may
contain `[studioSlug, AcmeConfirmationFooter]`.

A compatible UI bug fix is a patch, an optional prop or slot is a minor release, and a
breaking change to the public component or slot contract is a major release. Use the same
policy for the Booking extension contract. Declare a compatible version range in each
extension. The product release can pair different backend and UI package versions.

## Preview an upgrade

For source edits, recover the original upstream revision and use Git to compare it with the
customized checkout and the candidate upstream revision. Port supported rules and UI changes
to the customer package. Keep remaining changes as reviewed patches in the self-host branch.
Record each patch disposition in the candidate plan. Use review for patches needing a decision.

1. Keep the current source and both deployable artifacts. Back up the database and copy the
   installation to a disposable environment.
2. Inspect the candidate's package versions, migration diff and extension peers. Run
   `pnpm booking:upgrade-preview <baseline.json> <candidate-plan.json>`. The report identifies
   incompatible peer ranges and unresolved local patches. Save this JSON with the exact
   source revision, lockfile and customer artifacts. A pending test means that verification
   still needs to run.
3. Use `--verify` for the Booking pilot when the isolated database and browser fixtures are
   ready. It runs the backend and browser checks and returns a failing status on a failed
   check. Fix incompatibilities in the candidate checkout and repeat the preview.
4. Deploy the same tested API and UI build. If the upgrade is code-only, restore both previous
   artifacts to roll back. If writes or migrations make the previous build incompatible,
   follow the tested forward-repair or coordinated database restore procedure. A restore can
   discard writes made after the backup, so account for those writes before reopening booking.

## Exercise the 1.0 and 1.1 test fixtures

Use the [baseline and candidate descriptors][fixtures] in a disposable checkout. The fixture
versions simulate product releases. For 1.0 build the initial package versions. For 1.1 set
the Booking workspace package and app manifest versions to 1.1.0 and the UI package
version to 1.0.1 in the fixture checkout. Rebuild and restart both hosts after setting the
versions. Keep the Acme packages at 1.0.0 and retain the same database. These fixtures require
no schema migration. To exercise an incompatible update, set the fixture UI version to
2.0.0 and run the preview. It identifies the Acme UI package and its supported 1.x range.

Prepare PostgreSQL using the [OpenBuk test setup](README.md#verification). Set
OPENBUK_TEST_DATABASE_URL to the disposable database, disable background polling and configure
loopback URLs for an API and web host pointed at that database. Use test-only provider
configuration. Set OPENBUK_UPGRADE_DISPOSABLE=1 and OPENBUK_UPGRADE_API_URL to the direct
local API URL before running `node docs/testing/fixtures/booking-upgrade/provision.mjs`.
It creates two studios through the existing API and outputs their tenant IDs, workspace IDs
and published slugs. Register the Acme policy and footer in the fixture checkout using
the Acme IDs and slug. Keep the second studio on the default configuration.

Set OPENBUK_BASE_URL to the local web host, OPENBUK_UPGRADE_ACME_SLUG and
OPENBUK_UPGRADE_DEFAULT_SLUG to the two slugs, OPENBUK_UPGRADE_EARLY_DAY to tomorrow
in UTC and OPENBUK_UPGRADE_ACCEPTED_DAY to a day four or more days away. Start the builds
with those registrations and run the preview with --verify. Use distinct accepted dates
for each run to avoid reusing booked slots. Keep the baseline booking and explicit
minimum notice setting in the database when switching to 1.1. Compare the retained
record and studio setting with the baseline before testing the candidate.

The browser spec captures default and customized receipts at 1280 px and 390 px. It also
submits an early Acme appointment and checks the actionable rejection and absence of
arrival instructions. The PostgreSQL tests independently freeze time to verify the
47-hour and 48-hour boundary and check persistence, outbox and held bookings.

[policy]: ../../../packages/tooling/acme-booking-policy-fixture/src/index.ts
[ui]: ../../../packages/tooling/acme-booking-ui-fixture/src/index.tsx
[fixtures]: ../../testing/fixtures/booking-upgrade/
