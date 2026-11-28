# 510. Skeleton loading in the Corely Backoffice

[Issue #510](https://github.com/Corely-AI/corely/issues/510) and [draft PR #513](https://github.com/Corely-AI/corely/pull/513) track the rollout from `510-app-directory-skeleton` into `development`.

The work started with the Apps directory and expanded to Backoffice routes, their shared components, and the standalone entry screens served by the web build. The existing route, query, and permission boundaries determine when each skeleton is shown. Stable screen controls and already-loaded data stay in use during ordinary background refreshes.

The shared UI kit provides a localized status and decorative placeholders for lists, details, forms, cards, calendars, and messages. Tables can keep their headers while the body loads. Screens with custom layouts, including Apps, can compose their own placeholders with the same status and reduced-motion behavior.

New features follow the [frontend skeleton loading standard](../frontend/crud-ui-standard.md#skeleton-loading-for-new-features).

## Verification

- 155 web tests passed on Node 22 across routing, Backoffice navigation, App Center, and Purchasing.
- 46 People and Daily Work tests passed. The web production build, web typecheck, scoped lint, and formatting checks passed.
- Chromium used synthetic workspace and catalog data. Apps was checked at 1440, 820, and 390 px for responsive layout, keyboard navigation, reduced motion, success, empty, retry, and launch revalidation. Products was checked for aligned table placeholders, success, a first-load error, and denied access. Invoice detail was checked for a loading-to-content transition at 390 px.

## Browser evidence

- [Apps loading on desktop](510-assets/apps-loading-desktop.png)
- [Apps loading on phone](510-assets/apps-loading-phone.png)
- [Apps loaded on desktop](510-assets/apps-loaded-desktop.png)
- [Products table loading on desktop](510-assets/products-loading-desktop.png)
- [Invoice detail loading on phone](510-assets/invoice-loading-phone.png)
