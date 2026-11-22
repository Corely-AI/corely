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
