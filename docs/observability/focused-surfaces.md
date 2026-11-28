# Focused surface diagnostics and pilot runbook

Related to [#403](https://github.com/Corely-AI/corely/issues/403). These are instrumented
local flows and a reproducible release-report artifact. A live collector/dashboard binding,
named operations owner, pilot measurements and approved thresholds are still required.

## Signals and privacy boundary

The shared `FocusedObservationSchema` accepts only finite surface, layer, event, outcome
and destination values, plus an optional UUID request ID. It rejects unknown fields instead
of trying to redact arbitrary payloads. Neither URLs nor tenant/workspace/user IDs, invoice
IDs, credentials, cookies, handoff codes, states, return paths, email fields or private
personnel reasons enter this envelope. Do not add those values as metric dimensions.
`requestId` is only for a restricted diagnostic lookup and is discarded by aggregation.

Server surface labels come from the existing trusted SSO ingress/registration check. An
untrusted ingress becomes `unknown`; client surface headers never grant or establish an app.
Server `focused.http` spans use the `corely.focused` instrumentation scope and current OTLP
setup. Only a W3C traceparent carrier is extracted; no request header map or baggage is
recorded. Existing trace/correlation headers remain unchanged. Valid UUID request IDs are
reused; other diagnostic IDs are replaced for telemetry, and `X-Request-Id` is returned.

The server emits one completed/aborted observation per SSO/session/BFF request, including
short-circuited denials. Browser session transport emits on completion (including streamed
bodies), with intentional cancellation separate from network unavailability. The central
Login page uses the same envelope and UUID header. Authentication and business transport
remain single-attempt; diagnostics never trigger retries, cookie clearing or extra requests.

| Event                                                        | Source and interpretation                                                                                                               |
| ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| `login-start`, `authorize`, `login`, `context`, `email-code` | Protocol stage outcomes; a successful credential check is not yet app arrival                                                           |
| `callback` with `ok`                                         | Server completed the app-session handoff; reject/replay failures remain separate                                                        |
| `session`, `api`                                             | Session/bootstrap and owning business API transport outcomes                                                                            |
| `app-launch`                                                 | Browser revalidated a destination and attempted navigation, or rejected a withdrawn/unavailable grant; not proof of destination arrival |
| `route-not-found`                                            | Focused Invoice wildcard route rendered; no unmatched URL is reported                                                                   |
| `redirect-loop`                                              | Client prevented an auth/session/BFF return-path cycle; not an automatic detector of every external proxy loop                          |
| `legacy-link`                                                | Legacy Invoice route entry, including retained list/detail/edit links; not unique users or a permanent redirect count                   |

401 = `unauthenticated`, 403 = `denied`, 429 = `limited`, other 4xx = `rejected`, 5xx/network
failure = `unavailable`. Ordinary authentication denial and rate limiting are not service
outage spans. Only unavailable server responses set an error status. Aborts stay `aborted`.

## Collection and release dashboard

The default browser sink writes only the validated envelope to `console.info("corely.focused", …)`.
Focused shared clients also expose `installFocusedObservationSink` for the existing approved
browser collector. No new vendor, public ingestion endpoint or monitoring credentials are
introduced. Browser events are not centrally collected until that binding is made. Central
Login currently uses the same console envelope. The API logs JSON messages tagged
`eventName: "corely.focused"` through Nest's existing logger, independently of trace sampling.
Verify actual exporter filtering/retention: `OBSERVABILITY_PROVIDER=none` exports no spans,
and a Copilot-only collector filter may exclude the new scope. Never infer collection from
instrumentation being present.

Export only the focused JSON message envelopes from the approved log/console collector,
filtered to the recorded environment, deployment and pilot time window. Do not export raw
request logs. The report accepts bare envelopes and the server `eventName` wrapper; invalid
records are counted and discarded without printing their content.

```sh
pnpm --filter @corely/contracts build
node scripts/observability/focused-release-report.mjs sanitized-window.ndjson > focused-release.json
node scripts/observability/focused-release-report.mjs sanitized-window.ndjson --html > focused-release.html
node --test scripts/observability/focused-release-report.test.mjs
```

The HTML report is a standalone, offline operator dashboard with no scripts or external
resources. Counts are grouped only by surface/layer/event/outcome/destination. UUIDs are
absent. Keep browser and server populations separate: summing both double-counts transport.
Callback successes and login starts are stage volumes, not unique-user conversion rates.
Polling/reloads affect session and legacy counts. The artifact intentionally displays the
unapproved baseline/threshold gate. Its input window and sampling coverage must accompany it.

The committed [synthetic input](./focused-release-synthetic.ndjson) and
[rendered example](./images/focused-release-report.png) demonstrate the artifact, not a pilot
baseline. Regenerate with that file to review layout without production data.

## Pilot measurement and approval gate

Before any traffic migration, the operator must record:

- Named incident/SSO owner, backend owner, monitoring destination, dashboard viewers and
  retention/access policy; these are not assigned by this change.
- Environment, exact deployed revisions, cohort, observation window and collection/sampling
  coverage separately for browser events, API logs and OTLP traces.
- Per-surface callback success/rejection volumes, API outcomes, launch rejection counts,
  route-not-found counts, prevented cycles and legacy-link volumes, including unknown ingress.
- An agreed rate/count and minimum traffic floor for unavailable responses and callback
  failures, an observation duration, alert recipient and explicit rollback condition.
- Expected ordinary denial/rate-limit traffic and exclusions, with a separate security review
  when abuse is suspected. A lone 403 must not trigger an outage alert.

No production numbers or default pilot success thresholds are invented here. Capture a
baseline on approved staging/controlled traffic, then have the actual owner record the
thresholds and decision alongside the deployment. Missing collection, unknown sampling,
unapproved thresholds or untested rollback keeps #403/#404 acceptance pending.

## Safe diagnostics and response

1. Start with surface, layer, event, outcome and the narrow time window. For one failed fetch,
   use its UUID `X-Request-Id` to find the corresponding server observation/span. Do not copy
   addresses, bearer material, browser storage, cookies or callback URLs into tickets.
2. If `app-launch` is rejected, inspect the authorized catalog/configuration and app enablement.
   If launch was attempted but session/bootstrap is denied, verify the registered origin,
   workspace membership and backend grants through their owners. A visible menu is not access.
3. For callback failures, compare protocol-stage counts and check exact registered callback
   bindings, proxy routing and proof freshness. Replays/cancelled/expired requests can be
   expected rejections. Never diagnose by replaying a captured handoff URL.
4. For 401, offer fresh sign-in. For 403, investigate expected permissions with the app owner;
   expose no private personnel explanation. For 429, honor the existing retry limit. For 5xx
   or network errors, verify issuer/API and ingress availability before escalating service outage.
5. During issuer outage, retain the existing unavailable/retry flow. Existing valid sessions
   remain subject to server checks. Do not clear cookies, auto-retry writes or create a second
   identity path to make the error disappear. Manual Invoice workflows remain unchanged.
6. Investigate a suspected redirect loop using bounded stage counts plus a synthetic browser
   reproduction. The return-path guard blocks known auth cycles, but external ingress loops
   need hosting diagnostics; their full URLs may contain proofs and must stay out of exports.
7. Follow [SSO configuration/rotation](../backend/sso.md) for the existing key semantics.
   Rotating `CORELY_SSO_SECRET` invalidates outstanding proofs; plan reauthentication. Rotate
   private proxy keys in the API and trusted ingresses together. Use owning session/global
   logout/revocation paths; do not delete identity tables or bypass membership checks.
8. Roll back only the approved host/configuration or migration flag following #399/#404's
   verified plan. PR creation is not deployment authorization. Retest old links and sign-in.

## Verification limits

Local tests inject callback completion/replay failure, API denial/outage, unknown ingress,
collector failure and invalid/private event metadata. Existing session tests cover streaming
and cancellation. Staging failure injection, dashboard access checks and external exporter
capture still require the approved hosting/monitoring access. Individual request correlation
works; no auth transaction identifier is logged to join separate top-level cross-origin
navigations. Use controlled synthetic reproduction for that transition and validate the
monitoring integration before claiming end-to-end distributed traces.
