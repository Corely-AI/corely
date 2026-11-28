# #464 Tenant admin sessions

## Tracking and outcome

- [Corely #464](https://github.com/Corely-AI/corely/issues/464) and [Draft PR #465](https://github.com/Corely-AI/corely/pull/465)
- Branch `464-tenant-admin-session`, base `development`
- A host with `platform.tenants.access` can open an active tenant from its row using the tenant's current system Admin grants and the host's own identity.
- The session lasts until explicitly ended and does not create tenant or workspace memberships.

## Implementation

Identity stores a digest of the separate session credential in extension storage, and writes the start and end to the target tenant audit log in the same transaction as the state change. Explicit termination serializes updates for the same session. Authentication rechecks the actor, host permission, target tenant and Admin role. Workspace discovery and the Backoffice shell preserve tenant scope. The browser uses the existing host credentials on return and keeps the admin credential tab-local, including across reloads. See [Authentication and Identity](../backend/AUTH.md).

## Verification

| Check                                                                                   | Result                                                                                                                                                                                                                                                                                          |
| --------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API and web `pnpm typecheck`                                                            | Passed in the local Linux containers.                                                                                                                                                                                                                                                           |
| Identity Vitest suites `tenant-admin-sessions.spec.ts` and `operational-access.spec.ts` | 23 tests passed across the two suites.                                                                                                                                                                                                                                                          |
| HTTP smoke test against isolated PostgreSQL                                             | Tested authorized creation, tenant-member denial, foreign tenant/workspace denial, host-endpoint denial, workspace Admin role, concurrent explicit end, refusal of reused credentials and preserved host scope. SQL confirmed zero duplicate end events and zero new memberships for the actor. |
| Backoffice in Chromium                                                                  | Tested a keyboard start from the German tenant list, the target dashboard, session retention across reload, the mobile return action and the restored tenant list.                                                                                                                              |

## UI/UX evidence

- [Tenant list at 1440 × 900](464-assets/tenant-list-desktop.png)
- [Tenant session at 1440 × 900](464-assets/tenant-session-desktop.png)
- [Tenant session at 390 × 844](464-assets/tenant-session-mobile.png)

## Impact and remaining work

Existing host roles need the new explicit grant. The maintenance script for configuring a platform superadmin includes it. Workspace creation still requires a permanent tenant membership. The preview used a separate Docker database with synthetic tenants. Full-suite, other locales and deployed SSO were outside this verification run.
