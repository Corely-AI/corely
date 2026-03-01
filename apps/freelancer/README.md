# Freelancer App

Dedicated frontend app for freelancer workflows in Corely.

## Scope

- Assistant
- Clients (CRM)
- Invoices
- Expenses
- Tax
- Portfolio (reused from existing implementation)
- Minimal settings (profile/company info, invoice defaults, tax defaults)

## Dev

```bash
pnpm -C apps/freelancer dev
```

## Build

```bash
pnpm -C apps/freelancer build
```

## Typecheck

```bash
pnpm -C apps/freelancer typecheck
```

## Environment

Same API/auth env as `apps/web`:

- `VITE_API_BASE_URL` (optional, defaults to `http://localhost:3000`)

## Shared Packages

- `@corely/web-shared`: providers, shared UI/utilities, workspace/auth infrastructure
- `@corely/web-features`: assistant/crm/expenses/invoices/tax/portfolio feature modules + route/nav metadata
