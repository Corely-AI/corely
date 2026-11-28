# Sign request loading and sender experience

[Issue #529](https://github.com/Corely-AI/corely/issues/529) targets the Backoffice sender detail at `/sign/requests/:id` on `development`. The change uses the shared loading skeleton for both the request and its progress panel. The loaded request and PDF action stay available while progress loads. Refresh keeps the last known status visible, and either initial fetch can recover through its existing retry control.

## Verification

`pnpm --dir apps/e2e exec playwright test --config playwright.sign.config.ts` passed all eight tests with `VITE_API_BASE_URL=/api`. The sign suite uses a local Vite server and mocked responses with synthetic recipients.

- Desktop at 1440 × 900 and mobile at 390 × 844 cover delayed request and progress responses, reduced motion, keyboard focus, and refresh while content is visible.
- The error test covers a failed request fetch, a failed progress fetch, and recovery from both.
- [Desktop initial request](529-assets/request-loading-desktop.png) and [mobile progress loading](529-assets/progress-loading-mobile.png) show the two loading states.
- `@corely/web-features` typecheck reported existing errors in Cash Management and People test files.
- Targeted ESLint reproduced existing lint errors in the signing fixture and unrelated lines of the signing actions component.

## Sender experience research

The current detail separates a plain recipient list from progress, uses **Review original PDF** to download a file, and already records timestamps for provider handoff and signing. Senders need to verify what will go out before sending and answer who needs to act afterward.

1. **Show who is next.** Put request status and expiry near the title. Combine the recipient list and status into one section with name, email, signing order, and next action. Use labels like **Waiting for prior signer**, **Needs to sign**, and **Signed**. Use existing ceremony data for this pass. Keep the recipient-specific reminder beside the relevant row and explain that it replaces the previous link. Preserve the existing reminder rate limit. [DocuSign envelope details](https://support.docusign.com/s/document-item?bundleId=oeq1643226594604&language=en_US&topicId=ztv1578456348404.html) · [Dropbox Sign reminders](https://help.dropbox.com/share/how-to-send-a-reminder-for-a-signature-request)
2. **Make review worth opening.** Show the document, recipients and order, invitation message, and expiry in the review step. Add an inline preview and evaluate reusing the template editor's role preview so the sender can inspect required fields as each signer sees them. Keep the final **Send invitations** action explicit. Explain sequential delivery before the sender confirms. [DocuSign Preview and Send](https://support.docusign.com/s/document-item?_LANG=enus&bundleId=ulp1643236876813&language=en_US&rsc_301=&topicId=oeg1578456408976.html)
3. **Distinguish email delivery from signing.** Use **Queued** and **Sent to email provider** when those are the known events. Show **Delivered**, **Delayed**, or **Bounced** once Resend events can be matched to the correct invitation attempt. Corely Sign's current timestamp comes from provider acceptance. This work would require persisting the provider message ID and handling authenticated events without letting an older link's events overwrite the latest attempt. Use the existing activity section for timestamps, and surface the signed PDF and evidence together when complete. [Resend delivery status](https://resend.com/guides/email/users-never-got-login-code) · [Adobe Acrobat Sign agreement actions and activity](https://helpx.adobe.com/sign/web/get-started/get-started-guide.html) · [Dropbox Sign audit trails](https://help.dropbox.com/security/dropbox-sign-audit-trail-overview)

Start with the recipient summary and review step. Check the design with senders by asking them to identify the next signer in a sequential request, catch a wrong email before sending, and locate the signed PDF on mobile. Test delivery tracking with a simulated bounce, an older invitation event after a reminder, and a signed recipient whose email status arrives late. These recommendations draw on product documentation and Corely's current implementation. They have yet to be tested with senders.
