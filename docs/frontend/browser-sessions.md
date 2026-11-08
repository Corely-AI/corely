# Opt-in browser session providers

[Issue #386](https://github.com/Corely-AI/corely/issues/386) adds a separate
cookie-session entry point in `@corely/web-shared`. It builds on the
[host session adapter](../backend/host-sessions.md), not a new identity service.
The existing `Providers`, `useAuth`, bearer clients, token storage, workspace
providers and POS integration keep their existing behavior.

## New surface integration

App Center, Invoice and HR use the same implementation, changing only the
registered `appKey` and optional tenant/workspace/locale configuration:

```tsx
import { SessionProviders, useSession } from "@corely/web-shared";

function App() {
  return (
    <SessionProviders config={{ appKey: "invoice", locale: "en" }}>
      <ProtectedWorkspace />
    </SessionProviders>
  );
}

function ProtectedWorkspace() {
  const { client, state } = useSession();
  // client.request("/invoices") returns a Response, including streams/downloads.
  // client.json(path, sharedZodSchema) validates a JSON response.
  return <div>{state.status === "authenticated" ? state.session.user.name : null}</div>;
}
```

Use `app-center` or `hr` for the other registered surfaces. No per-app auth copy,
provider deployment or business API is required. These package exports and the
synthetic reuse fixture are available; this change does not scaffold or migrate
App Center/Invoice/HR product screens. Future slices must bind their feature API
calls to this client; existing legacy singleton API imports are not silently
redirected to the session transport.

The provider owns a fresh in-memory QueryClient per app/tenant/workspace scope.
It does not mount the legacy offline/persisted-cache stack or touch legacy token
storage. Tenant/workspace hints are optional configuration, validated by the
server at bootstrap and again on business requests. They confer no authority.
Changing the configuration remounts behind the bootstrap boundary, cancels the
old scope and starts with an empty query cache. Persistent context switching,
logout, old-origin token retirement and queued offline-write policy remain #387;
no local “logout” operation is offered that could leave central SSO intact.

## State and navigation contract

`GET /api/session/user` verifies the opaque cookie and returns the registered
app key, CSRF/absolute-expiry metadata and the existing account's ID, name, email
and active tenant membership choices. It returns no password, session handle,
access/refresh token or personnel records. It uses Identity's existing owning
ports; supplied context hints additionally use current tenant/workspace policy.
The old `/api/session/current` metadata and bearer endpoints are unchanged.

`useSession().state.status` distinguishes:

| State             | Shared default behavior                                          |
| ----------------- | ---------------------------------------------------------------- |
| `booting`         | Accessible loading status; protected children are not mounted.   |
| `authenticated`   | Mount the protected children after schema/app/expiry validation. |
| `unauthenticated` | Sign-in action; no automatic redirect.                           |
| `forbidden`       | Access-denied message and manual retry; no login loop.           |
| `unavailable`     | Recoverable outage message and manual retry.                     |

The default boundary uses shared UI/tokens and EN/DE/VI copy. Consumers can pass
`fallback(value)` while preserving the protected-child gate. `retry()` rechecks
the server explicitly. `login(returnPath?)` validates a relative destination,
gets pre-auth CSRF and initiates the existing central handoff; only the server's
HTTPS authorize URL is navigated. Callback redemption stays server-side; after
the clean redirect the provider bootstraps instead of parsing proofs from URLs.

`refresh()` explicitly rotates the app cookie/proof and rechecks the user. A failed early refresh does not prevent rotation after a later successful bootstrap. The
client deduplicates bootstrap and same-instance rotation. Rotation failure is
not replayed; losing a rotation response can require reauthentication. Cross-tab
rotation coordination is not claimed. An expired session or business 401 clears
in-memory session state, cancels outstanding requests and hides protected UI.
A 403 is distinct from 401 and does not initiate central login. Network/5xx/429
failures, including interrupted response bodies after headers, become temporarily unavailable; ordinary 4xx domain errors do not
pretend that the user signed out.

## Requests and retry ownership

`client.request(relativePath, options)` always targets same-origin
`/api/bff/<existing-route>`. It supplies CSRF on reads as well as mutations
(including the retained effectful PDF GET), optional context hints, idempotency
and correlation headers. Cookie credentials, redirect policy and trusted
identity headers cannot be overridden. Arbitrary origins and path traversal
are rejected. Use existing JSON/base64 upload contracts and download/stream
response APIs; the backend's route and size limits still apply.

There is one fetch attempt per request, including mutations and streams. The
new QueryClient also disables retries. Bootstrap, rotation and login never fall
back to legacy token refresh, and an unsafe mutation is never automatically
replayed after 401. Callers should pass an AbortSignal and existing idempotency
key where their operation requires it. Cancellation stays attached through body
consumption; disposing a scope or verifying a changed account aborts outstanding requests and rejects stale
bootstrap/JSON completion. No session/CSRF metadata is persisted in browser storage.

## Verification

```sh
pnpm --dir packages/web-shared exec vitest run --config vitest.config.ts
pnpm --filter @corely/web-shared typecheck
```

The session tests are also included in the root unit workspace. Backend checks
reuse the disposable PostgreSQL fixture in [SSO testing](../backend/sso.md#reproduce-isolated-checks).
For visual checks, run the test-only browser fixture:

```sh
pnpm --dir packages/web-shared exec vite --config testkit/browser/vite.config.ts
```

At `http://127.0.0.1:5186`, use `?state=booting`, `unauthenticated`, `forbidden`
or `unavailable`; the default is authenticated synthetic data. `app=app-center`
or `app=hr` and `locale=de`/`vi` exercise reuse and translation. The expiry button
returns a simulated 401 through the actual shared client. This fixture never
calls real Identity/business services, sends email or stores tokens. See the
[task record](../tasks/386-shared-session-transport.md) for actual evidence and limits.
