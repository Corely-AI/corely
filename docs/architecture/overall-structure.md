# Corely — Overall Structure (Frontend + Backend)

This document describes the **repo hierarchy** for Corely (pnpm monorepo) and shows file trees using a **true hierarchy format** (folders nested, files indented).

The retained detailed trees below are illustrative conventions, not a complete
current file inventory. For inspected runtime ownership see [repository alignment](../products/corely/repository-alignment.md).
Product apps, modules, surfaces and customer packages differ; see [connected apps](connected-apps.md).
The 32-app map does not authorize new services or frontends.

---

## Top-level layout

```text
corely/
  apps/
    web/                               # Admin web (Vite + React + TS)
    public-web/                        # Public web (Next.js App Router)
    landing/                           # Marketing site (Vite + React + TS)
    openbuk-web/                       # Focused Vite booking product
    freelancer/, crm/, cash-management/ # Focused Vite clients
    portal/, restaurant-listing/       # Other Vite clients
    website-runtime/                   # Next.js website runtime
    pos/                               # Expo + React Native
    eric-wategay/                      # .NET ERiC gateway
    e2e/                               # Playwright test workspace

  services/
    api/                               # Backend API (NestJS)
    # Background lives under api/src/modules/background, not a sibling service.

  packages/
    contracts/                         # Shared FE/BE: schemas + types + enums
    domain/                            # Shared pure domain rules (optional)
    data/                              # Backend-only DB layer (optional)
    ui/                                # Frontend-only design system (shared UI)
    web-shared/                        # Shared providers/clients/layout
    web-features/                      # Public reusable feature exports

  docs/
  assets/
  package.json
  pnpm-workspace.yaml
  tsconfig.base.json
```

---

## Frontend hierarchy (apps/web)

```text
apps/web/
  public/
  src/
    app/
      AppShell.tsx
      router/
        index.ts
      providers/
        index.ts

    modules/
      assistant/
        components/
        screens/
        hooks/
        routes.tsx
        index.ts

      expenses/
        components/
        screens/
        hooks/
        routes.tsx
        index.ts

      invoices/
        components/
        screens/
        hooks/
        routes.tsx
        index.ts

      clients/
        components/
        screens/
        hooks/
        routes.tsx
        index.ts

      settings/
        components/
        screens/
        hooks/
        routes.tsx
        index.ts

    shared/
      api/
        httpClient.ts
        index.ts

      components/
        DataTable.tsx
        Drawer.tsx
        EmptyState.tsx
        Skeleton.tsx
        index.ts

      ui/
        index.ts

      lib/
        format.ts
        idempotency.ts
        permissions.ts
        index.ts

      i18n/
        index.ts
        locales/
          en.json
          de.json

      theme/
        tokens.css
        ThemeProvider.tsx
        index.ts

    assets/
    main.tsx
    index.css

  vite.config.ts
  tsconfig.json
  package.json
```

## Frontend hierarchy (apps/public-web)

Selected current Next.js paths (not the historical Vite shell):

```text
apps/public-web/
  src/
    app/                              # Next.js App Router
      (booking)/book/[slug]/           # Public booking and checkout
      w/[workspaceSlug]/               # Workspace-scoped public journeys
    components/pages/                 # Public booking clients and other pages
    lib/
  package.json
```

---

## Backend API hierarchy (services/api)

```text
services/api/
  src/
    main.ts
    app.module.ts

    modules/
      identity/
      workspaces/
      party/
      crm/
      booking/
      background/
      expenses/
      invoices/
      tools/
      workflow/

    shared/
      config/
      logging/
      guards/
      pipes/

  package.json
  tsconfig.json
```

---

## Background runtime hierarchy (services/api/src/modules/background)

```text
services/api/src/modules/background/
  background.module.ts
  background-internal.controller.ts
  background-internal.guard.ts
  runtime/
    application/
    infrastructure/
    modules/
      outbox/
      workflows/
      invoices/
      storage/
```

---

## Historical mock server hierarchy (services/mock-server)

No tracked mock-server source/package exists in the inspected commit. The tree
below preserves the earlier design, not an available runtime or setup command.

```text
services/mock-server/
  src/
    index.ts

    routes/
      health.ts
      expenses.ts
      invoices.ts
      clients.ts
      assistant-tools.ts

    db/
      seed.ts
      store.ts                      # memory + file persistence

    middleware/
      cors.ts
      latency.ts
      idempotency.ts
      errors.ts

  package.json
  tsconfig.json
```

### Purpose of each folder

- `routes/`: REST endpoints + tool endpoints (assistant gateway)
- `db/`: in-memory store + seed + file persistence
- `middleware/`: cross-cutting server behaviors (CORS, latency simulation, idempotency, error normalization)

---

## Shared packages hierarchy (packages/\*)

### contracts (recommended)

```text
packages/contracts/
  src/
    index.ts
    common/
    expenses/
    invoices/
    clients/
    tools/
  package.json
  tsconfig.json
```

### domain (optional, pure)

```text
packages/domain/
  src/
    index.ts
    money/
    invoice-numbering/
    policies/
  package.json
  tsconfig.json
```

### data (optional, backend-only)

```text
packages/data/
  prisma/
    schema/
      schema.prisma
      10_identity.prisma
      40_billing.prisma
  src/
    prisma.client.ts
    repositories/
  package.json
  tsconfig.json
```

### ui (optional, frontend-only)

```text
packages/ui/
  src/
    components/
    tokens/
    index.ts
  package.json
  tsconfig.json
```

---

## Dependency direction rules (keep it scalable)

Allowed:

- `apps/*` → `packages/contracts`, `packages/domain`, `packages/ui`
- `services/api` → `packages/contracts`, `packages/domain`, `packages/data`
- `services/api` background runtime → `packages/contracts`, `packages/domain`, `packages/data`
- `packages/domain` → `packages/contracts`

Forbidden:

- `packages/contracts` importing anything else
- frontend importing backend internals
- backend importing frontend UI
- shared packages importing module code
