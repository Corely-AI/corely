# Signing request sender review

[Issue #531](https://github.com/Corely-AI/corely/issues/531) delivers the recipient progress summary and the sender review step on `/sign/requests/:id`. It builds on [the loading skeleton PR](https://github.com/Corely-AI/corely/pull/530). The draft PR targets `529-sign-request-loading` so reviewers can see the sender changes by themselves. The final integration target is `development`.

## Implementation

- Show request status and expiry near the title. The recipient section shows names, addresses, order, and signing status. The reminder dialog identifies its recipient and says the previous link will be revoked.
- Review shows the actual remaining send inputs, consent, and PDF. The preview filters read-only field overlays by recipient and uses the request's pinned template revision through the existing owner-only source endpoint.
- The source response adds optional fields to the existing PDF payload. A web build against an older API still shows the PDF and explains that fields are unavailable. Actual email delivery and bounce tracking remain follow-up work.

## Verification

- Eight Playwright tests passed with `VITE_API_BASE_URL=/api` and `pnpm --dir apps/e2e exec playwright test --config playwright.sign.config.ts`. The suite uses synthetic signers and a fixture PDF. It exercises sequential signers, recipient field selection, the review summary, Escape and Cancel, send failure and retry, and reminder confirmation.
- Two API tests passed with `pnpm exec vitest run --workspace ./vitest.workspace.ts services/api/src/modules/sign/__tests__/read-sign-request-source.spec.ts`. They check the pinned revision, document binding, and rejection before reading for an inaccessible request.
- The contracts build and Prettier passed. Targeted ESLint on implementation files reported four existing activity rendering warnings. The web-features typecheck reported existing Cash Management and People test errors.
- [Desktop review](531-assets/desktop-review.png), [mobile review](531-assets/mobile-review.png), and [mobile signing progress](531-assets/mobile-progress.png) show the sender's workflow with synthetic data.
