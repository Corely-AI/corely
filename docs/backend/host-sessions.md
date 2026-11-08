# Host-specific sessions and shared API transport

Implementation of [#385](https://github.com/Corely-AI/corely/issues/385), building
on [central login](sso.md) and [ADR-0004](../decisions/ADR-0004-central-identity-app-sessions.md).
The reusable adapter runs inside the existing API/Identity deployment. Ingress
must route each registered app's reserved paths to that deployment; this change
does not provision hosts, change clients, deploy or enable SSO.

## Browser contract

After the existing callback sets `__Host-corely-session`, use same-origin calls:

| Route                       | Behavior                                                                                                                                                                                                  |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /api/session/user`     | Non-renewing verified account/membership choices, app binding and CSRF/expiry metadata; supplied context hints are authorized before bootstrap succeeds.                                                  |
| `GET /api/session/current`  | Returns `SsoSession` metadata without renewing idle expiry: a session-bound CSRF token and absolute expiry.                                                                                               |
| `POST /api/session/rotate`  | With exact Origin and `x-csrf-token`, atomically replaces the opaque cookie and CSRF token without extending absolute expiry. No request body.                                                            |
| `POST /api/session/logout`  | Exact Origin/CSRF; atomically revokes the current central family and all linked sessions, with audit/outbox. Idempotent for the same handle. Returns 204 and expires the initiating host cookie. No body. |
| `/api/bff/<existing-route>` | Dispatches an allowed route to its existing API controller and guards using a server-established principal.                                                                                               |

Mutations require the exact registered `Origin` and `x-csrf-token`. Reads reject
foreign Origin and non-same-origin Fetch Metadata when supplied. The retained
Invoice `GET`/`HEAD /api/bff/invoices/:invoiceId/pdf` route can enqueue generation
or regeneration, so it also requires `x-csrf-token`. Same-origin browser reads
can omit Origin; a supplied Origin must still match. Other unsafe methods require
Origin explicitly. Use fetch with the CSRF header for these PDF requests.
CORS is disabled
on these paths, including rejected and workspace-prefixed variants. SameSite is
an additional control; it is not the CSRF policy. The cookie retains Secure,
HttpOnly, SameSite=Lax, Path=/, `__Host-` semantics and no Domain attribute.
Browser JavaScript receives no access/refresh token or session handle.

Use `x-tenant-id` and `x-workspace-id` only as selection hints. Identity verifies
the tenant's active status/current membership and Workspaces verifies workspace
membership before dispatch; the existing AuthGuard revalidates resolved context
and operation authorization remains with each owner. Without a tenant hint,
exactly one active tenant membership is required. This slice does not persist
or switch session context; persistent app-switch handoff is a separate slice.
Menu visibility is not a backend grant.

Allowed roots are deliberately explicit:

- Invoice: `invoices`, `customers`.
- HR: existing `people`, `tasks` owners.
- App Center: both sets.
- Shared: `documents`, `workspaces`, `menu`, `platform/apps`, `copilot`, `ai-copilot`.

Public invoice routes, legacy auth, internal services, arbitrary URLs, encoded
paths, dot segments, duplicated slashes and workspace path aliases cannot pass
through this transport. Adding a root requires reviewing its authentication and
operation permissions. Allowlisting is routing, not an entitlement or permission.

## Lifecycle and transport guarantees

The existing hashed session records are reused; no migration or second identity
store is introduced. Each request checks environment/app binding, session and
family revocation, 30-minute idle expiry, 12-hour absolute expiry, current account,
password hash and active tenant membership. Business requests and explicit rotation
touch idle deadlines under family/session locks; metadata verification reads do
not renew activity. Deadlines cannot exceed absolute expiry. Rotation
compares the old handle under lock and writes its audit/outbox in the transaction.
Only one concurrent rotation succeeds. Old handles fail closed; clients must
coordinate rotation and obtain fresh CSRF metadata after it. Lost rotation
responses require sign-in rather than recovering an old bearer handle.

The adapter does not mint, expose or refresh bearer tokens. An expired or revoked
cookie returns 401, without redirects, automatic refresh, command replay or cookie
overwrite. An infrastructure outage returns 503. Global logout is implemented by
#387: a family lock serializes revocation with rotation and handoff redemption.
Revocation is transactional with audit/outbox and cannot mint a new session from
the old central cookie. Other device families are unchanged. Expired or
access-revoked cookies can still revoke their family with the matching CSRF proof;
a stale rotated handle fails rather than revoking an unknown replacement.
Requests admitted before revocation may complete, including existing streams.
See [browser sessions](../frontend/browser-sessions.md) for UI/cache cleanup,
foreground revalidation and explicit old-origin migration limits.

Requests stay inside the same Express/Nest pipeline: there is no upstream fetch
or additional business server. Request/response streams, aborts, query strings,
trace and idempotency headers reach the existing handlers. Controllers/use cases
retain responsibility for idempotent effects. Existing JSON/base64 attachment
uploads and binary downloads are supported, with a 16 MiB JSON/form body limit
(including streamed/chunked JSON). Unsupported payload content types return 415; bodyless requests may retain a Content-Type header; no new
multipart/raw-upload endpoint is implied. Session metadata/rotation accept no body.
Responses enforce private/no-store even when a stream handler sets cache headers.

Client identity assertions (`Authorization`, user/role and trusted surface headers)
are rejected. Forwarding and Corely proxy headers and cookies are removed before
business dispatch. The principal is passed in a private in-process WeakMap, then
consumed by the existing AuthGuard; no HTTP header can create it. Direct access
requires real TLS/registered Host. The existing keyed ingress assertion is still
required when a proxy rewrites Host. Ingress must strip client assertions and set
its own `x-corely-sso-origin` and private `x-corely-sso-proxy-key`; arbitrary
X-Forwarded-Host/proto values never establish origin authority.

## Verification and activation

Use the disposable PostgreSQL fixture described in [SSO testing](sso.md#reproduce-isolated-checks):

```sh
SSO_TEST_DATABASE_URL=postgresql://127.0.0.1:55485/corely_384_surf05 OUTBOX_DISPATCH_DRIVER=disabled \
  pnpm --dir services/api exec vitest run --config vitest.config.ts \
  src/modules/identity/__tests__/sso-session.int.test.ts \
  src/modules/identity/__tests__/sso-session-transport.int.test.ts \
  src/modules/identity/__tests__/sso-transport.spec.ts
```

Tests use real PostgreSQL session/account/membership adapters and existing Invoice
and People HTTP controllers with substituted business use cases. Transfer probes
verify JSON/base64, binary and SSE plumbing, not live business effects. See the
[task record](../tasks/385-host-specific-sessions.md) for actual results and limits.
No first-wave client or deployed ingress acceptance follows from fixture passes.

Activation retains the central login feature gate, registrations, private keys,
existing migration and email/background prerequisites. Route reserved app paths
before SPA fallbacks; do not proxy all `/api` or `/auth`, move the App Center root,
or expose the ingress key to JavaScript. Operational bindings and end-to-end
client acceptance remain follow-on delivery. Rollback disables reserved routing
and SSO, requiring legacy reauthentication; it does not restore rotated sessions.

Protocol references: [cookie prefixes](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie#cookie_prefixes)
and [OWASP CSRF guidance](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html).
These inform controls; they are not a security certification.

[Shared browser session providers](../frontend/browser-sessions.md) implement the
opt-in client path; existing clients are not automatically migrated.
