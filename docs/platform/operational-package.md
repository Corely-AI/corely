# Operational package configuration

[PLAT-01 / #301](https://github.com/Corely-AI/corely/issues/301) composes a
configuration view for the existing OpenBuk client, following the
[replacement decision](../products/corely/pilot-booking-decision.md).
This is configuration delivery; it does not deliver the operational shell,
employee directory, employee tasks or a pilot-ready booking system.

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

The response adds `operationalPackage`, whose experiences are Schedule, Team
and Daily Work. The current provider is the existing `booking` manifest, with
Schedule pointing to OpenBuk `/app` when available. Team and Daily Work have
`not-implemented` availability and no route or invented app ID. Workspaces
membership administration is not presented as an employee directory; workflow
tasks and CRM activities are not presented as employee Tasks.

The operational view suppresses legacy finance/navigation widgets and menu
groups; the selected client's shell consumes experience descriptors separately.
No existing screen or route switches to this view in PLAT-01. Shell consumption
and rendered navigation belong to [PLAT-03 / #303](https://github.com/Corely-AI/corely/issues/303).
Resumable opt-in/setup and app enablement belong to
[PLAT-04 / #304](https://github.com/Corely-AI/corely/issues/304). Persisting the
selection or automatically opting existing workspaces in is outside this change.

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

The operational shell, staff/task owners, working patterns, private absences,
guest management, delivery consumers and selected import remain their existing
delivery tickets. This configuration does not make those capabilities available.
See the [task record](../tasks/301-compose-operational-package.md) for actual checks.
