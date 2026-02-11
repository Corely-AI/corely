# Apps Menu Matrix

This document lists all app manifests and their menu contributions.

Source of truth:

- `services/api/src/modules/*/*.manifest.ts`
- `services/api/src/modules/platform/application/services/workspace-template.service.ts`

## App -> Menu Items

| App ID            | App Name            | Menu Items (`id -> route`)                                                                                                                                                                                            |
| ----------------- | ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ai-copilot`      | AI Assistant        | `assistant -> /assistant`                                                                                                                                                                                             |
| `cash-management` | Cash Management     | `cash-management -> /cash-registers`                                                                                                                                                                                  |
| `catalog`         | Catalog             | `catalog-items -> /catalog/items`                                                                                                                                                                                     |
| `classes`         | Classes             | `teacher-dashboard -> /dashboard/teacher`; `classes-groups -> /class-groups`; `classes-sessions -> /sessions`; `classes-billing -> /billing`                                                                          |
| `cms`             | CMS                 | `cms-posts -> /cms/posts`; `cms-comments -> /cms/comments`                                                                                                                                                            |
| `crm`             | CRM                 | `crm-deals -> /crm/deals`; `crm-activities -> /crm/activities`                                                                                                                                                        |
| `core`            | Core                | `dashboard -> /dashboard`                                                                                                                                                                                             |
| `expenses`        | Expenses            | `expenses -> /expenses`                                                                                                                                                                                               |
| `invoices`        | Invoices            | `invoices -> /invoices`                                                                                                                                                                                               |
| `issues`          | Issues              | `issues -> /issues`                                                                                                                                                                                                   |
| `parties`         | Clients & Customers | `clients -> /customers`; `students -> /students`                                                                                                                                                                      |
| `platform`        | Platform            | `platform-settings -> /settings/platform`                                                                                                                                                                             |
| `portal`          | Portal              | No staff web menu items (`menu: []`)                                                                                                                                                                                  |
| `portfolio`       | Portfolio           | `portfolio-showcases -> /portfolio/showcases`                                                                                                                                                                         |
| `purchasing`      | Purchasing          | `purchase-orders -> /purchasing/purchase-orders`; `purchasing-settings -> /purchasing/settings`                                                                                                                       |
| `rentals`         | Vacation Rentals    | `rental-properties -> /rentals/properties`                                                                                                                                                                            |
| `sales`           | Sales               | `quotes -> /sales/quotes`; `projects -> /projects`; `sales-settings -> /sales/settings`                                                                                                                               |
| `tax`             | Tax                 | `tax-center -> /tax`; `tax-filings -> /tax/filings`; `tax-payments -> /tax/payments`; `tax-documents -> /tax/documents`; `tax-settings -> /tax/settings`                                                              |
| `website`         | Website             | `website-sites -> /website/sites`                                                                                                                                                                                     |
| `workspaces`      | Workspaces          | `workspace-settings -> /settings/workspace`; `payment-methods-settings -> /settings/payment-methods`; `profile-settings -> /settings`; `workspace-members -> /settings/members`; `workspace-roles -> /settings/roles` |

## Freelancer Mode Defaults

Freelancer mode maps to workspace kind `PERSONAL`.

Default enabled apps are defined in `WorkspaceTemplateService.getFreelancerEnabledApps()`:

- `core`
- `platform`
- `workspaces`
- `invoices`
- `expenses`
- `parties`
- `crm`
- `tax`
- `portfolio`
- `website`
- `cms`
- `ai-copilot`
- `classes`

## Entitlement Defaults for Freelancer Financial Apps

To ensure freelancer defaults include finance menus, these app manifests explicitly default to enabled entitlement:

- `invoices`: `entitlement.defaultEnabled = true` (`app.invoices.enabled`)
- `expenses`: `entitlement.defaultEnabled = true` (`app.expenses.enabled`)
- `tax`: `entitlement.defaultEnabled = true` (`app.tax.enabled`)

Notes:

- Existing tenants can still override these defaults via `platform.TenantFeatureOverride`.
- If a tenant has `app.<id>.enabled = false`, that override wins and related menu items are hidden.
