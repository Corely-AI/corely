# Secret-scanning alert 1: remove exposed Stripe webhook secret

## Tracking and outcome

- Tracking: [secret-scanning alert 1](https://github.com/Corely-AI/corely/security/secret-scanning/1), not GitHub issue 1.
- Branch: `1-remove-exposed-stripe-webhook-secret`; PR base: `development`.
- Draft PR: [#367](https://github.com/Corely-AI/corely/pull/367).
- Inspected base: `4ed3292a2c556cff9d13b2cb6c85672be48fb2f3` on 7 November 2026.
- Goal: remove the reported credential from both current test files without changing fake-provider coverage.
- Exclusions: secret rotation/revocation, local environment changes, merging, deployment, history rewriting, and unrelated audit work.

## Cause and change

The contract-signature and invoice-after-payment E2E tests retried rejected fake
webhooks using a hard-coded Stripe signing secret. Both now require the explicit
`STRIPE_WEBHOOK_SECRET` environment variable before generating a Stripe signature.
The fake-provider path still works without that variable. Missing or empty
configuration fails with an actionable error before a second request is sent.

## Verification

- A temporary isolated Node harness extracted the actual webhook-posting functions from both base and changed files. It reproduced the base's unconfigured retry and passed 12 changed-code checks: fake-provider success with/without configuration, missing/empty configuration failure before retry, configured retry with real Stripe SDK signature verification (including wrong-key rejection), and rejected retry propagation. All requests were mocked; only synthetic test credentials were used.
- `pnpm --dir apps/e2e exec playwright test tests/coaching-contract-signature.e2e.spec.ts tests/coaching-invoice-after-payment.e2e.spec.ts --project=chromium --list`: passed; two tests collected. This is not an E2E pass.
- Targeted `pnpm exec prettier --check` and `git diff --check`: passed.
- Targeted E2E ESLint invocation: blocked by the existing parser configuration enabling both `project` and `projectService`. The same error was reproduced on the unchanged primary-checkout files. No lint configuration changed.
- Full E2E execution was not run: these flows create bookings/invoices and can send contract/invoice emails; an isolated stack with fake delivery was not prepared for this credential removal.

## UI/UX evidence

Not applicable: only test configuration and this investigation record change.

## Impact and remaining work

GitHub reports the secret as publicly leaked with unknown validity. An exact-value
search of the current development tree found only the two reported test files.
The same value exists in the primary checkout's ignored local `.env`; no secret
values are included here. The saved Stripe CLI login is expired, but the local sandbox API credential is
valid. A read-only inventory returned zero registered sandbox webhook endpoints.
Running `stripe listen --skip-update --print-secret` with that sandbox credential
(no event forwarding) returned exactly the leaked value, confirming it is still
the current sandbox CLI listener signing secret. No live-mode calls were made.
The user explicitly limited this task to source removal; rotation/revocation is outside the requested slice.

Removal from the current tree does not revoke a secret or remove historical Git
objects. The alert is not marked revoked by this change.
