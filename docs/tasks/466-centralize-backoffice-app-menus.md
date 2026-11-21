# #466 Centralized Backoffice app menus

## Tracking and outcome

- [Corely #466](https://github.com/Corely-AI/corely/issues/466)
- Branch `466-centralize-backoffice-app-menus`, base `development`
- Invoice, Expenses, CRM, Tasks, People, and Booking display their app's navigation and an All apps link.
- Dashboard, All apps, account/workspace settings and their details, and Billing share the general sidebar. All apps remains available throughout Backoffice. CRM engagement templates keep the CRM menu.

## Implementation

The shared Backoffice shell selects workspace menu groups by their app IDs. Focused app routes feed the same groups to desktop and mobile navigation and to the command palette. General routes retain the available core, settings, and billing entries. Settings links to the existing authenticated account screen. Billing uses the existing authorized subscription link. Public and unsupported app routes continue through their existing shells.

## Verification

| Check                                                                                                                                                             | Result                                                                                                                                                                                                                |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `docker exec corely_web pnpm exec vitest run --config vitest.config.ts --fileParallelism=false src/app/backoffice-navigation.spec.ts src/app/AppSidebar.spec.tsx` | 30 tests passed.                                                                                                                                                                                                      |
| `docker exec corely_web pnpm typecheck`                                                                                                                           | Web typecheck.                                                                                                                                                                                                        |
| Chromium on `http://localhost:5173`                                                                                                                               | Checked exact sidebar links for all six apps and the path through All apps, Dashboard, Settings, a Classes settings detail, and Billing. Verified desktop and mobile, plus the scoped CRM command palette on desktop. |

## UI evidence

- [CRM app at 1440 × 900](466-assets/crm-desktop.png)
- [Booking app at 390 × 844](466-assets/booking-mobile.png)
- [All apps directory at 1440 × 900](466-assets/apps-general-desktop.png)
- [Dashboard general menu at 390 × 844](466-assets/dashboard-general-mobile.png)
- [Settings sidebar captured at a 1440 × 900 viewport](466-assets/settings-general-desktop.png)

The screenshots use the English UI and the local synthetic demo workspace. API permissions, data, and SSO behavior follow the existing entry points. Full-suite and production verification are outside this local run.
