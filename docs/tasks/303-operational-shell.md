# 303 OpenBuk operational shell

## Tracking and outcome

- [PLAT-03 / #303](https://github.com/Corely-AI/corely/issues/303) belongs to [EP-PLATFORM / #282](https://github.com/Corely-AI/corely/issues/282). Prerequisites [#301](https://github.com/Corely-AI/corely/issues/301) and [#302](https://github.com/Corely-AI/corely/issues/302) are integrated.
- Branch `303-operational-shell` targets `development` at `87563c122`.
- OpenBuk uses a focused, workspace-authorized staff shell for Schedule, Team and Daily Work. Existing calendar, setup, profile and checklist links remain valid. New accounts reach branded setup before they have a workspace.
- Decisions and Knowledge have guarded entry points for their existing owner routes. The owners enable those links when their modules contribute the routes.

## Reuse and plan

The shell consumes the [operational package](../platform/operational-package.md) with the existing OpenBuk authentication and workspace selection. It uses People self-service and Tasks through public shared exports, and Booking retains ownership of the schedule and studio settings. Scope includes navigation, loading, retry, offline and no-access behavior.

## Verification

| Command or manual check                                               | Result and limits                                                                                                                                                                                                                          |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Four Web Vitest suites for OpenBuk, navigation and auth               | 97 tests passed.                                                                                                                                                                                                                           |
| Platform operational-package configuration suite                      | 10 tests passed with in-memory persistence.                                                                                                                                                                                                |
| `pnpm build:web` and scoped builds                                    | Web and API builds passed.                                                                                                                                                                                                                 |
| OpenBuk locale parity                                                 | Ten catalogs have matching nonempty keys. Repository-wide locale checking reports the same 602 pre-existing findings on this branch and its base.                                                                                          |
| Chromium against the production Web build with synthetic API fixtures | Desktop manager and mobile member, loading, schedule failure and retry, keyboard skip link, manual task completion with no Copilot calls, offline status and unavailable Knowledge destination. The task and schedule were fixture-backed. |

The changed-file formatting, lint and whitespace checks passed. The review uses focused checks with the repository's documented pre-push override. The full DB-backed OpenBuk browser suite is outside the browser evidence here.

## UI/UX evidence

- [Desktop schedule, 1365 × 900, EN](303-assets/desktop-schedule.png)
- [Desktop schedule loading, 1365 × 900, EN](303-assets/desktop-loading.png)
- [Mobile Daily Work, 390 × 844, DE](303-assets/mobile-daily-work-de.png)
- [Mobile unavailable section, 390 × 844, DE](303-assets/mobile-unavailable-de.png)

## Impact and remaining work

The configuration adds optional experience IDs and reads. The data model needs no migration. Requests and Knowledge own their navigation contributions, record access and workflows. The shell continues to use current backend authorization for each action.
