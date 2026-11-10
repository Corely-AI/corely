# Focused app launch catalog

## Existing module directory

App manifests may also declare a `directory` entry with an existing menu ID,
localized names, category and icon/semantic-tone logo metadata. This is separate
from the focused `invoice`/`hr` launch IDs and never broadens their BFF allowlists.
`GET /menu/launches` resolves each directory entry from its own authorized composed
menu group, checks enabled installations/dependencies, and uses the exact validated
`CORELY_LAUNCH_LEGACY_ORIGIN` plus the implemented static entry route. The origin is
deployment configuration, never tenant-supplied. Missing origin leaves the entry
unavailable. Query, fragment, encoded, auth and API paths cannot be destinations.

The directory remains read-only. Existing focused availability gates and public
routes are unchanged; destinations enforce their own authentication and permissions.
See [App Center](../frontend/app-center.md) for browser behavior and evidence.

The existing authenticated `GET /platform/apps` administration catalog keeps its
`platform.apps.manage` permission and array response (including legacy manifest
extras when there is no tenant context). Each item may now include
`launch`; older manifests and clients can omit/ignore it. Backend dependency
modules remain in the administration catalog, but only an explicit manifest
`launch` or implemented-module `directory` descriptor makes an item a candidate
for a directory tile. Menu presence,
installation, dependency inclusion and the long-term catalog do not do that.

## Identity and availability

The [approved surface plan](../decisions/ADR-0003-focused-app-surfaces.md) maps
`launchId: invoice` to runtime/installation `appId: invoices`, and `launchId: hr`
to `appId: people`. Descriptors live in those existing owners' manifests, alongside
unchanged dependencies, capabilities and permissions. They carry English, German
and Vietnamese display names, Finance/People category keys and shared icon keys.
No records or installation IDs are renamed.

Focused apps are **scoped product contexts within `surfaceId: platform`** in this
slice. The existing `SurfaceId` enum and platform/app aliases remain unchanged,
including POS/CRM hostname handling. `resolveAppLaunchContext` uses exact configured
origins, including scheme and port, for navigation context. It returns no context
for unknown origins; this is not trusted backend request resolution or an access
check. Focused menu filtering and trusted proxy integration belong to SURF-08.

Both descriptors currently declare `coming-soon`: dedicated UIs are not yet
released. No URL is emitted, even with an enabled installation and configured
origin. A future release explicitly changes its owning manifest to `available`.
The catalog then projects:

| Availability   | Meaning                                                           | URL                           |
| -------------- | ----------------------------------------------------------------- | ----------------------------- |
| `coming-soon`  | Focused client not released                                       | Omitted                       |
| `app-disabled` | Released, but installation absent/disabled (or no tenant context) | Omitted                       |
| `unconfigured` | Released and installed, but deployment origin absent/invalid      | Omitted                       |
| `available`    | Released, installed and destination configured                    | Exact configured origin + `/` |

This administration projection is not a user entitlement decision. Effective
feature entitlements, workspace capabilities, user grants and command access
remain independently enforced by their existing owners. App Center's user-facing
listing/access use case must apply those controls before presenting launch actions;
this endpoint does not replace it or install/enable anything on read.

## Deployment configuration

API `EnvService` reads optional `CORELY_LAUNCH_INVOICE_ORIGIN` and
`CORELY_LAUNCH_HR_ORIGIN`. The platform provider validates them through the shared
`AppLaunchOriginsSchema` at initialization, failing startup for malformed or
ambiguous configuration. Both can be absent. Origins must be distinct and exact:
HTTPS, no credentials, paths, query, fragments or wildcards. HTTP is allowed only
on localhost, `.localhost`, `127.0.0.1` or `::1` loopback hosts in development/test
mode. When `NODE_ENV=production` (including deployed staging), all configured
launch origins must use HTTPS; local HTTP values fail startup.

| Environment                  | Invoice                                  | HR                                  |
| ---------------------------- | ---------------------------------------- | ----------------------------------- |
| Production approved plan     | `https://invoice.app.corely.one`         | `https://hr.app.corely.one`         |
| Staging proposal             | `https://invoice.app.staging.corely.one` | `https://hr.app.staging.corely.one` |
| Synthetic local test example | `http://localhost:4301`                  | `http://localhost:4302`             |

These are not activated bindings or verified destinations. Local ports above are
test examples, not a replacement for SURF-18's local origin decision. Provisioning,
TLS, callback/session registration and deployment environment binding remain with
their owning rollout tickets. The checked-in deployment workflow does not bind
these variables; unset values intentionally produce no destination. This change
sets no live configuration and changes no deployment workflow.

`buildAppLaunchUrl` accepts only a known launch ID and validated deployment map.
It has no arbitrary path, return URL, workspace ID or tenant-config input. Unknown
IDs, unconfigured destinations and unsafe origin maps produce no URL. Receiving
surfaces must still authorize tenant/workspace intent through existing use cases.
