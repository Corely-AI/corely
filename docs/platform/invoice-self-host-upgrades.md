# Upgrade a customized Invoices installation

Invoices owns draft finalization. Its versioned domain package exposes
@corely/invoices/extensions and its UI package exposes @corely/invoices-ui.
Install the customer package in the self-host workspace and pin its declared peer
ranges. The operator deploys the existing API and web host together with the exact
Booking or Invoice release records used during verification.

Register an InvoiceFinalizationPolicy by tenant and workspace in
services/api/src/modules/invoices/invoice-extensions.ts. The rule receives the loaded
draft's due date and may return a message to decline finalization. The host retains
ownership of authorization, numbering, tax, and accounting. Acme's example requires
a due date before finalizing an invoice.

Register an InvoiceDraftGuidance component by workspace ID in
packages/invoices-ui/src/index.tsx. The host renders it only on
an existing draft detail screen. The Backoffice and focused Invoice entry points
share the registration. Support the configured locale in the customer component.

## Verify an update

1. Record the current product release and the tested package versions, source
   revision, lockfile and customer extension artifact. Back up the database and
   work in a disposable copy.
2. Run `pnpm app:upgrade-preview docs/testing/fixtures/invoice-upgrade/baseline.json docs/testing/fixtures/invoice-upgrade/candidate.json`
   with plans that identify the candidate packages and migrations. Preserve the
   customer package and resolve any compatibility error before updating.
3. For the provided fixture, start the local API and web host on a new migrated
   database. Disable background delivery and use test provider configuration.
   Set INVOICE_UPGRADE_DISPOSABLE=1, INVOICE_UPGRADE_API_URL and
   INVOICE_UPGRADE_STATE (a private temporary file outside the checkout). Run
   `node docs/testing/fixtures/invoice-upgrade/provision.mjs` once, and use its Acme
   tenant/workspace IDs when registering the [example package](../../packages/tooling/acme-invoice-fixture/).
   The state file contains test credentials. Keep it out of the repository and set
   INVOICE_UPGRADE_WEB_URL to the local web host.
4. Run the preview with --verify. It runs focused backend and browser tests.
   Keep the same database and fixture state, set the candidate domain package
   and app manifest to 1.1.0 and UI package to 1.0.1, rebuild both hosts, and
   repeat verification. The fixture version changes simulate test releases.
   The browser checks existing customer links and finalized records, policy
   rejection and draft guidance in configured and default workspaces.
5. Keep the tested artifacts and previous release available. An incompatible
   extension blocks promotion and can be corrected in the candidate checkout.
   Restore both previous artifacts for code-only recovery. If a future update
   changes stored data incompatibly, prepare and test the database restore or a
   forward repair before the upgrade.

[App ownership and rollout architecture](../architecture/upgradeable-apps.md)
