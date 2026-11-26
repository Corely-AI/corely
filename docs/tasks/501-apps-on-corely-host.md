# 501 Open workspace apps on app.corely.one

## Tracking and outcome

- [Issue #501](https://github.com/Corely-AI/corely/issues/501), related to #496 and #497.
- Branch `501-apps-on-corely-host` targets `development`.
- The production web entry opens the workspace directory at `/apps`. Sign-in and app routes stay on the web host. API requests use `api.corely.one`.

## Reuse and implementation

`ListAppLaunchesUseCase` resolves each entry from its existing permission- and workspace-filtered menu group. Its validated relative route works with the existing Backoffice directory and workspace guard. The optional absolute destination still serves separately hosted launchers.

Opening a tile refreshes the authorized catalog. A canceled refresh can return cached data through React Query. The directory requires a fresh query update before navigating. The workspace switcher updates an existing workspace URL hint so the route guard can adopt the new workspace.

## Verification

| Check                                                                    | Result                                                                    |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------- |
| API launch projection, origin provider and menu-controller Vitest suites | 20 tests passed                                                           |
| App Center, workspace scope and guest-only Vitest suites                 | 35 tests passed                                                           |
| Backoffice directory regression suite                                    | 2 tests passed, including cancellation with cached data                   |
| Web and API build and typecheck                                          | Passed                                                                    |
| Architecture check                                                       | The same 57 Prisma boundary findings appear on the base and ticket branch |

## UI/UX evidence

Built web assets were served at the canonical host in isolated Chromium with a synthetic workspace owner and intercepted API responses. The evidence shows the German [desktop directory](../frontend/images/app-center-corely-host/directory-desktop-de.png), [phone directory](../frontend/images/app-center-corely-host/directory-phone-de.png), [launched invoices](../frontend/images/app-center-corely-host/invoices-desktop-de.png), and [empty directory after switching workspace](../frontend/images/app-center-corely-host/empty-workspace-desktop-de.png) at 1440×900 and 390×844.

The browser check covered the canonical root, the four enabled app routes, an Invoice reload, keyboard search, a permission revoked before launch, a workspace change during refresh, and the public OpenBuk entry.

## Rollout

The API must expose `directory.path` before the new web build serves `app.corely.one`. A session from the old focused launcher may require a fresh sign-in. Production verification remains pending.
