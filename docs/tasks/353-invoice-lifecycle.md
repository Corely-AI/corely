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

PR review follow-up preserves fractional draft and quote quantities and keeps
whole quantities as an issuance condition. Issuance reads Accounting and
Catalog through its transaction. Stock allocation rejects ambiguous names,
checks expiry during the decrement, and distinguishes automated stock costs
from manual journals that reference the invoice. A recorded stock cost blocks the
correction before saving the draft. Delivery rechecks cancellation before
provider handoff with or without a PDF.

The second review follow-up restores list deletion with a dedicated visibility
flag and preserves existing notes and legacy hidden records. Issuance rejects
unresolved archived product IDs and codes and decrements zero-cost lots. Inventory
records consumption so cancellation and correction also block when there
is no stock-cost journal entry.

## Verification

- The three ticket migrations were applied to a fresh, disposable
  `corely_invoice_test_353_review2` PostgreSQL database. PostgreSQL reported the
  concurrent correction index ready and valid. The isolated suite is
  `pnpm --dir services/api exec vitest run src/modules/invoices/__tests__/invoice-tax-snapshot-usecase.int.test.ts`
  with `INVOICE_TEST_DATABASE_URL` pointing at that database. All eight cases
  passed, including fractional drafts, default payment details, concurrent issue
  and cancellation, and rollback of invoice and stock changes.
- The invoice HTTP suite in `invoices-api.int.test.ts` passed eight cases with
  local PostgreSQL and synthetic mail configuration. Review regressions
  reproduced before their fixes, including an archived code shadowed by an
  active product's name.
- Invoice unit command
  `pnpm --dir services/api exec vitest run src/modules/invoices --exclude '**/*.int.test.ts'`.
  The run included Accounting, Catalog, Inventory, the Tax engine, the German
  pack and rounding tests. It passed 121 cases, including send revision races.
- Focused client command
  `pnpm --dir apps/e2e exec playwright test --config playwright.invoice.config.ts`.
  All 16 browser cases passed with Chrome, including fractional draft creation
  by keyboard and reopening the saved quantity.
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
- [Fractional quantity and Save as draft at 1280 × 720](../frontend/images/invoice-correction/invoice-fractional-entry-desktop.png)
- [Fractional quantity guidance at 390 × 844](../frontend/images/invoice-correction/invoice-fractional-entry-mobile.png)

## Impact and remaining work

An active Tax profile and supported treatment are required before issuance.
Drafts retain exact input quantities and round each item's amount to the nearest
cent. Historical issued invoices can be retrieved and finalize retries retain
their existing number.

The migrations add an invoice revision, a fractional draft quantity, a list
visibility flag, and a concurrent unique partial index. Follow the [rollout and rollback procedure](../backend/invoice-lifecycle.md#deploy-and-roll-back)
to fence old API and background writers before applying the migrations.

Pilot demand, specialist approval for broader tax or credited documents and
the accountant handoff remain open. Provider delivery and production rollout
are outside this ticket's verification.
