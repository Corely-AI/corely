# #509 Incoming invoice email

## Tracking and outcome

- [#509](https://github.com/Corely-AI/corely/issues/509) under [#357](https://github.com/Corely-AI/corely/issues/357).
- Branch `509-incoming-invoice-email` from `development` at `5f39de1f1`.
- The implementation request covered this intake slice on 27 November 2026. The broader Bills promotion remains tracked in [#334](https://github.com/Corely-AI/corely/issues/334).
- Workspace admins control a receiving address. Each usable forwarded file creates a vendor-bill draft. Reviewers fill in missing data and use the existing bill actions.

## Reuse

Purchasing owns the vendor bill, supplier query, and status changes. Documents owns the staged original and registers private metadata in the same transaction as the draft. Workspaces resolves the recipient to its real tenant. The workspace enablement switch uses Purchasing's scoped extension storage. Legacy bills retain their tenant-wide scope and existing wire fields.

## Verification

- Prisma Client generated and both migrations applied in a disposable local `corely_509_test` database.
- `pnpm --dir services/api exec vitest run src/modules/purchasing/__tests__/invoice-email.int.test.ts` with `INVOICE_EMAIL_TEST_DATABASE_URL` set to that database. One integration test passed. The signed-delivery fixture exercised mixed attachments, duplicate delivery, partial retry, workspace isolation, disablement, original access and draft approval. Resend download and object storage were faked.
- Configuration, contracts, API and web typechecks passed. Scoped ESLint returned zero errors. The architecture checker returned the same violations on the base and working tree.

## UI evidence

Chrome verified the English Backoffice screens at 1440 × 900 and 390 × 844 with route-mocked data. The browser test enabled, copied and disabled the forwarding address, checked denied settings, opened an original, and saved and approved one of two drafts.

- [Workspace settings](509-assets/workspace-settings.webp)
- [Draft review](509-assets/draft-review.webp)
- [Approved bill on phone](509-assets/approved-phone.webp)

## Activation

See [provider setup](../backend/incoming-invoice-email.md). Live inbound delivery requires a receiving domain, webhook credentials and private object storage. No remote service or DNS configuration was changed.
