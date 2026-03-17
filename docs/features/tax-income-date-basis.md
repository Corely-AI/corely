# Tax Income Date Basis and Payment Invariant

> Last updated: March 4, 2026

## Summary

Corely now applies **payment-date basis** for `INCOME_TAX` filing invoice inclusion.

- `income-annual` (mapped to `INCOME_TAX`) includes invoice income by **final payment date** (`InvoicePayment.paidAt`), not by `issuedAt`.
- Invoice status `PAID` must persist with at least one payment row in `billing.InvoicePayment`.

This prevents backdated invoices from being assigned to the wrong income tax year.

## Date Basis Rules

| Filing/report type             | Invoice inclusion date                                             |
| ------------------------------ | ------------------------------------------------------------------ |
| `VAT_ADVANCE`, `VAT_ANNUAL`    | Document date priority: `invoiceDate` -> `issuedAt` -> `createdAt` |
| `INCOME_TAX` (`income-annual`) | **Final payment date** (latest `paidAt` on invoice payments)       |

## Implementation

### 1) Invoice payment persistence + invariant

File: `services/api/src/modules/invoices/infrastructure/adapters/prisma-invoice-repository.adapter.ts`

- Invoice repository now loads and returns `payments` from Prisma (`findById`, `list`).
- `save()` now syncs aggregate payments into `billing.InvoicePayment`.
- Guard added: persisting `status=PAID` with zero payments throws.

### 2) Income filing item/totals query basis

Files:

- `services/api/src/modules/tax/domain/ports/tax-snapshot-repo.port.ts`
- `services/api/src/modules/tax/infrastructure/prisma/prisma-tax-snapshot-repo.adapter.ts`
- `services/api/src/modules/tax/application/use-cases/get-tax-filing-detail.use-case.ts`
- `services/api/src/modules/tax/application/use-cases/list-tax-filing-items.use-case.ts`

Changes:

- `TaxSnapshotRepoPort.findByPeriod()` now accepts `invoiceDateMode` (`document` | `payment`).
- Income-annual flows pass `invoiceDateMode: "payment"`.
- Prisma fallback logic for invoices now supports payment-mode selection and uses final payment date.

### 3) Recalculate behavior

File: `services/api/src/modules/tax/application/use-cases/recalculate-tax-filing.use-case.ts`

- `INCOME_TAX` recalculation now backfills invoice snapshots using **final payment date**.
- VAT periodic/annual recalculation continues to use document-date basis.

## Tests

- `services/api/src/modules/invoices/__tests__/invoices-api.int.test.ts`
  - verifies payment persistence and response payload after payment recording.
- `services/api/src/modules/tax/__tests__/tax-filings.int.test.ts`
  - verifies income-annual item fallback uses payment date.
  - verifies income-annual recalc writes invoice snapshot with final payment date.

## Legacy Data and Backfill

Existing historical rows may have:

- `Invoice.status = PAID`
- but no `InvoicePayment` records

These rows cannot be reliably classified by payment basis until backfilled.

Recommended remediation:

1. Detect rows with missing payments.
2. Insert payment rows with the best known payment timestamp from audit/source system.
3. Recalculate affected filings.

## Operational Runbook

When invoice/date mismatches are reported:

1. Confirm invoice has at least one `InvoicePayment` with correct `paidAt`.
2. Recalculate filing from UI (`/tax/filings/:id` -> Recalculate).
3. Verify item appears in filing Items table and totals.

## Known Limitation

Partial payments are currently represented as full-invoice recognition at final settlement date.
If strict partial-year cash allocation is required, the filing snapshot model must support split allocations per payment event.
