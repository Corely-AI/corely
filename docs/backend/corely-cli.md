# Corely CLI

Identity issues Corely CLI sessions through the existing central browser sign-in.
A one-use authorization code binds to the CLI's proof key, state, and loopback
port. The CLI stores the resulting credential in the OS credential store.
CLI logout revokes that credential independently. Central account revocation
continues to apply to its sessions. Workspace commands list current memberships.

## Pilot setup

Enable `CORELY_CLI_AUTH_ENABLED=true` on the API alongside an existing
`CORELY_SSO_ENABLED=true` configuration. The Corely sign-in origin must route
`/sso/cli/*` through the same HTTPS ingress as the existing `/sso/*` routes.
The flag defaults to false. Disabling it blocks CLI requests. The flow uses the
existing Identity SSO tables.

From the repository root, package and install the pilot build with Node
22.19 or newer.

```sh
pnpm --filter @corely/contracts build
pnpm --filter @corely/cli build
pnpm --filter @corely/cli pack --pack-destination .
npm install --global ./corely-cli-0.1.0.tgz
```

Set `CORELY_URL` to the HTTPS origin of the Corely sign-in page, then run the CLI.

```sh
corely auth login
corely workspaces list
corely whoami --workspace <workspace-id> --json
corely auth logout
```

Sign in from an interactive terminal with a browser on the same device.
The CLI selects the sole accessible workspace automatically. For multiple
workspaces, pass an ID or an unambiguous slug. Commands with `--json` emit one
result and return a nonzero exit code on failure. An expired session requires
another interactive sign-in.

## Agent grants

Enable `CORELY_CLI_AGENT_GRANTS_ENABLED=true` together with CLI sign-in to
activate agent issuance and execution. The first operation, `workspace.describe`,
returns the authorized workspace name and IDs. The API rechecks the delegating
account and its current workspace manager role for each discovery and execution.

On the agent machine, using a dedicated OS account, run
`corely agent prepare --tenant <tenant-id> --workspace <workspace-id> --json`.
It returns the agent ID and a workspace-bound fingerprint. The secret remains
in that account's OS credential store. Give the manager the agent ID and
fingerprint through a trusted channel. The manager signs in separately and runs:

```sh
corely grants create --tenant <tenant-id> --workspace <workspace-id> \
  --agent <agent-id> --name "Studio assistant" --fingerprint <fingerprint> \
  --operation workspace.describe --minutes 30
corely grants list --tenant <tenant-id> --workspace <workspace-id>
corely grants revoke --tenant <tenant-id> --workspace <workspace-id> --agent <agent-id>
```

The agent uses its own account and prepared agent ID:

```sh
corely capabilities list --tenant <tenant-id> --workspace <workspace-id> --agent <agent-id>
corely capabilities describe workspace.describe --tenant <tenant-id> --workspace <workspace-id> --agent <agent-id>
corely operations run workspace.describe --tenant <tenant-id> --workspace <workspace-id> --agent <agent-id>
```

Grants last up to 60 minutes. To issue access again after expiry or revocation,
prepare a new agent identity. The API stores the fingerprint and grant metadata
in Identity's workspace-scoped extension storage. Revocation retains a record
so an old credential cannot be reauthorized by replaying grant issuance. Remove
obsolete local entries under Corely CLI Agent using the OS credential store.

For rollback, disable the agent grant flag to stop issuance, discovery, and
execution. Managers can still inspect and revoke existing grants while CLI
sign-in is available. Revoke outstanding grants before enabling the flag again.
