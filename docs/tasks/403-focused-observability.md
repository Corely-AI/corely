# #403 — focused surface observability

- Issue: https://github.com/Corely-AI/corely/issues/403
- Branch: `403-focused-observability`
- Base: `development` at `8768b5e94`; this branch does not copy #396/#397/#402 changes.
- Delivery: Draft PR with implementation and local verification. Live monitoring and pilot
  acceptance require the approved destination, owner and thresholds.

## Scope and review

Reused existing SSO registration/security checks, browser session transport, Nest logger and
OTLP setup. Added strict shared event schemas, bounded browser reporting, server spans,
request UUID correlation, app-launch/route/legacy-entry observations and an offline release
report. No new vendor, telemetry ingestion endpoint, database or access policy.

Reviewed the event field inventory, trusted origin resolution, request/body/URL handling,
response streaming/cancellation, existing correlation headers, collector failure behavior,
client imports and report aggregation/rendering. Fixed findings: distinguish 429 rate limits
from outages; classify case/trailing-slash protocol routes consistently; report interrupted
streams once; reject arbitrary metadata; preserve public Invoice/booking routes outside the
legacy usage classification. Existing UI and authorization behavior remain intact.

## Verification

- New event validation and client/HTTP diagnostics plus existing transport/layout/legacy-route
  tests: 57 passed across 6 files, no skips.
- Real PostgreSQL SSO callback success and replay rejection diagnostics: 1 passed, no skips.
  Raw handoff codes, state, transaction proof, cookie and proxy key are absent from events.
- App Center browser regressions: 3 passed; focused Invoice browser regressions: 13 passed.
- Central Login diagnostics browser checks: 2 passed (401/503 and sanitized UUID correlation).
  Development StrictMode aborts are classified separately from completed requests.
- Report aggregation test: 1 passed; synthetic HTML report rendered and visually inspected.
- API, shared browser package and three focused app typechecks: passed, including final API/shared
  rechecks. Contracts and three focused app production builds passed. Scoped ESLint has no
  errors, with two console-info warnings for the intentional bounded browser telemetry sink.
- The broader current SSO session transport file ran 20 passes and 6 failures, independently
  of the new callback diagnostic test. Its transfer probes use `/api/bff/documents/*` through
  Invoice, but the current base deliberately excludes Documents from the Invoice BFF route
  roots. Expected 200/401/413 become 404/connection reset. Do not widen production access to
  make these fixture assertions pass. Reconcile the fixture with the existing boundary in #400.
- Initial owning-package Vitest invocation from the root selected no tests; corrected the
  working directory. Initial diagnostic import alias and callback replay expectation were
  corrected and rerun. No staging/production test or deployment occurred.

## Evidence and pending gates

[Runbook, signal semantics and dashboard reproduction](../observability/focused-surfaces.md)
include [synthetic screenshot](../observability/images/focused-release-report.png). App UI
screens are unchanged; instrumentation is verified by browser behavior and transport tests.
The report is local and offline, not a claim that a production dashboard is provisioned.

Before rollout, bind the approved collector, confirm OTLP scope filtering and dashboard
access/retention, name operations ownership, record the pilot window/collection coverage and
approve actual alert/rollback thresholds. Inject failures on approved staging and validate
cross-origin transitions. Cross-navigation transaction proofs are intentionally not logged;
individual requests correlate by UUID, while full transition reproduction uses synthetic
traffic. Missing answers to these environment/owner questions keep this PR Draft.

## Inline review fix: Login response outcomes — 2026-11-10

Addressed `discussion_r4522618378`: successful Login observations are emitted only after the body is decoded and the existing response/redirect validation succeeds. Non-success statuses retain their immediate bounded classification; malformed JSON/contract responses report unavailable, and a disallowed redirect reports rejected. No origin/CSRF/session policy or event metadata was broadened.

Three browser regressions failed before the fix (malformed 200 JSON, invalid context contract, untrusted redirect all emitted ok). After correction the dedicated suite passes **8 cases**: those failures, 401/503 classification, valid context, trusted handoff and email-code acknowledgement. Navigation diagnostics are captured through a test-only binding before the old console-object context is destroyed; automatic snapshots are disabled. All credentials/URLs are synthetic and API calls intercepted; no mail or live issuer is used.

Fresh checks: Login typecheck/build passed, shared telemetry units **7 passed**, release-report sanitizer **1 passed**; scoped lint has the existing intentional console-info warning and no errors. Self-review traced JSON/body failure, contract failure, abort/timeout and trusted/untrusted redirects; success is recorded once only after validation. Existing UI states are unchanged, so no new layout screenshot is needed. A strict scoped TypeScript check covers the browser spec. Normal signed pre-commit and the documented unrelated broad pre-push bypass are retained.

## Inline review fix: dedicated browser discovery — 2026-11-10

Addressed `discussion_r4522618393`: both general Playwright configurations now exclude `observability`; its dedicated configuration still starts Login on the required port with its own project and retry policy. The shared suite-isolation regression uses the installed Playwright matcher against the actual configuration and confirms that ordinary browser tests remain discoverable.

The regression failed before the exclusions and passes after them. Fresh general-browser and API discovery each report **0 observability tests**; the dedicated browser suite passes **8/8**, without retries. Scoped TypeScript, ESLint, Prettier and whitespace checks pass. Self-review checked both general runners and the dedicated server configuration; no additional findings. This change only selects the test runner, so UI/UX evidence is not applicable.

## PR #427 conflict resolution — 2026-11-10

Merged `origin/development` at `81fe906a2` into the current observability head `d193130b9`, retaining the integrated Invoice migration, HR/privacy and focused UX work. Resolved six conflicts: the CI matrix and Bash runner retain all five browser suites; both general collectors retain all dedicated exclusions; the documentation index retains every entry; Invoice's not-found view keeps both localized copy and its bounded route observation. Reviewed the automatic shell/session/BFF merges: locale/navigation labels, request-local recoverable failures, dirty guards, Invoice route restrictions and HR's read-only permission discovery remain intact.

Fresh verification after resolution:

- Dedicated browser suites: Login diagnostics **8/8**, focused UX **21/21**, Invoice **13/13**, HR **11/11**, App Center **3/3** passed. The initial Login run had **7 passes and one timeout creating a blank page**, before application code ran. After the concurrent compiler checks finished, the full browser sequence passed with unchanged timeouts and no internal retries.
- Targeted telemetry, session/client/provider, shell, legacy-route and API observation units **85 passed**. Policy, bundle, isolation and release-report checks **12 passed**; frontend import scan passed. Each general collector finds **0 cases** from each of HR, Invoice migration, focused UX and observability.
- Frozen offline install, API/Login/Invoice/HR typechecks, dedicated-config/browser-spec TypeScript, scoped lint, formatting, documentation targets and staged whitespace passed. Login production build and Invoice build/bundle boundary check passed (**1,000 rendered modules**).
- Bash syntax and stub-pnpm selection of HR/UX/observability passed; actual browser execution is counted above. Existing Windows cleanup failures in separate Bash-runner Node tests were not rerun. No database-backed SSO integration or broad root/general E2E check was rerun for this conflict update; prior results and baseline failures above remain historical.
- Fresh synthetic German phone Invoice and desktop missing-record captures were visually inspected. Existing UI/UX evidence remains representative; resolving the conflicts preserves the already integrated copy and interactions.

Self-review found no further issues and no expanded telemetry metadata or authorization policy. Normal DCO/pre-commit checks and the documented broad pre-push baseline bypass are retained. Current PR review state and operational acceptance gates remain unchanged; no PR merge, collector provisioning or deployment.
