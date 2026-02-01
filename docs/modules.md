# System Modules

This document lists the available vertical slice modules in the `services/api` monolith. Each module owns its domain logic, data persistence (via shared Prisma schema), and API surface.

## Foundation

- **`identity`**: User authentication, tenancy, roles, permissions, and session management.
- **`workspaces`**: Workspace lifecycle, settings, and team management.
- **`platform`**: Platform configuration, app installation, and pack management.
- **`customization`**: Custom fields, forms, and tenant-specific configurations.
- **`documents`**: File upload, storage abstraction, and retrieval.
- **`privacy`**: GDPR compliance, data export, and privacy controls.

## Commerce

- **`crm`**: Customer Relationship Management. Deals, pipelines, stages, and activities.
- **`sales`**: Sales orders, quotes, and order lifecycle management.
- **`invoices`**: Invoice generation, PDF rendering, sending, and payment tracking.
- **`payment-methods`**: management of bank accounts and payment methods associated with invoices.
- **`products`**: Product catalog, variations, and pricing (often aliased/linked with inventory).
- **`tax`**: Tax profile configuration, calculation engines, and reporting/auditing.

## Operations

- **`inventory`**: Stock tracking, warehousing, stock movements, and product definitions.
- **`purchasing`**: Purchase orders, vendor management, and goods receipt.
- **`expenses`**: Expense tracking, categorization, and receipt scanning.
- **`projects`**: Project management, tasks, and time tracking (basic implementation).

## Automation & Intelligence

- **`automation`**: Rule engine for triggers and actions (IF this THEN that).
- **`workflow`**: Process engine for state machine transitions and long-running workflows.
- **`approvals`**: Approval gateways for documents (invoices, POs, expenses).
- **`ai-copilot`**: LLM integration, tool execution, and assistant context management.
- **`engagement`**: Communications tracking, email templates, and interaction history.

## Verticals (Apps)

- **`pos`**: Backend logic for Point of Sale (shift management, cash drawer, orders).
- **`cms`**: Content management for public-facing pages or simple tenant sites.
- **`accounting`**: Core ledger, journals, and double-entry accounting primitives.

## Testing

- **`test-harness`**: Utilities for simulation, seeding, and e2e test setup.

---

## Module Structure

Standard module layout:

```text
src/modules/<name>/
├── http/              # Controllers, DTOs
├── application/       # Use Cases, Ports
├── domain/            # Entities, Events, Value Objects
├── infrastructure/    # Prisma Adapters, External Clients
└── index.ts           # Module definition
```
