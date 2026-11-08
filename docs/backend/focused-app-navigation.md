# Focused app navigation and API access

[Issue #388](https://github.com/Corely-AI/corely/issues/388) extends the existing
platform menu/workspace configuration pipeline. It uses the `invoice` and `hr`
launch IDs from [the launch catalog](../architecture/connected-apps.md); these
remain presentation contexts within the `platform`/`app` web surface. Runtime
owners and installation IDs remain `invoices` and `people`.

## Request and response contract

- `GET /menu?scope=web&workspaceId=<selected>&launchId=invoice`
- `GET /workspaces/<selected>/config?scope=web&launchId=hr`

`launchId` is optional. Omit it for existing broad menus; POS/CRM and operational
package behavior retain their existing paths. Unknown or malformed launch IDs
are rejected. Focused navigation requires the platform/app web surface and
cannot be combined with an operational package selection.

A focused menu includes only contributions whose owning manifest has that launch
ID, filtered through the existing permission, effective tenant enablement,
required-app and capability checks. Its declared dependencies must be enabled;
dependency modules do not contribute their entire navigation. Invoice does not
pull in CRM, People or Accounting menus. Supporting workflows still call their
own APIs under separate permissions. Workspace configuration echoes the launch
ID and omits unrelated default home widgets; current workspace/user metadata
remains available to the future shared shell's account/workspace/app controls.
This adds no client shell, app-switcher UI or new product deployment.

The cookie-session adapter pins menu/config requests on registered Invoice/HR
hosts to the corresponding launch ID and rejects conflicting query selectors.
App Center retains broad discovery or explicit focused requests. Legacy clients
can opt in with the validated query parameter. The menu controller composes the
same resolved workspace selector that AuthGuard authorized, including existing
header-over-query precedence.

Focused configuration reads never install defaults. Legacy menu initialization
still installs missing defaults, but an explicitly disabled install is preserved
rather than silently enabled again.

## Separate backend authority

A launch ID, hostname, menu item or app header is not authorization. Authentication
revalidates tenant/workspace membership; the HTTP operation and owning resource
checks must also pass. Private Invoice endpoints now use the same canonical
permission keys as the existing Invoice tools:

| Operation                                                  | Required permission     |
| ---------------------------------------------------------- | ----------------------- |
| List/detail, existing share-link read, PDF read/generation | `sales.invoices.read`   |
| Create/update draft                                        | `sales.invoices.manage` |
| Finalize/send/create public share link                     | `sales.invoices.issue`  |
| Cancel                                                     | `sales.invoices.void`   |
| Record payment                                             | `sales.payments.record` |

Invoice HTTP routes also require effective `invoices` enablement. Both retained
PDF entry points require `invoices.pdf`. Customer lookup routes retain their
`party.customers.*` permissions and now require effective `parties` enablement.
The existing entitlement guard honors class requirements as well as method
requirements. Invoice/People resource readers retain their owning workspace
filters, including when a user belongs to multiple workspaces. Public invoice
controllers and Booking/OpenBuk are separate routes and are not reclassified.

People's application use cases already verify current membership, operation
permissions, workspace-scoped records and People enablement; they were reused.
Generic document endpoints retain `documents.read/manage`, tenant-scoped storage
and their existing rejection of reserved personnel IDs. Personnel attachments
continue through private People use cases, not generic document APIs. This work
does not convert generic documents to workspace-owned records or claim a global
security audit. The isolated tests cover the listed boundaries; non-HTTP callers
and future supporting flows still need their own owning authorization policies.

## Verification

The task record lists actual runs and limits. Focused menu/config tests exercise
permission/dependency/capability filtering, schema compatibility, preserved
legacy menus, and disabled default installs. Isolated HTTP tests use real signed
JWTs, current membership/grant/workspace repositories, Invoice/People read
adapters and a test-owned PostgreSQL database. Command/delivery sinks and the
entitlement configuration port are synthetic; no email or financial command is
executed. Separate cookie-transport tests verify registered-host context binding.

There is no frontend diff: existing clients omit the optional launch context,
and focused clients/shared-shell rendering belongs to the subsequent surface
issues. UI screenshots are not a substitute for these API denial checks.
