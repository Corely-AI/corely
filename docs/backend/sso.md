# Central Corely login and registered app callbacks

Implementation for [#384](https://github.com/Corely-AI/corely/issues/384), following
[ADR-0004](../decisions/ADR-0004-central-identity-app-sessions.md). This is the
central entry/handoff foundation. [Host-specific session transport](host-sessions.md)
implements #385. Shared client adoption and global logout remain [#386](https://github.com/Corely-AI/corely/issues/386) and
[#387](https://github.com/Corely-AI/corely/issues/387). No deployment is asserted.

## Behavior and existing owners

`apps/login` is a thin credential UI. Corely Identity validates existing accounts
and active tenant membership; no account, employee or membership is created by
SSO. Email-code sign-in is the default, with password fallback. Either method
creates the same central session and app-bound handoff. The existing portal's
student/guardian OTP flow, POS storage and legacy `/auth/*` token contracts remain
unchanged. Account signup and recovery link to the retained App Center/admin auth
routes in a new tab; expired invitations require the existing invitation flow.

The central and app HTTP adapters run in `services/api`. They do not create
business backends or a separate identity server. Five additive tables in the
existing Identity schema hold central sessions, app sessions, transactions,
attempt budgets and email challenges. App sessions establish identity; the [host session adapter](host-sessions.md)
validates current tenant/workspace intent before dispatching business requests.
Legacy bearer routes retain their existing contract.

| Route                                | Contract                                                                                                                                                                  |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| App `GET /api/session/preauth`       | Host-only pre-auth cookie and synchronizer token; no bearer tokens.                                                                                                       |
| App `POST /api/session/login`        | Exact Origin + CSRF, normalized local return path; returns central authorize URL.                                                                                         |
| Login `GET /sso/authorize?request=…` | Uses an active central session or sends the browser to `/login`; no password needed for the second app.                                                                   |
| Login `GET /sso/context?request=…`   | Bound central pre-auth cookie/token, app label/origin and expiry; no credentialed cross-origin access.                                                                    |
| Login `POST /sso/email-code/request` | CSRF-protected generic response; queues eligible existing-account email through the transactional outbox.                                                                 |
| Login `POST /sso/email-code/verify`  | Verifies a six-digit code and atomically consumes it while creating a central family/handoff.                                                                             |
| Login `POST /sso/login`              | Existing password verification, active account/team checks and the same central family/handoff.                                                                           |
| Login `POST /sso/cancel`             | Cancels the bound pending transaction and returns the registered logged-out destination.                                                                                  |
| App `GET /auth/callback`             | State, browser, code, verifier/challenge, exact app/environment and current access checks; consumes once and sets the app cookie, then redirects to the clean local path. |

## Limits and security controls

- Exact configured HTTPS origins; callbacks and logged-out paths are derived
  server-side. No wildcard hosts, client callbacks, arbitrary return URLs or
  cross-origin token copying. Return paths cannot loop into auth/session routes.
- `__Host-corely-login`, `__Host-corely-session` and separate pre-auth cookies
  are Secure, HttpOnly, SameSite=Lax, Path=/ and have no Domain attribute.
  Passwords and access/refresh tokens never appear in navigation URLs or JS
  storage. One-time handoff codes/state are redacted protocol artifacts, not
  reusable bearer tokens. Callbacks have no third-party resources.
- SSO routes have a 4 KB body limit, no-store/no-referrer behavior and no reflected
  credentialed CORS, including case-insensitive route variants. Workspace-prefixed SSO aliases are
  rejected before the global workspace middleware can log or rewrite them. Every mutation
  requires exact Origin and bound CSRF. SameSite alone is insufficient.
- Direct ingress requires actual TLS and an exact registered Host. Forwarded
  host/proto are ignored. If a trusted proxy rewrites Host, it must strip client
  copies and set `x-corely-sso-origin` plus `x-corely-sso-proxy-key`; the API checks
  the configured private key and exact registered origin. Never expose that key
  in a frontend bundle or accept a client assertion without it.
- Transactions last five minutes; handoff codes last 60 seconds. Verifiers/state
  are encrypted with AES-GCM and bound to their transaction. Handles/codes have
  256-bit entropy and are stored by hash. Atomic row locks prevent concurrent
  redemption, repeat authorization and revoked-family resurrection.
- Email codes use a cryptographic six-digit generator and a keyed hash bound to
  the email, environment and transaction. An encrypted copy exists only for
  delivery; it is cleared after delivery/consumption. The code lasts at most five
  minutes and cannot extend its parent transaction. Resend cooldown is 60 seconds for the same address; correcting an address
  replaces its challenge without extending the transaction deadline;
  account sends are limited to three per fixed five-minute window, and verification
  shares the five-attempt account budget with passwords. Wrong code attempts also
  commit a durable per-challenge limit. Resending replaces the old challenge.
- Email challenges and delivery events commit together. Outbox payloads contain
  only a challenge ID. The existing API-hosted background runtime revalidates
  account, membership, password version and expiry before delivery and uses the
  challenge ID as the provider idempotency key. Delivery errors retry normally;
  expired/replaced/consumed challenges are not sent. No live email was sent in tests.
- Central/app records use 30-minute idle and 12-hour absolute expiry. A linked app
  cannot outlive its family. Membership/account changes are checked at issuance
  and redemption; password hash changes invalidate existing central families and
  pending email proofs. Renewal, global revocation, stream disconnect and expired
  record cleanup must be completed with #385/#387 before activation.
- A central cookie whose account no longer has active team access is not reused
  and does not block fresh credential login. Database/access-check outages remain
  errors, and usable sessions still prevent silent account replacement.
- EN/DE/VI forms handle invalid credentials/codes, network failure, expired
  requests, cancellation and resend wait. Errors receive focus; code entry supports
  one-time-code autocomplete. The credential page uses shared, font-free tokens
  and public auth primitives without analytics or external font requests.

## Configuration and activation

`CORELY_SSO_ENABLED` defaults to `false`. With it disabled, new SSO routes reject
requests and the API does not query the new tables. Enabling requires:

1. The reviewed additive `20261108170000_identity_sso` migration, applied through
   the separately authorized environment workflow; no existing identities move.
2. `CORELY_SSO_SECRET`: a private 32-byte hex key for encryption/CSRF/OTP hashing.
   A change invalidates outstanding proofs, so plan rotation and reauthentication.
3. `CORELY_SSO_REGISTRATIONS`: JSON with exact `loginOrigin` and unique
   `{ key, origin }` app entries. `.env.example` shows the approved first-wave
   production names; staging/local use isolated HTTPS origins, data and secrets.
   Omit HR until its separate privacy/rollout gates pass.
4. Trusted routing for the reserved paths before static/legacy fallbacks. Publish
   the login bundle on the login origin; its Vercel headers/`/login` rewrite do
   not configure the `/sso/*` API upstream. SURF-19 owns live bindings/TLS/proxy
   secrets. Retain legacy `app.corely.one` root/deep links until the gated cutover.
5. The existing Resend sender configuration (`EMAIL_PROVIDER`, `RESEND_API_KEY`,
   `RESEND_FROM`, optional `RESEND_REPLY_TO`) and API-hosted outbox delivery.
   Enabling SSO without a valid sender fails startup rather than displaying a
   working passwordless option that cannot deliver. Test provider delivery in an
   approved environment before activation.
6. The follow-on session/client/logout implementation and operational acceptance.
   The [host session adapter](host-sessions.md) implements `/api/bff/*`; existing clients are not migrated.

Rollback: disable new SSO initiation/routing, restore the approved legacy route
map and require legacy reauthentication. Retain additive records for diagnosis;
do not restore revoked sessions or turn opaque cookies into legacy browser JWTs.
No automatic deployment, root move, provider send or shared database migration
is part of this change.

## Reproduce isolated checks

The fixture requires `SSO_TEST_DATABASE_URL` to select `127.0.0.1` and a database
named `corely_384_*`; it refuses other targets. Use a fresh disposable PostgreSQL
instance/database, never a development/shared/customer database. Prepare its
schema with a reviewed migration or a schema-to-SQL diff on that disposable
database; do not run `prisma db push` or seed a shared database.

Run the source/integration tests from the repository root:

```sh
SSO_TEST_DATABASE_URL=postgresql://127.0.0.1:55484/corely_384_sso OUTBOX_DISPATCH_DRIVER=disabled \
  pnpm --dir services/api exec vitest run --config vitest.config.ts \
  src/modules/identity/__tests__/sso.int.test.ts \
  src/modules/identity/__tests__/sso-email.int.test.ts \
  src/modules/identity/__tests__/sso-security.spec.ts \
  src/modules/identity/__tests__/sso-transport.spec.ts
pnpm --filter @corely/login typecheck
pnpm --filter @corely/login build
pnpm --filter @corely/api typecheck
```

For browser checks, generate a disposable self-signed certificate as `key.pem`
and `cert.pem` in `/private/tmp/corely-384-browser`. Build `apps/login`, then start
the test-only fixture in one terminal with those environment variables:

```sh
NODE_ENV=test OUTBOX_DISPATCH_DRIVER=disabled \
  SSO_TEST_DATABASE_URL=postgresql://127.0.0.1:55484/corely_384_sso \
  SSO_TEST_OUTPUT_DIR=/private/tmp/corely-384-browser \
  pnpm exec vite-node --config services/api/vitest.config.ts \
  services/api/src/modules/identity/testkit/sso-browser-server.ts
```

The fixture binds only localhost:8444, creates a run-specific synthetic colleague,
and uses a fake mail sender. `/__fixture/code` exists only in that unregistered
test entry point, never in AppModule or production. Tests use `.corely.test`
hostnames mapped to loopback and ignore only that disposable certificate. No
first-wave production UI or real email delivery is simulated as verified.

```sh
SSO_BROWSER_CHANNEL=chrome SSO_TEST_OUTPUT_DIR=/private/tmp/corely-384-browser \
  pnpm --dir apps/e2e exec playwright test --config playwright.sso.config.ts
```

The general and API Playwright configurations exclude `tests/sso`; run these
fixture-dependent tests explicitly with `playwright.sso.config.ts`.

Use the matching installed Playwright browser by default; the channel override
permits an already installed Chrome. Traces are disabled to avoid persisting
codes/passwords. `SSO_CAPTURE_EVIDENCE=true` explicitly saves synthetic screenshots
beside the task record. Stop the fixture gracefully and stop/remove only its
test-owned PostgreSQL instance afterwards. The task record reports actual runs.
