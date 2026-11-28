# Incoming expense receipts

A workspace admin enables receipt forwarding under **Settings → Workspace**. With workspace slug `workspacexyz` and receiving domain `expense.corely.one`, the shared address is `workspacexyz@expense.corely.one`.

Forward PDF, JPEG, or PNG receipts up to 10 MiB each. Each accepted attachment appears as its own draft in **Expenses → Emailed receipts**. An authorized workspace reviewer assigns shared-address drafts to a member. Members can also generate a private personal forwarding address in Workspace Settings. Corely checks that the mapped member still has workspace access and expense permissions when a message arrives. Keep personal addresses private.

A claimant opens the original, fills in the merchant, date, amount, currency and category, and saves or submits. The system creates the completed expense and applies the existing submission policy in a single transaction. The receipt stays available from the claimant's inbox after submission. Originals stay private and have short-lived URLs.

## Provider setup

1. Add `expense.corely.one` to Resend as a receiving subdomain and publish the MX record Resend provides for the subdomain.
2. Register a dedicated `email.received` webhook for `POST /expense-receipts/resend` on the API origin.
3. Set `EXPENSE_EMAIL_DOMAIN=expense.corely.one` and store `EXPENSE_EMAIL_RESEND_WEBHOOK_SECRET` in the API's secret store. The existing `RESEND_API_KEY` needs permission to retrieve received attachments. Private Documents storage must support writes and signed reads.
4. Enable forwarding in the target workspace. Use a synthetic multi-attachment email to verify drafts, assignment, original access, and submission. Confirm a replay leaves the receipt count unchanged.

The shared address follows the workspace slug. Update senders when the slug changes. Disabling intake in Workspace Settings pauses new delivery while leaving previously imported drafts available.

[Resend inbound setup](https://resend.com/blog/inbound-emails)
