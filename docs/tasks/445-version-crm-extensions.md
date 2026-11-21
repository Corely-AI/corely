# 445 Versioned CRM extensions

[Ticket #445](https://github.com/Corely-AI/corely/issues/445) is part of [rollout #440](https://github.com/Corely-AI/corely/issues/440).
The existing CRM feature routes in Backoffice use the shared Deal screen. The loss
action resolves the tenant-owned Deal through CRM's repository and invokes the
policy before updating the Deal or cancelling sequence enrollments. Party stays
the shared customer record owner.

Register customer loss-reason rules by tenant in the API's crm-extensions.ts.
The current Deal record is tenant-owned, so the same policy applies in every
workspace of that tenant. Configure the matching guidance in the Backoffice
crm-ui-extensions.tsx. The shared loss dialog renders the contribution for the
loaded Deal's tenant. The API remains the authority for validation and writes.

The [fixture manifests](../testing/fixtures/crm-upgrade/) record the backend, UI
and API contract versions and the example extension's peer range. Use the common
preview in [#446](https://github.com/Corely-AI/corely/pull/446) to check them before
deploying. Retain the previous API and web build as a pair for recovery. This
change introduces no database migration.

## Verification

The scoped loss tests exercise rejection before writes, valid loss,
preserved Party references, and sequence cancellation.

## Reproduce the upgrade

1. Start the API and Backoffice against a migrated disposable database. Create two
   test tenants with a company workspace each and seed an open Deal referencing an existing Customer.
2. Register a loss-reason check for the Acme tenant and matching guidance in the loss dialog.
   Keep the second tenant on the defaults. Confirm the Acme action is rejected
   with `Crm:DealLossPolicyRejected`. A valid reason allows the action.
3. Keep both datasets and leave the fixture registrations unchanged. Bump the app
   and server package to 1.1.0 and the UI package to 1.0.1. Rebuild, confirm the same
   Deal and Party references, and repeat the actions in the two scopes.
4. Run the shared preview without the Booking-specific `--verify` option. Confirm
   the candidate matches both peer ranges. Set a test copy of the UI revision to
   2.0.0 and confirm the compatibility report rejects it.

The unchanged registrations were exercised on both fixture versions using one
disposable PostgreSQL database. In both API builds the existing record remained
readable, the configured action failed before updating, a valid action succeeded
and the default tenant completed the action without the customer rule.
API and web typechecks passed. The preview accepted the candidate and rejected
UI 2.0.0. Four Playwright checks passed on each version at the following widths.

| Width   | Default                                                               | Configured                                                           |
| ------- | --------------------------------------------------------------------- | -------------------------------------------------------------------- |
| 1280 px | [Default desktop](../platform/evidence/crm-upgrade-standard-1280.jpg) | [Configured desktop](../platform/evidence/crm-upgrade-acme-1280.jpg) |
| 390 px  | [Default mobile](../platform/evidence/crm-upgrade-standard-390.jpg)   | [Configured mobile](../platform/evidence/crm-upgrade-acme-390.jpg)   |
