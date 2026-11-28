# Issue 353 Invoice lifecycle

## Tracking and outcome

- [Issue #353](https://github.com/Corely-AI/corely/issues/353) under
  [Invoices #295](https://github.com/Corely-AI/corely/issues/295).
  [#298](https://github.com/Corely-AI/corely/issues/298) and
  [#302](https://github.com/Corely-AI/corely/issues/302) are complete.
- Branch `353-invoice-lifecycle` against `development` at `744dc7e05`.
- On 2026-11-28 the maintainer explicitly directed implementation of #353
  after discovery. This delivery reuses native Invoices for the bounded
  lifecycle. [Pilot promotion #334](https://github.com/Corely-AI/corely/issues/334)
  still tracks observed demand and the broader build-versus-integrate decision.

## Reuse and decisions

Invoices owns customer draft, issuance and cancellation. Party and Tax continue
to supply the customer snapshot and configured tax treatment. Subscription
Billing retains its own records. Native Accounting runs stock-cost handling
only when Accounting is configured. It shares the issuance transaction with
Invoices, Inventory and audit.

Issuance retains the existing invoice-number format and unique workspace index.
The invoice revision prevents stale writes, and a database constraint allows
one issued correction per original. Canceling leaves the saved original intact
and records the action in the audit log. The existing invoice detail screen
creates an editable linked draft. Paid and stock-backed originals require a
specialist path. See [supported invoice lifecycle](../backend/invoice-lifecycle.md).

## Verification

- PostgreSQL migrations were applied to a disposable `corely_invoice_test_353`
  database. The isolated suite is
  `pnpm --dir services/api exec vitest run src/modules/invoices/__tests__/invoice-tax-snapshot-usecase.int.test.ts`
  with `INVOICE_TEST_DATABASE_URL` pointing at that database. All six cases
  passed, including collision retry, workspace isolation, concurrent issue and
  cancel, and rollback with or without Accounting.
- Invoice unit command
  `pnpm --dir services/api exec vitest run src/modules/invoices --exclude '**/*.int.test.ts'`.
  The invoice suite, Tax engine, German pack and rounding suites passed 113 tests.
- Focused client command
  `pnpm --dir apps/e2e exec playwright test --config playwright.invoice.config.ts`.
  All 15 browser cases passed with Chrome. Both correction cases passed again
  with the full set of draft and canceled invoice actions in the fixtures.
  The Invoice web client uses synthetic session and API responses in these checks.
- API typecheck and build, changed-source ESLint and formatting passed.
- The architecture checker reports 53 existing findings compared with 56 on the
  exact base. The web-features package typecheck reports errors in unchanged
  Cash Management and People test files. The web app typecheck reports an
  entitlement key mismatch in unchanged Operational Requests code.

## UI evidence

Focused Invoice detail, synthetic workspace, English, Chrome. The original
stays read-only after cancellation. A keyboard action creates an editable draft
without issuing it. The mobile action returns to the original. The rejected
request keeps the user on the original and displays an error.

- [Canceled invoice with the correction action at 1280 × 720](../frontend/images/invoice-correction/invoice-correction-original-desktop.png)
- [Correction draft with its original link at 390 × 844](../frontend/images/invoice-correction/invoice-correction-draft-mobile.png)

## Impact and remaining work

An active Tax profile and supported treatment are required before issuance.
Whole quantities match existing invoice storage. Historical issued invoices
can be retrieved and finalize retries retain their existing number.

The migration adds a defaulted revision and a unique partial index to the
existing invoice table. Apply it before enabling code that issues linked
corrections. Preserve the new index and original-invoice links on rollback.

Pilot demand, specialist approval for broader tax or credited documents and
the accountant handoff remain open. Provider delivery and production rollout
are outside this ticket's verification.
