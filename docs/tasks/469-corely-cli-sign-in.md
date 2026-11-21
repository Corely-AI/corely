# 469 Corely CLI sign-in and workspace selection

- Issue [#469](https://github.com/Corely-AI/corely/issues/469) under epic [#468](https://github.com/Corely-AI/corely/issues/468).
- Branch `469-corely-cli-sign-in` targets `development` at `2a9937de7`.
- Delivers pilot packaging, browser sign-in with PKCE, log out, workspace discovery, and `whoami`.
- The CLI credential has a distinct session audience. Identity uses the existing SSO transaction, family, and app session tables. Workspaces provides current membership-filtered results. No business-record migration is required.
- See [CLI setup and rollback](../backend/corely-cli.md) for the pilot flag, ingress, and package commands.

## Verification

| Check                                                                                                                                                                                                                         | Result                                                                                                                                                                                               |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm --filter @corely/cli typecheck` and `pnpm --filter @corely/cli build`                                                                                                                                                   | Passed.                                                                                                                                                                                              |
| `pnpm build:api` and `pnpm --filter @corely/api typecheck`                                                                                                                                                                    | Passed.                                                                                                                                                                                              |
| `pnpm --dir services/api exec vitest run src/modules/identity/__tests__/sso.int.test.ts src/modules/identity/__tests__/sso-security.spec.ts src/modules/identity/__tests__/cli-sso.int.test.ts --maxWorkers=1 --minWorkers=1` | 38 tests passed across scoped runs using a disposable PostgreSQL database. Coverage includes verifier and state binding, replay, browser consent, workspace membership removal, and CLI-only logout. |
| `pnpm pack` followed by clean npm install and `corely --help` / `--version`                                                                                                                                                   | Passed on Windows and in a clean Node 22 Linux container. Noninteractive login returned `INTERACTION_REQUIRED` as a single JSON result.                                                              |

## UI/UX evidence

- [Consent with keyboard focus](469-assets/browser-consent.png) shows the response from the CLI consent route rendered in Chromium at 1000 × 650. Tab moved focus to Continue.
- [Expired sign-in](469-assets/browser-expired.png) shows the rejected consent response at 390 × 680 with a visible alert.
- The browser renders the server's actual responses. HTTP integration exercises the handoff, exchange, and logout. The packaged CLI launch through a user's default browser and real OS credential store remains an interactive verification item.

## Impact

Pilot activation requires the CLI flag and routing for `/sso/cli/*` on the registered login origin. Existing browser sign-out still revokes the central session family. CLI sign-out revokes only its own session.
