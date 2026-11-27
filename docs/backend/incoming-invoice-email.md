# Incoming invoice email

Workspace admins can enable invoice email under **Settings → Workspace** and copy the forwarding address. A message with a PDF and a PNG produces two drafts in **Purchasing → Vendor bills**. The reviewer opens each original, fills in the supplier and invoice details, saves the draft, and can then approve it. The original remains available from the bill after approval.

## Provider setup

1. Apply the VendorBill migration before running the updated API.
2. Configure a Resend receiving domain and publish the MX record for that domain. The address uses `invoice+<workspace ID>@<receiving domain>`. Use a dedicated subdomain when the main domain already receives mail elsewhere. On 27 November 2026, `corely.one` had an existing Amazon SES MX record.
3. Register a dedicated Resend webhook for `email.received` at `POST /purchasing/invoice-email/resend` on the API origin.
4. Set `INVOICE_EMAIL_DOMAIN` and store `INVOICE_EMAIL_RESEND_WEBHOOK_SECRET` in the API's secret store. Ensure `RESEND_API_KEY` can retrieve received attachments and the private Documents bucket accepts uploads and can sign downloads.
5. In a test workspace, enable intake and forward a synthetic email with multiple supported files. Confirm the drafts, originals, and editing flow. Replay the same event through Resend and verify the draft count stays the same.

[Resend inbound setup and attachment API](https://resend.com/blog/inbound-emails)

## Delivery and access

Corely accepts PDF, JPEG, and PNG attachments up to 10 MiB each, checks their file signatures, and skips inline images. The signed webhook's recipient maps to an active workspace with intake enabled. Bill and file access use the selected workspace and the existing Purchasing permissions. Original downloads use a private signed URL valid for two minutes. Share the forwarding address with senders you want to allow to create drafts.

An attachment is keyed by workspace, provider message ID, and provider attachment ID. Failed downloads or writes return a retryable webhook error after Corely attempts the remaining files. Replays preserve any drafts already imported or reviewed. Logs identify failed or rejected attachments by provider IDs and reason, without including the message or file contents.

To pause intake for one workspace, disable it in workspace settings. To pause intake globally, disable the receiving webhook or remove `INVOICE_EMAIL_DOMAIN` from the API configuration. Existing drafts and originals remain available.
