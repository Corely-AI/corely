# 443 Versioned Customers extensions

[Ticket #443](https://github.com/Corely-AI/corely/issues/443) is part of [rollout #440](https://github.com/Corely-AI/corely/issues/440).

The Customers app continues to use the Party module and runtime ID `parties`. Backoffice
uses the existing Customers editor. Party records are still shared with CRM and Invoices.
The rule uses authenticated tenant and workspace IDs and runs before ID allocation or
persistence. It receives the customer kind and organization name. Supplier, student and
guardian creation continue through their existing behavior.

Install the customer-owned package with peer ranges for `@corely/customers` and
`@corely/customers-ui`. In the self-host API, register the policy in
`services/api/src/modules/party/customer-extensions.ts`. Register the React guidance
in the web host's `customer-ui-extensions.ts` for the same workspace. The editor passes
the existing organization fields through the normal Customers API.

Record the tested package, contracts and customer extension versions with each release.
Use the application preview introduced in [#446](https://github.com/Corely-AI/corely/pull/446)
with the two package manifests and the customer extension manifest. A 2.0.0 package
requires the customer to update its 1.x peer range and verify the new contract. Retain
the previous API and web artifacts. This slice uses the existing Party schema, so
recovery is a coordinated code rollback.

## Reproduce the upgrade

1. Start the API and web host on a migrated disposable database. Disable background
   polling and use test provider configuration. Set CUSTOMER_UPGRADE_DISPOSABLE=1,
   CUSTOMER_UPGRADE_API_URL, and CUSTOMER_UPGRADE_STATE to a private temporary path.
   Run the [fixture provisioner](../testing/fixtures/customer-upgrade/provision.mjs).
2. In the fixture API registration, use the Acme tenant and workspace IDs. Return
   “Enter the registered organization name.” when kind is ORGANIZATION and the
   trimmed organization name is empty. Register a UI component that renders the
   same text for that workspace. The default workspace uses the empty registries.
3. Run `pnpm --dir apps/e2e exec playwright test --config playwright.customer-upgrade.config.ts`
   with CUSTOMER_UPGRADE_WEB_URL set to the local web host. Keep the database and
   customer extension while bumping the candidate backend package and app manifest
   to 1.1.0 and the UI package to 1.0.1, then rebuild and repeat.
4. Pass the [release manifests](../testing/fixtures/customer-upgrade/) to the app
   compatibility preview. To exercise a breaking change, set the UI package to
   2.0.0 in the fixture checkout and verify that it reports the 1.x peer range.

## Verification

- 8 Customer use-case and controller tests passed. The cases cover rejection before
  Party creation, successful organization creation, another workspace and Suppliers.
- Four browser cases passed on each of the 1.0 and 1.1 fixture builds. The same
  persisted customer IDs and organization names remained readable. The new
  guidance appeared only for the configured workspace at 1280 and 390 pixels.
- The common preview from #446 accepted the compatible package versions and
  rejected UI 2.0.0 with the fixture peer range.
- The fixture verifies existing Customer records directly. It does not create a
  synthetic CRM deal and invoice referencing each record.

| Viewport | Default                                                                   | Configured                                                                |
| -------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| 1280 px  | [Default desktop](../platform/evidence/customer-upgrade-default-1280.jpg) | [Configured desktop](../platform/evidence/customer-upgrade-acme-1280.jpg) |
| 390 px   | [Default mobile](../platform/evidence/customer-upgrade-default-390.jpg)   | [Configured mobile](../platform/evidence/customer-upgrade-acme-390.jpg)   |
