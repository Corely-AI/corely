# Customer invoice issuance and corrections

Invoices owns outgoing customer invoices. Corely subscription charges remain in
Billing. Party supplies the customer billing snapshot, and Tax determines and
snapshots the supported tax treatment. An Accounting chart of accounts is
optional for issuing customer invoices.

## Issue a draft

Draft lines, including lines copied from quotes, accept positive quantities and
nonnegative integer prices in cents. Each draft line rounds to the nearest cent
with half cents rounded up. Change fractional quantities to whole quantities
before issuing. The invoice subtotal can be at most 2,147,483,647 cents. Use a
supported currency with two minor-unit digits.

Issuance resolves the Tax profile effective on the invoice date, or the
issuance date when the draft has no invoice date. The currency and any explicit
issuer country must match the profile. Initial coverage uses the German tax
pack for domestic standard VAT and small business treatment. A missing or
unsupported profile, a mismatched currency or issuer, and known cross-border
cases block issuance. Check the buyer's billing country before issuing.

The invoice keeps the committed number, billing details and tax snapshot on
retry. Tax comes from the owning pack and the snapshot retains its rounding
method and computed totals. Accounting's existing stock-cost workflow applies
when Accounting is configured and the invoice draws on recognized inventory.

## Correct an issued invoice

1. Open the unpaid invoice and cancel it using the existing invoice action.
   The original retains its number, notes, terms, line items, tax snapshot and
   delivery timestamp. Cancellation records the actor, time and any supplied
   reason in the audit log.
2. Choose **Create correction draft** on the canceled invoice. The editable
   draft copies the customer and line items, links to the original, and starts
   with a new invoice date. Review the details before choosing **Issue invoice**.
3. Use **View original invoice** on the correction to open the canceled
   record. Only one linked correction can be issued per original. Correct a
   later mistake from the latest canceled invoice in the chain.

API clients can create the linked draft through `POST /invoices` by providing
`correctsInvoiceId` along with the normal draft fields. The source invoice must
belong to the current workspace. Existing create, issue and cancel permissions
apply independently. Invoices with a payment or a recorded stock-cost entry
require a specialist correction workflow.

The linked draft covers the local invoice record. An already delivered invoice
may need separate customer notification or an accountant-directed correction.
Queued delivery checks for cancellation before handing a message to the provider.
Review jurisdiction, document format, export and accountant handoff with a
specialist before extending the supported scope.

## Deploy and roll back

Pause invoice writes and drain in-flight invoice commands and deliveries before
running the migrations and deploying the updated API and background workers.
Resume traffic and job processing after all invoice writers run the updated
code. Apply the same fence during rollback and retain the additive schema and
index. Keep invoice writes paused if rolling back to code that cannot enforce
revision checks or read fractional draft quantities. Before the first updated
writer runs, verify that the correction index exists and is valid.

The index is built concurrently in its own migration. If the build is
interrupted, inspect `pg_index.indisvalid` and the migration record. If duplicate
issued corrections caused the failure, reconcile the records with the invoice
owner. With writers still fenced, drop an invalid index with
`DROP INDEX CONCURRENTLY billing."Invoice_one_issued_correction_per_original"`
outside a transaction. If the index is absent or was dropped, mark the failed
`20261128121000_invoice_correction_unique_index` migration rolled back with
`prisma migrate resolve --rolled-back` and rerun the deployment migration. If the
index is valid and matches the checked-in definition, mark the failed migration
applied with `prisma migrate resolve --applied`.
