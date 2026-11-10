# 431 — Implemented module catalog and shared navigation

## Tracking and outcome

- [Issue #431](https://github.com/Corely-AI/corely/issues/431).
- Branch: `431-expand-app-catalog`; base: `origin/development` at `5d9d039c`.
- Outcome: replace the two unavailable focused-only tiles with authorized entry
  points to implemented modules; add shared EN/DE/VI selection, app-mark metadata
  and consistent catalog/focused-shell controls.
- Excludes new product modules, planned catalog apps, schema/storage changes,
  deployment, broad auth migration and wholesale redesign of module workflows.

## Reuse and decisions

- Directory metadata lives in the owning manifests. The existing catalog and
  permission/capability-filtered menu composition resolve the exact entry menu ID
  within its app group. Installed dependencies must also be enabled.
- A separate directory destination uses the validated deployment-only
  `CORELY_LAUNCH_LEGACY_ORIGIN` and static implemented route. Invoice/HR launch IDs,
  BFF allowlists and focused availability gates remain intact. A released focused
  client takes precedence; otherwise its existing web route can be opened.
- The seeded local COMPANY workspace has 21 openable destinations. POS-only,
  host-only and infrastructure screens are excluded. Other roles/installations
  may see fewer; listing is not a claim of complete production readiness.
- Legacy sign-in now restores internal deep links. The route guard validates
  workspace hints against discovered memberships and adopts the workspace before
  mounting children. No bearer/session credentials transfer between origins.
- Cards, switcher and focused header share `AppLogo` and semantic token tones.
  `LanguagePicker` is shared with existing shells via `LanguageSelector`. Choice
  persists under the existing preference key and an allowlisted `lang` hint
  carries it across app origins. Existing feature screens remain shared.
- The focused Invoice list/new page no longer repeats a second create action.

## Verification

| Check                                                     | Result and limits                                                                   |
| --------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| API catalog/origin/focused-menu suites                    | 24 passed                                                                           |
| App Center suite, including root build                    | 27 passed                                                                           |
| Legacy auth/workspace guard and return-path suites        | 14 passed                                                                           |
| Shared switcher, shell/draft guards and language controls | 15 passed                                                                           |
| API and focused client typechecks                         | Passed                                                                              |
| Main `apps/web` typecheck                                 | Fails in untouched tenant-app tests, assistant and feature types; not claimed clean |
| Architecture check                                        | Fails on existing repository-wide Prisma/boundary reports; no new persistence code  |
| Changed-file ESLint, Prettier and whitespace              | See PR for final results                                                            |

Browser checks used actual local Docker PostgreSQL and the API, Chrome with normal
certificate validation, synthetic records, 1440×1000 desktop and 390×844 phone.
Verified 21 entries, category/search/no-results, sign-in restoration to CRM with
the chosen workspace, seeded Invoice records, locale changes/reload persistence
in EN/DE/VI, and expanded focused navigation. No live email or financial commands.

## UI/UX evidence

- [Desktop catalog](../frontend/images/app-center-expanded/desktop-en.png)
- [English phone](../frontend/images/app-center-expanded/mobile-en.png)
- [German phone](../frontend/images/app-center-expanded/mobile-de.png)
- [Vietnamese phone](../frontend/images/app-center-expanded/mobile-vi.png)
- [Focused Invoice shared header](../frontend/images/app-center-expanded/focused-invoice-de.png)
- [Focused HR shared header](../frontend/images/app-center-expanded/focused-hr-de.png)

Inspected app-mark alignment, consistent controls/spacing, language persistence,
responsive wrapping and absence of horizontal overflow. Existing unit suites
exercise loading/error/unavailable states and stale navigation/draft protection.
This is representative navigation verification, not an audit of every module screen.

## Configuration and remaining limits

Set the legacy origin only to the retained web client. Production requires HTTPS;
the existing HTTPS/SSO deployment and rollout gates are unchanged. Rollback removes
that variable and/or the directory descriptors without changing records. The local
demo installation overrides are test data and are not shipped migrations or defaults.
