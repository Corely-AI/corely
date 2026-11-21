# Upgradeable app customizations

A Booking product release identifies one tested combination of the Booking logic, Booking
confirmation UI, API contracts and Corely source revision. Self-host operators build the
API and web host with the extension versions selected for that installation. App enablement
still records tenant configuration separately from the versions deployed in the API and web host.

Use existing settings for data such as minimum booking notice. Add a typed extension when a
customer needs a rule or UI slot that configuration cannot express. Move framework-independent
logic into a domain workspace package when a concrete extension or second host needs it.
HTTP transport, tenant authorization, adapters, transaction boundaries and module composition
belong to the host. Keep wire contracts in the existing contracts package. Identify the
consumer, data owner, package dependencies, app-enable dependencies and regression coverage
before proposing a subsequent extraction.

| Area                        | Backend owners                                                                                                                  | Registered app IDs                                                           |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Scheduling and team         | booking, people, tasks, issues, portfolio                                                                                       | booking, people, tasks, issues, portfolio                                    |
| Commercial                  | party, crm, crm-mail, engagement, sales, catalog, inventory, purchasing                                                         | parties, crm, sales, catalog, purchasing                                     |
| Finance                     | invoices, expenses, accounting, tax, cash-management, payment-methods, billing, reporting                                       | invoices, expenses, tax, cash-management, billing                            |
| Specialist and POS          | classes, coaching-engagements, rentals, restaurant, pos                                                                         | classes, coaching-engagements, rentals, restaurant, pos-admin, nails, retail |
| Publishing and self-service | cms, website, forms, sign, directory, portal, documents                                                                         | cms, website, forms, sign, directory                                         |
| Platform                    | identity, workspaces, platform, platform-entitlements, platform-custom-attributes, customization, privacy, onboarding           | core, platform, workspaces                                                   |
| Runtime                     | ai-copilot, ai-richtext, approvals, automation, background, workflow, integrations, notifications, import, shared, test-harness | ai-copilot, import                                                           |

The API root and registry establish different boundaries. Portal is wired in the API and has
a manifest outside the registry. The Party module owns customer and supplier identity. Sales
uses Invoice commands and Accounting wiring. People and Tasks share staff operations and
Booking staff availability. The runtime owns outbox processing. These dependencies matter
when choosing future package boundaries.

Backoffice and embedded OpenBuk share the web host. Public web, Portal, Website Runtime,
Landing, Restaurant Listing and POS have their own client entry points. The E2E workspace and
.NET ERiC gateway serve testing and tax integration respectively. Reuse existing UI, client,
integration, POS and offline packages according to their responsibilities.

[Self-host Booking upgrade guide](../products/openbuk/self-host-upgrades.md) · [Self-host Invoice upgrade guide](../platform/invoice-self-host-upgrades.md)
