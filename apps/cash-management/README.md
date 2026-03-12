# Cash Management App

Dedicated admin app for cash-management workflows in Corely.

## Scope

- Cash registers
- Cash entries
- Day close
- Cashbook exports
- Minimal operations settings

## Dev

```bash
pnpm -C apps/cash-management dev
```

## Build

```bash
pnpm -C apps/cash-management build
```

## Typecheck

```bash
pnpm -C apps/cash-management typecheck
```

## Environment

Same API/auth env as `apps/web`:

- `VITE_API_BASE_URL` (optional, defaults to `http://localhost:3000`)

## Shared Packages

- `@corely/web-shared`: providers, shell/layout, workspace/auth infrastructure, settings helpers
- `@corely/web-features`: cash-management routes and screens
