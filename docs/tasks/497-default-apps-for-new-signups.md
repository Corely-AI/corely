# #497 Default apps for new signups

## Tracking and outcome

- [Issue #497](https://github.com/Corely-AI/corely/issues/497) follows the unified workspace experience in [#486](https://github.com/Corely-AI/corely/issues/486).
- Branch `497-default-apps-for-new-signups` targets `development` at `b4ae7c56`. The issue links the delivery PR.
- Owners can open Invoice, Expenses, Booking, and Corely Sign after creating a personal or company workspace.

## Implementation

Signup uses the existing Platform Entitlements service to install the four apps and record their effective enablement. The installer resolves dependencies and audits the changes. Signup saves these records in the same transaction as the account, tenant, and existing signup events. The Corely Sign directory entry uses the existing `/sign` route and its permission-filtered menu contribution.

## Verification

| Check                                                                                    | Result                                                                                                                                            |
| ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm test:int sign-up` with disposable PostgreSQL containers                            | 21 passed, including both legal entity types, invitation acceptance with Sign disabled in the destination tenant, and rollback followed by retry. |
| Targeted API Vitest suites for signup, focused configuration, and entitlement projection | 9 passed.                                                                                                                                         |
| Targeted web Vitest suites for App Center and the app directory                          | 21 passed.                                                                                                                                        |
| `pnpm --filter @corely/api typecheck`, API and web builds                                | Passed.                                                                                                                                           |
| ESLint on changed TypeScript                                                             | Zero errors. The lint configuration excludes test files and reports the existing `any` in the shared idempotency port.                            |
| `pnpm arch:check`                                                                        | The same 57 existing findings as `development` at `b4ae7c56`.                                                                                     |

## Browser evidence

Registered two synthetic workspace owners against a local API and isolated PostgreSQL. In Chromium with the English locale, opened each of the four apps from `/apps` in both the company and personal workspaces. On the phone viewport, the Operations category showed Booking and Corely Sign. Sign's overview loaded with an empty request list in both workspaces.

- [Company workspace app directory at 1440 × 1080](../frontend/images/app-center-signup/company-desktop.png)
- [Personal workspace Operations category at 390 × 844](../frontend/images/app-center-signup/personal-phone.png)

## Impact

App settings belong to the tenant a user joins. Booking requires the existing explicit publication step before it is public. Invoice continues to use the launch policy configured for the environment.
