# Shared workspace experience

Solo operators and teams use one workspace configuration. Legal entity kind
(`PERSONAL` or `COMPANY`) remains a business and tax attribute in the existing
contracts. It no longer selects product capabilities, app defaults, terminology,
or dashboard widgets.

## Configuration

`WorkspaceTemplateService` supplies common capabilities and baseline apps.
Optional apps are enabled through existing app management. Existing installs,
including explicitly disabled apps, retain their state. Menu composition still
checks app enablement, entitlements, surfaces, and permissions. Focused launches
and the operational package retain their own scope.

Role controls are available to both legal types. Role administration requires
`settings.roles.manage`. Quick commands are limited to visible navigation routes.

## Business details and expenses

Onboarding collects legal entity type with legal and address details. Workspace
settings show it as business information. Tax strategy selection continues to
use the stored legal entity kind. The compatibility upgrade API remains available
for existing callers, while the product upgrade prompt is removed.

New expenses default to `DRAFT` for both kinds and use the existing submission,
approval and payment transitions. Existing expense statuses and idempotent
responses are retained. Explicit application status overrides remain supported.

## Research

ERPNext documents module visibility, permissions and workflows as separately
configured controls. This informed the choice to reuse Corely app activation,
roles and the existing expense lifecycle.

- [Module visibility](https://docs.frappe.io/erpnext/customizing-module-visibility)
- [Permissions](https://docs.frappe.io/erpnext/permissions)
- [Workflows](https://docs.frappe.io/erpnext/workflows)
