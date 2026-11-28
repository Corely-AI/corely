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
  const { client, state, logout } = useSession();
  // client.request("/invoices") returns a Response, including streams/downloads.
  // client.json(path, sharedZodSchema) validates a JSON response.
  return <button onClick={() => void logout()}>Sign out of Corely</button>;
}
```

Use `app-center` or `hr` for the other registered surfaces. No per-app auth copy,
provider deployment or business API is required. These package exports and the
synthetic reuse fixture are available; this change does not scaffold or migrate
App Center/Invoice/HR product screens. Future slices must bind their feature API
calls to this client; existing legacy singleton API imports are not silently
redirected to the session transport.

The provider owns a fresh in-memory QueryClient per app/tenant/workspace scope.
It does not mount the legacy offline/persisted-cache stack. New origins do not
touch legacy token storage; explicit old-origin retirement is described below. Tenant/workspace hints are optional configuration, validated by the
server at bootstrap and again on business requests. They confer no authority.
Changing the configuration remounts behind the bootstrap boundary, cancels the
old scope and starts with an empty query cache. Persistent context switching is a separate surface slice. The logout and
old-origin retirement policy is described below.

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

## Sign out, stale tabs and legacy-origin migration (#387)

Use `useSession().logout()` for **Sign out of Corely**. This revokes the current
central session family and all its linked app sessions, including other origins,
with audit/outbox in the same transaction. It does not sign out unrelated device
families. No local-only sign-out is offered. The initiating app cookie is expired;
the central host cookie can remain physically present but its revoked family
cannot issue another handoff. Returning to sign-in requires credentials again.

The provider immediately removes protected children, aborts old reads and clears
queries/mutations. `signingOut` has no action; `logoutFailed` hides private data
and offers **Retry sign out** without automatically logging back in. A lost
response is not reported as confirmed logout. An explicit retry can fail if
another tab has rotated the cookie or the browser has already removed it; close
other tabs and reopen the app to verify the current server session. Do not infer
global logout from merely deleting local storage. Requests admitted before
revocation can finish; requests authenticated after the revocation transaction
commits reject immediately. Already-open server streams are not forcibly ended.

Same-origin BroadcastChannel messages only invalidate UI; they carry no identity,
credentials or authority. Different origins revalidate on focus, visibility
restoration and history restoration. Hidden/history-bound pages conceal protected content from rendering, focus and
history snapshots while retaining same-account local drafts in memory. Restored
pages keep that content concealed until verification succeeds; a changed account
or failed verification unmounts it and clears cached data. Routine focus checks
do not dispose active commands or discard form state.
Metadata verification is non-renewing: only business requests or explicit session
rotation touch idle activity. The 30-minute idle limit therefore still expires an
unattended tab even while it verifies revocation. Visible idle tabs verify every
30 seconds while their browser is scheduling them;
a hung background verification closes the boundary after a further 10 seconds.
This is a foreground polling interval, not a hard wall-clock guarantee for
suspended browsers or a network outage. A request failure closes the boundary;
current tenant/workspace membership is checked on each business request.
Changed accounts remount protected children with cleared caches. Automatic query
refetch on focus/reconnect is disabled so it cannot race account verification. No data or
session is restored from legacy persisted queries on this stack.

A **new** origin needs no legacy migration. When deliberately retiring an old
origin, first close its legacy tabs and stop old offline writers. Then configure
`retireLegacyStorage: true` on `SessionProviders`. Before bootstrap it removes
known legacy token/context keys and Corely-readable local/session-storage caches,
and clears only the `corely_offline.queryCache` store. Storage errors fail closed. When the database is absent, inspection aborts its
creation rather than leaving an empty version-1 schema that would break legacy
initialization during rollback.
If **any** outbox records exist, `migrationBlocked` prevents private content from
mounting, even with an otherwise valid cookie. Every record stays intact.

Legacy commands lack reliable account ownership. Never automatically rebind them
to a new account/workspace, replay them through the session client, or call the
old `clearClientLocalData()` helper (which deletes the outbox). An administrator
must recover/reconcile work under the original identity in the old environment,
or obtain an explicit decision to discard it before removing those records.
Do not export private payloads into logs, screenshots or a different account.
Retry migration only after that reconciliation. Rollback requires fresh legacy
login; retired local tokens and private caches must not be restored.

This is an opt-in migration path, not a global legacy logout: unmigrated browser
origins, old bearer sessions and POS retain their existing token lifecycle. Every
old origin needs its own retirement/cutover verification; a new app cannot erase
another origin's storage. The new session stack never mounts the offline replay
engine. Persistent workspace handoff remains a separate surface/context slice.

To reproduce the real-cookie logout browser coverage, build the test-only shared
fixture before starting the disposable TLS server documented in
[SSO testing](../backend/sso.md#reproduce-isolated-checks):

```sh
pnpm --dir packages/web-shared exec vite build --config testkit/browser/vite.config.ts --base /session-assets/
SSO_BROWSER_CHANNEL=chrome SSO_TEST_OUTPUT_DIR=/private/tmp/corely-387-browser \
  pnpm --dir apps/e2e exec playwright test --config playwright.sso.config.ts global-logout.spec.ts
```

Use a freshly started fixture account for that file, and restart the fixture
before separately running `central-login.spec.ts`. Repeated credential tests
against the same account can exhaust the real five-minute attempt budget. Do not
increase or disable that production limit for tests. The server additionally
serves the shared fixture at `/session?real=true&app=invoice` (or `app=hr`);
this route exists only in the unregistered testkit server. Production entry
points never load it. The default browser support matrix remains a separate
release gate; these checks do not establish WebKit readiness.
