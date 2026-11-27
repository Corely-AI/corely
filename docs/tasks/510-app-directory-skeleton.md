# 510. Skeleton loading in the Corely Backoffice

[Issue #510](https://github.com/Corely-AI/corely/issues/510) and [draft PR #513](https://github.com/Corely-AI/corely/pull/513) track the rollout from `510-app-directory-skeleton` into `development`.

The work started with the Apps directory and expanded to Backoffice routes, their shared components, and the standalone entry screens served by the web build. The existing route, query, and permission boundaries determine when each skeleton is shown. Stable screen controls and already-loaded data stay in use during ordinary background refreshes.

The shared UI kit provides a localized status and decorative placeholders for lists, details, forms, cards, calendars, and messages. Tables can keep their headers while the body loads. Screens with custom layouts, including Apps, can compose their own placeholders with the same status and reduced-motion behavior.

New features follow the [frontend skeleton loading standard](../frontend/crud-ui-standard.md#skeleton-loading-for-new-features). Verification results and browser captures are recorded in the linked draft PR.
