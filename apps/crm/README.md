# CRM App

Dedicated frontend app for CRM workflows in Corely.

## Scope

- AI Assistant
- CRM accounts/clients
- CRM contacts

## Dev

```bash
pnpm -C apps/crm dev
```

## Build

```bash
pnpm -C apps/crm build
```

## Typecheck

```bash
pnpm -C apps/crm typecheck
```

## Environment

Same API/auth env as `apps/web`:

- `VITE_API_BASE_URL` (optional, defaults to `http://localhost:3000`)

## Shared Packages

- `@corely/web-shared`: providers, shell/layout, shared UI/utilities, workspace/auth infrastructure
- `@corely/web-features`: assistant/crm feature routes and pages
