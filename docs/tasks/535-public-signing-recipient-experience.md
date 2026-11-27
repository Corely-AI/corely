# Public signing recipient experience

[Issue #535](https://github.com/Corely-AI/corely/issues/535) updates the recipient journey at [app.corely.one/sign/receive](https://app.corely.one/sign/receive). The independent branch `535-public-signing-recipient-experience` targets `development`.

The Backoffice HTML entry renders a skeleton while its client loads. The shared recipient form shows localized skeletons while opening an invitation, rendering a PDF or page, and preparing the signed preview. The preview preserves the separate PDF link and offers retry. The document and signing fields sit side by side on desktop, and mobile jump buttons move focus to the relevant section. Confirmation shows an answer summary and the reviewed PDF. Declining uses the shared confirmation dialog.

The public signing protocol, cookie forwarding, and authorization stay with the existing routes. Browser tests use a local, mocked agreement and separately exercise the Backoffice and Public Web entry points.

## Verification

- `playwright.sign-recipient.config.ts` passed all seven cases with `SIGN_E2E_RECIPIENT_SURFACE=backoffice`. This covers the HTML opening skeleton, deferred API and PDF responses, reduced motion, localized errors, field focus, saving and editing answers, acceptance, preview recovery, and decline. The private sender route still requires sign-in.
- The same configuration passed all five compatible cases with `SIGN_E2E_RECIPIENT_SURFACE=public-web`. Public Web typecheck passed.
- The Backoffice production Vite build passed, and its generated signing HTML contains both the skeleton and a stylesheet link. Targeted lint and formatting checks passed.
- The live Backoffice recipient URL returned HTTP 200 without sign-in and included private, no-store caching and no-referrer headers. The rendered evidence uses the local candidate with synthetic data.

## Visual evidence

- [Opening the invitation on mobile](535-assets/invitation-loading.png)
- [Mobile PDF skeleton](535-assets/pdf-loading.png)
- [Desktop final review](535-assets/recipient-desktop.png)
- [Mobile final review](535-assets/recipient-mobile.png)
