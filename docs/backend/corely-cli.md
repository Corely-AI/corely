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

## Daily operations brief

A signed-in manager can run `corely day brief --workspace <id-or-slug>
--date today --json`. For an agent, grant `day.brief` and add
`--tenant <tenant-id> --workspace <workspace-id> --agent <agent-id>`.
For another date, pass `YYYY-MM-DD`.

The brief uses the OpenBuk studio timezone. It reports a UTC default when
there is no accessible studio timezone. Appointments are selected by their
local start date. People supplies neutral coverage checks for confirmed
appointments. Tasks counts all visible outstanding tasks and displays up
to 100 records, including checklist progress.

Each section reports when it began its source read. Sections more than a
minute old at completion are marked stale. Disabled, restricted, and
unavailable sections use an unknown total. A successful empty read returns
zero. Source paths open the owning views in the selected workspace.

## Internal task follow-up

List active staff who can receive a task, then use the returned staff ID as
the owner. Supply an ISO 8601 timestamp with a timezone offset and an
idempotency key unique to the intended follow-up.

```sh
corely tasks assignees --workspace <id-or-slug> --json
corely tasks create --workspace <id-or-slug> --owner <staff-id> \
  --title "Confirm tomorrow's opening coverage" --due 2026-11-23T10:00:00+01:00 \
  --idempotency-key opening-coverage-2026-11-23 --json
```

For agents, grant `tasks.assignees` and `tasks.create` separately and add
`--tenant <tenant-id> --workspace <workspace-id> --agent <agent-id>`.
After an interrupted response, repeat the same request with the same key
to recover the task ID. A changed payload with that key is rejected.
Open the returned `sourcePath` on your Corely Backoffice host to see the
task in Daily Work with the usual workspace and task permissions.

## Reviewed appointment replacement

Start with the booking ID from the daily brief or the studio. Choose a
replacement time with a timezone offset. The current booking must overlap
approved unavailability for its assigned staff member.

```sh
corely appointments propose --workspace <id-or-slug> --booking <booking-id> \
  --start 2026-11-24T11:00:00+01:00 --idempotency-key replacement-2026-11-24 --json
corely appointments status --workspace <id-or-slug> --review <review-id> --json
corely appointments apply --workspace <id-or-slug> --review <review-id> --json
```

Share the returned Backoffice review path with a manager who can sign in
separately and approve the exact time and resource. The approval expires
after 20 minutes from proposal creation. Apply checks the current booking,
staff availability and replacement slot again. A stale result requires a
new proposal and decision. Repeating apply after an interrupted response
returns the recorded result.

Grant agents `appointments.propose`, `appointments.status` and
`appointments.apply` separately according to the work they perform.
Agent commands take `--tenant <tenant-id> --workspace <workspace-id>
--agent <agent-id>`. JSON results expose the workflow state, review link
and booking version when the change is applied.

## Reviewed customer email

Use the applied appointment review ID to draft an email. Corely uses the
confirmed booking time, studio locale and current guest email. An optional
note becomes part of the content shown to the manager.

```sh
corely appointments message draft --workspace <id-or-slug> --review <appointment-review-id> \
  --idempotency-key notify-2026-11-24 --note "Please confirm the new time." --json
corely appointments message queue --workspace <id-or-slug> --review <email-review-id> --json
corely appointments message status --workspace <id-or-slug> --review <email-review-id> --json
corely appointments message retry --workspace <id-or-slug> --review <email-review-id> --json
```

Have a manager open the new Backoffice review link and approve its exact
recipient, subject and body. Queue then records the send for the background
worker. A different note needs a new review. A changed booking version or
recipient invalidates the approved send.

Agents need the corresponding `appointments.message.draft`,
`appointments.message.status`, `appointments.message.queue` or
`appointments.message.retry` grant. The CLI keeps appointment and email
status separate. `accepted` records provider acceptance. An eligible
failed delivery can be retried using its original delivery identifier.
