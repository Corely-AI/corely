# #511 Backoffice app menus

## Tracking and outcome

- [Corely #511](https://github.com/Corely-AI/corely/issues/511) follows [#466](https://github.com/Corely-AI/corely/issues/466).
- Branch `511-scope-backoffice-app-menus` targets `development`.
- Sign and the other Backoffice directory apps use the workspace menu group for their owning app on entry routes and deep links. The sidebar keeps **All apps**. The command palette uses the same filtered navigation.
- Dashboard, account and workspace settings, and subscription billing use the general menu. Class billing uses the Classes menu. Legacy workspace navigation continues on host administration and routes that have no configured app menu.

## Changes

The existing resolver uses app IDs from the registered workspace menu. The audit covered the 22 current directory entries and 65 platform menu links. Sign Overview is active only on its own route. Sales drops the Projects link because Backoffice has no `/projects` page. Tax payments visibility now also applies to the command palette.

## Verification

- The added resolver cases reproduced the workspace menu fallback before the fix.
- Web navigation, sidebar, Invoice aliases and workspace navigation Vitest suites passed 85 tests. Platform launch and workspace configuration suites passed 6 tests.
- Web typecheck, changed-file ESLint and Prettier checks passed.
- The repository architecture check reports the same existing Prisma boundary findings on the base and this branch.
- Chrome opened all 22 directory entries at desktop and phone sizes, compared sidebar links with the registered app menus, and returned via **All apps**. Dashboard, Settings and subscription billing showed the general menu. The English synthetic workspace verified navigation without production sessions or live business data.
- Sign direct links kept the Sign sidebar across templates, requests, and settings. Opening My signing requests selected it in the sidebar. The Sign and Tax command palettes showed only applicable app links.

## UI/UX evidence

- [Sign overview and expanded sidebar at 1440 × 900](511-assets/sign-desktop.png)
- [Sign navigation drawer at 390 × 844](511-assets/sign-mobile.png)
