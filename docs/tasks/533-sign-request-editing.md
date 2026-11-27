# Signing request editing

[Issue #533](https://github.com/Corely-AI/corely/issues/533) adds sender editing to `/sign/requests/:id`. The branch `533-sign-request-editing` builds on [the sender review PR](https://github.com/Corely-AI/corely/pull/532). The final integration target is `development`.

The draft editor reuses the existing PDF canvas, field overlay, and layout validation. Signer names and colors follow the draft into review. A request-owned configuration stores the layout, settings, and revision alongside the existing recipients and routing. The owner-scoped update, send, and signing paths use the same request lock. Legacy requests fall back to their published layout.

Replacement preparation creates one linked draft per source request. Confirming the replacement validates the saved revision and settings, then revokes the source and queues the replacement in one transaction. Finalizations consume the saved layout and record its request revision and digest.

The additive migration is required before releasing the editing-aware API. During rollout, publish the matching web build after the API. A previous API binary reads the base template layout, so active requests with custom fields require the editing-aware API during any application rollback.

[Sender workflow](../products/corely/sign-request-editing.md)

## Verification

- Eleven Playwright tests passed, including desktop and mobile signer renaming, stable colors after reordering, adding a signature to page 2, draft reload, settings and replacement confirmation.
- The migration applied to a disposable PostgreSQL database. Five signing integration tests and seven focused signing unit tests passed. The integration suite verified owner scoping, protected coaching agreements, stale revision rejection, recipient preview layout, and revocation of the original session after replacement.
- Contracts build, Prisma generation, API typecheck, targeted ESLint, and Prettier passed. The web-features typecheck reports existing Cash Management and People test errors. The architecture check reports the same 57 violations as the prior checkout.
- [Desktop recipient editor](533-assets/desktop-recipients.png) and [mobile field placement](533-assets/mobile-fields.png) show the rendered flow with synthetic data.
