# #402 — focused app UX

- Issue: https://github.com/Corely-AI/corely/issues/402
- Branch: `402-focused-app-ux`
- Base: `development`, inspected at `8768b5e94`.
- Delivery: Draft PR; related work rather than a production-readiness claim.

## Review and fixes

Reviewed the current diff, opt-in token consumers, shared Invoice callers, shell permission
filtering, session locale, command palette defaults and test fixtures. Fixed the findings:
muted/accent contrast, search accessible-name mismatch, unnamed line/VAT/assistant controls,
date field names, keyboard-inaccessible pagination, English-only focused shell/error copy,
clipped 320-pixel shell actions and German customer-selector overflow. Granted navigation
is still filtered by the server scope and route allowlist before label substitution.
No backend access, calculations, sending or storage behavior changes.

## Verification

- Frozen offline dependency install: passed. `@axe-core/playwright` 4.14.0 is a test-only
  MPL-2.0 dependency, compatible with the installed Node 22.21.1 and Playwright 1.57.
- Focused UX browser suite: 21 passed, no skips (en/de/vi; populated list/editor, palette,
  App Center, expired login, loading/error recovery, empty/missing/denied and dirty form).
  Accessibility scans keep all selected WCAG rules enabled.
- Focused Invoice browser regressions: 13 passed, no skips.
- Shared layout tests: 27 passed; Invoice Copilot component tests: 2 passed.
- Invoice, App Center, Login and web-shared typechecks: passed.
- Invoice, App Center and Login production builds: passed; existing bundle-size warnings.
- Invoice rendered-module boundary policy: passed (998 modules).
- ESLint on changed production TypeScript and Playwright config: passed. Browser spec files
  are ignored by the repository lint configuration and are verified by Playwright instead.
- Diff whitespace check: passed. An initial Vitest command from the repository root selected
  no tests; reran from the owning web-shared directory. Initial UX failures drove fixes and
  were rerun. Broad root CI is not claimed green; existing consumer failures remain separate.

## UI/UX evidence and limits

See [verification and screenshots](../frontend/focused-ux-verification.md). Inspected rendered
phone/desktop examples including palette, expired Login, error and unsaved-change modal.
Keyboard checks verify opening/closing and focus restoration, retry and preserving edits.
No native screen-reader, physical touch device, WebKit or deployed-host verification was run.
Repeat on HR when #397/#398 are integrated and HR becomes launchable. Production/staging
bindings and rollout checks depend on #399/#404. No merge or deployment was performed.

## Inline review fix — 2026-11-10

Addressed `discussion_r4522617954`: both general configurations exclude the dedicated `focused-ux` directory, retaining its three server ports and EN/DE/VI projects only in the UX configuration. The same isolation regression used by the other independent PRs failed before the change and passed afterward; it also asserts that legacy specs are still selected.

Fresh verification: isolation regression **1 passed**, general browser/API probes each select **0 UX tests**, dedicated accessibility/locale/state browser suite **21 passed** with no retries. Scoped ESLint, installed Prettier and whitespace checks passed. Self-review checked both collectors and unchanged dedicated projects/servers. Product UI is unchanged by this correction; existing screenshots remain applicable. Publication retains normal signed pre-commit checks and the documented unrelated broad pre-push bypass.

## PR #426 conflict resolution — 2026-11-10

Merged `origin/development` at `7967ee545` into the current UX head `6bb39d7c9`. Resolved five configuration conflicts by retaining both HR and focused UX in the CI browser matrix and Bash selector, all three dedicated-suite exclusions in both general runners, and all dedicated configurations in the E2E TypeScript project. The automatic lockfile merge retains HR's workspace dependencies and the existing test-only axe dependency; a frozen offline install passed without resolution changes.

Fresh verification after resolution:

- Dedicated browser suites: focused UX **21/21**, HR **11/11**, Invoice **13/13**, without retries. This includes EN/DE/VI accessibility/state coverage, account-switch privacy, recoverable HR saves and reviewed Invoice sending.
- Shared layout units **27 passed** and Invoice Copilot units **2 passed**. Frontend policy, bundle-policy and suite-isolation regressions **10 passed**; frontend import scan passed. Both general runners collect **0 cases** from each of HR, Invoice migration and focused UX.
- Bash syntax passed. Stubbed-pnpm selector probes confirmed that both `hr` and `focused-ux` invoke their own browser configuration; actual browser execution is covered above. Existing Windows temporary-cleanup failures in the separate Bash-runner Node tests were not rerun.
- Invoice and HR typechecks, scoped dedicated-config TypeScript, ESLint, Prettier, documentation targets and staged whitespace passed. Invoice production build and its **998-module** bundle boundary check passed; existing chunk-size warnings remain. Full root/general E2E typechecks and CI are not claimed green.
- Fresh synthetic 320×740 Invoice and desktop dirty-form captures were visually inspected. This configuration-only conflict resolution adds no visible behavior; the committed screenshot inventory remains representative. HR's implementation is now in the base, while its launch UX acceptance remains separate.

Self-review verified the CI matrix/selector agreement, preserved all exclusions and projects, and confirmed no new API/HR production changes relative to the base. No further findings. Normal DCO/pre-commit checks are retained, as is the documented broad pre-push baseline bypass; the current PR review state is preserved. No PR merge or deployment.
