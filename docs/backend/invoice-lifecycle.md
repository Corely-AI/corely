# Customer invoice issuance and corrections

Invoices owns outgoing customer invoices. Corely subscription charges remain in
Billing. Party supplies the customer billing snapshot, and Tax determines and
snapshots the supported tax treatment. An Accounting chart of accounts is
optional for issuing customer invoices.

## Issue a draft

Save the draft with invoice lines expressed as whole positive quantities and
nonnegative integer prices in cents. The invoice subtotal can be at most
2,147,483,647 cents. Use a supported currency with two minor-unit digits.

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
