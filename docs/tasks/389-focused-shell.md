# 389 — Configurable focused shell and app switcher

## Tracking and outcome

- Issue: [SURF-09 #389](https://github.com/Corely-AI/corely/issues/389), parent #380.
- Prerequisites: #383 / PR #408 and #388 / PR #413 merged into development.
- Branch: `389-focused-shell`; base `origin/development`, `8afa0dc325713b03710006e8935dcb4e422c842f`.
- PR: pending publication.
- Outcome: reusable focused shell with scoped links, commands/actions,
  workspace/account controls, switcher, All apps and unsaved-change warnings.
- Exclusions: new client deployments, app enablement, business records, schema
  migrations, rollout and full SURF-10 workspace/cache behavior.

## Reuse and decisions

Reuse web-shared layout/command infrastructure, UI primitives, existing session
transport, catalog schemas and scoped workspace config. Route roots stay
client-owned. Existing full-workspace clients retain `AppShell`.

The administrative catalog requires app-management permission. New read-only
`/menu/launches` reuses the catalog and menu composition to project actual staff
access, without changing grants or install state. Launches refresh at selection.
See [composition and UI evidence](../frontend/focused-app-shell.md).

## Verification

| Command/check                                 | Result and limits                                                                                                                                                          |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Web-shared Vitest suite                       | 59 tests passed across seven files.                                                                                                                                        |
| Platform launch/menu/config/controller suites | 14 tests passed.                                                                                                                                                           |
| Web-shared and API typechecks                 | Both passed on final source.                                                                                                                                               |
| Targeted ESLint, Prettier, whitespace         | Passed on changed files; whitespace and local documentation references checked.                                                                                            |
| Vite browser fixture production build         | Passed with dependency directive and chunk-size warnings.                                                                                                                  |
| `pnpm arch:check`                             | Existing Windows file-URL conversion fails on `D:\D:\Working\Kerniflow\apps\web\src`; script unchanged.                                                                    |
| Manual UI                                     | Synthetic Invoice/HR at 1440×900 and 390×844, drawer, commands/focus, disabled switcher, loading/empty/error, localized chrome, dirty warning and All apps workspace hint. |

The checkout lacked complete dependencies and bcrypt's native binding. Installed
locked dependencies, built required packages, installed bcrypt's published
binding and regenerated the local Prisma client. No dependency version,
environment value or database record changed. No database-backed E2E run claimed.

## Impact and remaining work

The shell is opt-in. Owning clients compose feature routes, operation-authorized
actions and validated workspace/session selection. Their actual multi-origin
integration follows in the corresponding SURF tickets. Screenshots prove the
shared shell only. Keep PR Draft; no merge, release or deployment performed.
