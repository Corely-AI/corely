# #511 Backoffice app menus

## Tracking and outcome

- [Corely #511](https://github.com/Corely-AI/corely/issues/511) follows [#466](https://github.com/Corely-AI/corely/issues/466).
- Branch `511-scope-backoffice-app-menus` targets `development`.
- [Draft PR #514](https://github.com/Corely-AI/corely/pull/514)
- Sign and the other Backoffice directory apps use the workspace menu group for their owning app on entry routes and deep links. The sidebar keeps **All apps**. The command palette uses the same filtered navigation.
- Dashboard, account and workspace settings, and subscription billing use the general menu. Class billing uses the Classes menu. Legacy workspace navigation continues on host administration and routes that have no configured app menu.

## Changes

The existing resolver uses app IDs from the registered workspace menu. The audit covered the 22 current directory entries and 65 platform menu links. Sign Overview is active only on its own route. Sales drops the Projects link because Backoffice has no `/projects` page. Tax payments visibility now also applies to the command palette.

## Verification

- The added resolver cases reproduced the workspace menu fallback before the fix.
- Web navigation, sidebar, Invoice aliases and workspace navigation Vitest suites passed 85 tests. Platform launch and workspace configuration suites passed 6 tests.
- Web typecheck, changed-file ESLint and Prettier checks passed.
- The full unit run had 1,641 passes, five frontend failures reproduced on `development`, eight skips, and a local Cash handoff database setup failure. The repository formatting check flagged 34 files outside this change. The draft branch used the documented pre-push override after those checks ran separately.
- The repository architecture check reports the same existing Prisma boundary findings on the base and this branch.
- Chrome opened all 22 directory entries at desktop and phone sizes, compared sidebar links with the registered app menus, and returned via **All apps**. Dashboard, Settings and subscription billing showed the general menu. The English synthetic workspace verified navigation without production sessions or live business data.
- Sign direct links kept the Sign sidebar across templates, requests, and settings. Opening My signing requests selected it in the sidebar. The Sign and Tax command palettes showed only applicable app links.

## Follow-up route audit

- Reviewed 289 Backoffice route patterns and variants, including aliases, create/edit/detail screens, shared settings, and routes that use the dedicated CRM and POS hosts.
- Fixed the scope on mixed-case Invoice URLs, Invoice audit links opened without a query, and the Tax payslip and child income-statement routes.
- The sidebar and command palette now apply the same visibility filter to platform-only links and hidden entries. Platform settings remain available in host administration.
- Compared actual sidebar links on 277 Backoffice routes in Chrome with a synthetic workspace. Also checked dedicated Invoice and HR menus on desktop and phone, CRM and POS web menus, and the standalone OpenBuk public shell.
- Passed 96 Backoffice tests, 23 focused-shell tests, three App Center browser tests, and typechecks for Web and Web Shared.
- The Classes session detail emitted a repeated render warning while the browser fixture returned missing data. Its menu ownership was reviewed from the route configuration.

## UI/UX evidence

- [Sign overview and expanded sidebar at 1440 × 900](511-assets/sign-desktop.png)
- [Sign navigation drawer at 390 × 844](511-assets/sign-mobile.png)
- [Invoice audit opened without a target at 1440 × 900](511-assets/invoice-audit-menu.png)
- [Tax payslip navigation drawer at 390 × 844](511-assets/tax-payslip-menu.png)
