# Multi-origin session and authorization regressions

Ticket [#401](https://github.com/Corely-AI/corely/issues/401). This suite builds the actual Login, App Center and Invoice clients and connects their HTTPS origins to Identity-owned session transport, persisted memberships/grants, workspace authorization, menu composition and Invoice read use cases. It never installs a universal bearer token.

## Reproduce

Use Node 22, the frozen pnpm lockfile, installed OpenSSL and an explicitly disposable local PostgreSQL database named `corely_384_*`. Generate Prisma and build shared packages first. Apply the current Prisma schema to this empty test database; this suite does not prove historical migration deployability. Never point it at an application database.

```sh
pnpm install --frozen-lockfile
pnpm prisma:generate
pnpm build:packages && pnpm build:web-packages
pnpm --dir apps/e2e exec playwright install --with-deps chromium webkit
SSO_TEST_DATABASE_URL=postgresql://postgres:TEST_PASSWORD@127.0.0.1:TEST_PORT/corely_384_browser_ci pnpm --dir apps/e2e exec playwright test --config playwright.multi-origin.config.ts
node --test scripts/ci/sanitized-e2e-reporter.test.mjs
```

On PowerShell set `$env:SSO_TEST_DATABASE_URL` separately. `CORELY_TEST_OPENSSL` may select an existing OpenSSL executable; Windows defaults to Git's bundled executable. The fixture owns ports 8444 and 8445; leave them unused. It refuses non-loopback databases and creates unique synthetic records and a private temporary directory. Normal teardown removes its records, certificate, key and built clients. An interrupted process may leave its own records/directory; discard the disposable database/container and inspect only that run's `corely-401-*` directory. Never broadly delete system temporary files.

The four exact `.corely.test` hostnames use a loopback-only CONNECT proxy with a fixed four-target allowlist. TLS still terminates in the test HTTPS servers; browsers retain actual distinct host cookies and production-like sibling-domain same-site behavior. No DNS, hosts file or certificate trust-store changes are required. Unknown CONNECT destinations and plain proxy requests are denied. Self-signed certificate trust is disabled only in the test browser.

## Proven boundary and exclusions

Two accounts, two distinct tenants and three workspaces exercise fresh login, existing central SSO, bookmarks, refresh, workspace switching, keyboard app switching, All apps, logout, expiry, revoked membership and changed grants. Foreign records, forged tenant/workspace combinations, non-Invoice routes, forbidden BFF APIs, direct APIs and malicious return paths are independently checked. Negative cases compare before/after Invoice record snapshots. Every case resets only the run's own membership/grants, sessions and tracked authentication attempt budgets; production rate limits are unchanged.

The private fixture registry explicitly enables Invoice as a synthetic launch cohort. Production launch metadata is unchanged. HR remains unavailable until #397/#398 are integrated and the People privacy, browser, UX and observability matrices are rerun. Entitlement reads mirror the fixture's installs; this is not a billing integration test. The fixture composes selected real controllers/use cases rather than booting every production module. Invoice records follow the existing repository’s workspace persistence scope; fixture tenant and workspace identities remain distinct throughout authorization.

## Sanitized evidence

The reporter stores only fixed source/line identifiers, browser/status, allowlisted phases and bounded HTTP operation/status pairs. Failure stacks contribute only source line numbers. Raw exception text, URLs/query strings, credentials, session proofs, DOM snapshots and Playwright traces are deliberately excluded. The pinned Playwright build's `PLAYWRIGHT_NO_COPY_PROMPT` setting disables automatic error-context snapshots. A regression test injects secret markers into failures and confirms they never enter output or saved reports.

Only the stable App Center and masked Invoice shell screenshots are captured. Financial content inside `main` is masked. CI uploads only those PNGs and `safe-summary.json`; private metadata, keys, server logs and built clients are excluded. These screenshots document test execution; this ticket does not change product UI. Actual staging CDN/TLS/proxy validation remains #399, and live pilot acceptance remains #404.

## Retained regressions

Run existing SSO integration/transport and focused API authorization suites when changing this fixture. Keep OpenBuk's guarded `openbuk_test_*` database separate; preserve Portal OTP/session tests and the POS API suite's own Testcontainers database. Existing Invoice/legacy-route and focused-client suites remain independent jobs. A passing synthetic flow cannot establish deployment readiness or native screen-reader acceptance.

## Browser defect found by this suite

WebKit rejected sign-in before the credential screen: the browser sent `Origin: null` on `/api/session/login` while retaining the pre-auth cookie. The server correctly rejected that mutation. `SessionClient` combined `mode: same-origin` with the document's `Referrer-Policy: no-referrer`; the [Fetch Standard origin-header algorithm](https://fetch.spec.whatwg.org/#append-a-request-origin-header) permits this null origin outside CORS mode. The client now uses CORS fetch mode for its validated relative API paths, retains `credentials: same-origin`, rejects redirects and keeps server origin/CSRF checks unchanged. No credentialed cross-origin CORS policy was enabled. Both browsers exercise the actual mutation path.
