# Operational package configuration

[PLAT-01 / #301](https://github.com/Corely-AI/corely/issues/301) composes a
configuration view for the existing OpenBuk client, following the
[replacement decision](../products/corely/pilot-booking-decision.md).
[PLAT-03 / #303](https://github.com/Corely-AI/corely/issues/303) consumes that
configuration in the OpenBuk staff shell on Backoffice.

## Request and compatibility

An authenticated workspace member can request:

```http
GET /workspaces/:workspaceId/config?scope=web&packageId=internal-operations
```

The shared `workspacesApi.getWorkspaceConfig` client accepts the same optional
`packageId`. This selects a response view only: it grants no permissions,
persists no package selection, enables no apps and changes no workspace kind.
The existing trusted surface and workspace-access checks still apply. The view
uses the existing platform/app surface identity and names `openbuk-web` as its
client; POS/CRM requests for this package are rejected. Omitting `packageId`
retains existing personal/company/POS/CRM configuration behavior.

The response adds `operationalPackage`. Booking contributes Schedule, People
contributes the staff profile as Team, and Tasks contributes Daily Work.
Schedule uses `/openbuk/app`, Team uses `/openbuk/app/me`, and Daily Work uses
`/openbuk/app/tasks`. The calendar, settings and checklist template links remain
valid. Decisions and Knowledge acquire actionable shell links when their owners
publish an authorized contribution for `/requests/inbox` and `/knowledge`,
respectively. Those links carry the selected workspace and interface language
through the existing Backoffice route guard.

The staff shell uses the verified workspace configuration and the existing
owning APIs. It offers a keyboard skip link, reports unavailable sections and
offline status, and provides a retry on failed configuration and schedule
reads. Current OpenBuk setup and staff invitations still use their existing
authorization. Manual operations use their existing commands and work with AI
disabled.

The operational configuration has a separate menu response. Selecting its
view does not persist a package selection; the [pilot setup
workflow](pilot-setup.md) owns opt-in and setup.

## Existing owners and independent gates

Existing app manifests may contribute `operationalExperiences`. This metadata
is composed through the existing registry, dependency resolver, experience
targeting evaluator, workspace configuration and effective entitlement service.
It creates no app framework, domain owner, deployment, billing product or table.

| Control                  | Meaning in the configuration                                                                                                                                                                                                            |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tenant installation      | The actual app must be installed and enabled through existing Platform APIs. Reading package config never installs it.                                                                                                                  |
| Effective app enablement | Existing tenant feature defaults/overrides must also enable the app. An installed app alone is insufficient.                                                                                                                            |
| Dependencies             | Existing direct/transitive manifest dependencies must be resolvable and enabled. Missing, cyclic or disabled dependencies produce unavailable state.                                                                                    |
| Workspace capabilities   | The package view allows multi-user, RBAC and basic Booking; other capability flags are false. A capability does not grant a permission or prove an implementation exists.                                                               |
| User access              | Existing workspace membership is required. Contributions use the existing targeting evaluator for required permissions. Initial OpenBuk appointment access additionally requires owner/admin membership, matching its current use case. |
| Product entitlement      | The Booking contribution requires `openbuk.booking.enabled`, now registered with the existing feature catalog. Existing product-plan values and tenant overrides determine its effective value independently of `app.booking.enabled`.  |

OpenBuk's existing free product remains sufficient. No Accounting, payroll,
customer invoice module or paid finance subscription is required. The existing
effective-entitlement resolver still reads billing plan features through its
public interfaces; this change does not bypass or replace it.

An unavailable experience has an explicit reason and no actionable route:
`not-implemented`, `app-disabled`, `dependency-unavailable`,
`workspace-capability-disabled`, `permission-denied` or `product-not-entitled`.
This is navigation/configuration evidence, **not backend authorization**. Owning
commands must enforce their actual access and business invariants independently;
[PLAT-02 / #302](https://github.com/Corely-AI/corely/issues/302) owns the broader
operational access slice. No claim is made that legacy Booking writers or all
public endpoints enforce every metadata gate already.

## Disabled optional apps

Disabling an optional app continues to use the existing `DisableAppUseCase`:
installation/configuration and domain records remain, and effective navigation
omits the disabled app. Legacy config bootstrapping now distinguishes an absent
install from an existing disabled install, so fetching config cannot silently
re-enable an explicitly disabled default app. The operational view does no
default bootstrapping at all. Re-enable explicitly through the established app
management API; do not delete finance records to adopt operations.

## Evidence and limits

The configuration integration suite uses real manifests, dependency/experience/
menu resolution, effective tenant entitlements, the read adapter, disable use case
and workspace-config use case, with in-memory persistence and synthetic identities.
It covers independent gate failures, unchanged legacy defaults, disabled-record
preservation, invalid scopes, workspace isolation and request compatibility.
It performs no PostgreSQL, provider, public-browser or migration acceptance.

See the [configuration task record](../tasks/301-compose-operational-package.md)
and the [staff shell task record](../tasks/303-operational-shell.md) for the
checks run against each change.
