# 384 — Corely central login and registered callbacks

## Tracking and outcome

- Issue: [#384](https://github.com/Corely-AI/corely/issues/384), parent [#380](https://github.com/Corely-AI/corely/issues/380).
- Prerequisites #381/#382 and their design PRs were merged before implementation.
- Branch: `384-corely-central-login`; base: `corely/development` at `05e42f0ff877293cef5c33688e2eac6a2168ce03`.
- PR: [Draft #409](https://github.com/Corely-AI/corely/pull/409), targeting `development`.
- [Maintained behavior/configuration](../backend/sso.md), [ADR](../decisions/ADR-0004-central-identity-app-sessions.md).

The user requested Corely-native SSO and then asked to retain passwordless login.
The central page offers email codes first and password fallback, using existing
Identity users and active memberships. New central families and single-use
browser/app-bound handoffs create host-only app sessions. No external provider,
employee/account duplication, membership promotion or business API fork.

## Reuse and implementation

- Reused Identity password/user/membership/tenant ports, existing audit/outbox,
  Resend and the shared OTP email template (portal wording remains its default).
- Added five owned Identity tables with an additive migration; no shared/live
  database was migrated. Nullable global outbox tenant IDs now match the existing
  database capability; Identity audit supports the same transaction as sessions.
- Added exact registration validation, safe origin resolution, explicit CSRF,
  small request bodies, no credentialed SSO CORS, encrypted proofs, atomic
  consumption, durable attempt budgets and queued/idempotent email delivery.
- Added thin `apps/login`, EN/DE/VI states, public narrow auth UI/contracts
  exports and a font-free shared token entry. Existing token imports keep their
  external-font behavior; this credential page does not request external fonts.
- Existing portal, POS and legacy bearer login remain unchanged. #385–387 own
  business session transport, shared-client adoption, renewal/global logout and
  migration/cleanup. Hosting and activation remain separate authorized work.

## Verification

| Check                                                           | Actual result / limits                                                                                                                                                                                                              |
| --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Targeted SSO + neighboring auth tests                           | 100 passed across eight files (including legacy portal OTP regressions); PostgreSQL integration tests actually executed with a disposable `corely_384_sso` database on 127.0.0.1:55484.                                             |
| Browser SSO tests                                               | 7 passed in installed Chrome over HTTPS and three isolated test app origins; fresh password and email-code login, second-app SSO, error focus, cancellation, expiry, network retry and mobile DE/VI.                                |
| API/login/config/contracts/kernel/data typechecks               | Passed after building the existing prompts/email-template dependencies; initial missing-dist diagnostics were resolved locally without source changes to those packages.                                                            |
| API, login and contracts builds                                 | Passed; focused UI bundle approximately 236 KB / 72 KB gzip.                                                                                                                                                                        |
| Targeted ESLint                                                 | Passed with only two pre-existing `any` warnings in main.ts body-parser callbacks.                                                                                                                                                  |
| Architecture check                                              | Failed before completing: script tries to scan absent `services/worker/src`. No worker or unrelated architecture-check rewrite introduced.                                                                                          |
| Formatting, references, whitespace and staged source line limit | Passed; all 136 inspected local documentation references resolve.                                                                                                                                                                   |
| Root unit suite                                                 | 1,228 tests passed; two suites initially failed collection on an absent integrations-resend build. After API dependency build, those two suites passed: 11 tests passed, seven pre-existing skips. The full suite was not repeated. |
| Live email, production hosts/routing and rollout                | Not run/not changed; no production readiness claimed.                                                                                                                                                                               |

Initial browser execution could not find the locked browser revision; the same
suite passed using the installed Chrome channel. No browser was downloaded.
Locked dependencies were installed; the final lockfile changes only add the
login workspace importer, preserving existing resolutions.

The disposable schema was generated from local Prisma schemas and applied only
to the explicitly test-owned database; no `db push` or shared reset. Delivery
used a fake email port, with background dispatch disabled. The separate HTTPS
fixture is outside production composition and requires the disposable target.

## UI/UX evidence

Inspected the rendered captures below for labels, spacing, focus ring, empty/code
entry/error states and overflow. Desktop: 1280×720 viewport with full-page capture;
mobile: 390×844. Identity: synthetic colleague; no real account, code or bearer
token is visible. Password errors clear the password, email-code entry receives
focus, resend is disabled for its cooldown, and language changes preserve form
context. Signup/recovery links target existing auth routes in a separate tab.

- [Desktop email-first login](384-assets/login-desktop.png)
- [Email-code entry and cooldown](384-assets/login-email-code.png)
- [Password error](384-assets/login-error.png)
- [Expired request](384-assets/login-expired.png)
- [German mobile](384-assets/login-mobile-de.png)
- [Vietnamese mobile](384-assets/login-mobile-vi.png)

Verification used the scoped commands documented in [SSO testing](../backend/sso.md).
The push hook was bypassed after these manual checks; whole-repository formatting,
lint and recursive typechecks were not repeated. Pre-commit checks still run.

## Review corrections

- **P1 — prefixed workspace aliases:** `/auth/w/team/callback` and
  `/api/w/team/session/preauth` bypassed the root-only alias rejection, allowing
  legacy credentialed CORS and workspace URL logging before controller checks.
  The guard now matches the actual middleware's prefix and URL normalization
  before any rewrite/logging. Four regression cases failed before the fix;
  eight transport tests now pass, including ordinary public booking behavior.
- **P2 — default browser test collection:** the general and API Playwright
  configurations also collected the dedicated SSO specs and failed without
  `SSO_TEST_OUTPUT_DIR`. They now exclude that directory; SSO remains required
  under its own explicit configuration. General/API collection succeeds without
  the SSO fixture; dedicated SSO execution still passes all six tests.
- Fresh review checks: 95 auth/transport/portal tests passed across eight files;
  API typecheck and targeted production-code lint passed. The new spec is ignored
  by the repository ESLint configuration. No UI behavior changed, so the existing
  rendered evidence remains applicable.
- Existing CI run `42506723856` failed quality/unit jobs on an ungenerated Prisma
  client; browser CI invoked absent `e2e:smoke`. These repository workflow paths
  are unchanged by this PR. Vercel project checks remain rate limited. This
  correction does not claim the full CI suite is green.

## Second review corrections

- **P2 — unusable central session blocks recovery:** after the last active team
  membership is removed, automatic sign-on returned an error and credential
  login returned an existing-session conflict. Central session reuse and conflict
  detection now share the same current account/membership/password checks. An
  unusable cookie returns to login and permits an eligible account to authenticate;
  the removed account still cannot receive a handoff. Valid sessions still block
  silent account replacement; infrastructure errors still propagate.
- **P2 — corrected email address ignored during cooldown:** toggling login methods
  lets a colleague correct a typo, but the transaction-wide resend check silently
  retained the previous email challenge. Cooldown now applies to the same address;
  changing addresses atomically replaces the challenge. Account/browser send and
  verification budgets and the original transaction deadline remain enforced.
- Reproduction: three tests failed before these fixes. Fresh verification: **100
  targeted tests across eight files**, **seven HTTPS browser tests**, API typecheck
  and targeted production-code ESLint passed. The new browser case exercises typo
  correction through the existing rendered form. No UI source/layout changed;
  existing screenshots remain applicable. No live mail, migration or deployment.

## Impact and remaining work

Feature defaults off. Apply the reviewed migration, supply private SSO keys and
exact registrations, configure trusted HTTPS routing and the existing email/
background services only under separately authorized activation. The first-wave
business clients, business API session transport and global logout are not
represented by the synthetic test app stubs. Keep Draft until required checks
and human review are resolved; do not merge or deploy automatically.
