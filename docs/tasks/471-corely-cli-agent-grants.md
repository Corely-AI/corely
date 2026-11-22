# 471 Scoped CLI agent access

- Issue [#471](https://github.com/Corely-AI/corely/issues/471), epic [#468](https://github.com/Corely-AI/corely/issues/468).
- Branch `471-corely-cli-agent-grants` targets `development` at `3229fd4ef`, which includes the merged CLI sign-in PR [#475](https://github.com/Corely-AI/corely/pull/475).
- Identity stores a workspace-bound credential fingerprint and grant metadata in `ext.kv`. The agent generates and keeps its own secret in the OS credential store. The manager issues a bounded grant with an explicit operation list.
- CLI agent credentials use a separate authorization path. Grant management checks the manager's CLI session. Discovery and execution recheck the grant, expiry, owner or admin role, and current membership. The first operation is `workspace.describe`. The daily brief and task actions are separate tickets.
- Issuance and revocation serialize per grant, commit audit entries in the same transaction, and preserve a revocation record against issuance replay. No schema migration is required.

## Verification

| Check                                                                                     | Result                                                                                                                                                                                                     |
| ----------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm install --frozen-lockfile --ignore-scripts --offline`                               | Passed after restoring the missing `wsl-utils` package and snapshot from the merged CLI lockfile.                                                                                                          |
| CLI build and typecheck, API build and typecheck                                          | Passed.                                                                                                                                                                                                    |
| Focused `cli-agent-grants.int.test.ts`, `cli-sso.int.test.ts`, and `sso-security.spec.ts` | 20 tests passed on disposable PostgreSQL. Exercised cross-scope denial, role downgrade, command allowlisting, expiration, revocation, replay, and audit redaction.                                         |
| Windows CLI integration fixture                                                           | Ran the built CLI through prepare, grant, discovery, execution, revoke and post-revoke denial over HTTPS against the isolated API. Used the Windows credential store and a fixture-issued manager session. |

## UI/UX evidence

[Grant and revoke in the Windows CLI fixture](471-assets/terminal-grant.png) shows selected JSON fields from the actual command responses, with synthetic IDs and fingerprints omitted. A manager exercised grant issuance and revocation. The agent exercised discovery and `workspace.describe`, then received `AGENT_ACCESS_REQUIRED` after revocation.

The feature flag is disabled by default. See [CLI agent setup and rollback](../backend/corely-cli.md#agent-grants).
