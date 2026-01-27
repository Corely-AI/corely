# Workspace Scope Audit

**Date**: 2026-01-23  
**Issue**: Cross-workspace data leakage after workspace switch (Receipts/Invoices/Expenses/etc.)

## Executive Summary

The application has a workspace isolation bug where data from Workspace A can appear in Workspace B after switching workspaces. This audit identifies the root causes and provides a fix plan.

## Architecture Overview

### Frontend (`apps/web`)

- **React/Vite** application with React Query for data fetching
- **Workspace switching**: `apps/web/src/shared/workspaces/WorkspaceSwitcher.tsx`
- **Workspace state**: `apps/web/src/shared/workspaces/workspace-store.ts` (localStorage + in-memory)
- **Workspace provider**: `apps/web/src/shared/workspaces/workspace-provider.tsx`
- **API Client**: `packages/auth-client/src/api-client.ts` → injects `X-Workspace-Id` header

### Backend (`services/api`)

- **NestJS** application with domain-driven design
- **Request context**: `services/api/src/shared/request-context/request-context.resolver.ts`
- **Header constants**: `services/api/src/shared/request-context/request-context.headers.ts`
- **UseCase context**: `services/api/src/shared/request-context/usecase-context.ts`

### Modules Affected

- `invoices` - uses `tenantId` for scoping
- `expenses` - uses `ctx.workspaceId ?? ctx.tenantId` inconsistently
- `customers` - needs audit
- `crm` - needs audit
- `inventory` - needs audit
- `tax` - needs audit

---

## Root Cause Analysis

### Problem 1: Backend Uses `tenantId` Instead of `workspaceId`

**Location**: `services/api/src/modules/invoices/application/use-cases/list-invoices/list-invoices.usecase.ts`

```typescript
// Current (WRONG):
const { items, nextCursor } = await this.useCaseDeps.invoiceRepo.list(
  ctx.tenantId,  // <-- Uses tenantId, not workspaceId
  { ... }
);
```

The backend consistently uses `ctx.tenantId` instead of `ctx.workspaceId` for data scoping. The `tenantId` is typically a static user identifier, while `workspaceId` should be the active workspace.

**Repository ports also use tenantId**:

```typescript
// services/api/src/modules/invoices/application/ports/invoice-repository.port.ts
export interface InvoiceRepoPort {
  findById(tenantId: string, invoiceId: string): Promise<InvoiceAggregate | null>;
  list(tenantId: string, ...): Promise<ListInvoicesResult>;
  // ...
}
```

### Problem 2: Frontend Query Keys Don't Include workspaceId

**Location**: Various modules

```typescript
// apps/web/src/modules/invoices/screens/InvoiceDetailPage.tsx
const { data: invoiceData } = useQuery({
  queryKey: ["invoice", id], // <-- Missing workspaceId!
  queryFn: () => invoicesApi.getInvoice(id),
});

// apps/web/src/modules/customers/screens/CustomersPage.tsx
useQuery({
  queryKey: ["customers"], // <-- Missing workspaceId!
  queryFn: () => customersApi.listCustomers(),
});

// apps/web/src/shared/crud/query-keys.ts
export const createCrudQueryKeys = (resource: string) => {
  return {
    list: (params?: unknown) => [resource, "list", params ?? {}] as QueryKey,
    // No workspaceId included!
  };
};
```

When the user switches workspaces, React Query returns cached data from the previous workspace because the cache key doesn't differentiate by workspace.

### Problem 3: Workspace Switch Doesn't Invalidate All Queries

**Location**: `apps/web/src/shared/workspaces/workspace-provider.tsx`

```typescript
const setWorkspace = (workspaceId: string) => {
  setActiveWorkspaceId(workspaceId);
  setActiveId(workspaceId);
  void queryClient.invalidateQueries({ queryKey: ["workspaces"] });
  // Only invalidates "workspaces" - not invoices, expenses, customers, etc.!
};
```

---

## Files Requiring Changes

### Backend (Priority 1)

| File                                                                                             | Issue                      | Fix                        |
| ------------------------------------------------------------------------------------------------ | -------------------------- | -------------------------- |
| `services/api/src/modules/invoices/application/ports/invoice-repository.port.ts`                 | Uses tenantId              | Change to workspaceId      |
| `services/api/src/modules/invoices/application/use-cases/list-invoices/list-invoices.usecase.ts` | Uses ctx.tenantId          | Use ctx.workspaceId        |
| `services/api/src/modules/invoices/application/use-cases/*.ts`                                   | All use ctx.tenantId       | Use ctx.workspaceId        |
| `services/api/src/modules/invoices/infrastructure/*.ts`                                          | Repository implementations | Update to workspaceId      |
| `services/api/src/modules/expenses/application/use-cases/*.ts`                                   | Inconsistent scoping       | Standardize on workspaceId |
| `services/api/src/modules/crm/**/*.usecase.ts`                                                   | Likely uses tenantId       | Audit and fix              |
| `services/api/src/modules/party/**/*.usecase.ts`                                                 | Likely uses tenantId       | Audit and fix              |
| `services/api/src/modules/inventory/**/*.usecase.ts`                                             | Likely uses tenantId       | Audit and fix              |
| `services/api/src/modules/tax/**/*.usecase.ts`                                                   | Likely uses tenantId       | Audit and fix              |
| `services/api/src/modules/accounting/**/*.usecase.ts`                                            | Likely uses tenantId       | Audit and fix              |

### Frontend (Priority 2)

| File                                                            | Issue                          | Fix                            |
| --------------------------------------------------------------- | ------------------------------ | ------------------------------ |
| `apps/web/src/shared/crud/query-keys.ts`                        | No workspaceId in keys         | Add workspaceId to all keys    |
| `apps/web/src/shared/workspaces/workspace-provider.tsx`         | Doesn't invalidate all queries | Clear/invalidate all on switch |
| `apps/web/src/modules/invoices/screens/*.tsx`                   | Hardcoded query keys           | Use workspace-aware keys       |
| `apps/web/src/modules/customers/screens/*.tsx`                  | Hardcoded query keys           | Use workspace-aware keys       |
| `apps/web/src/modules/expenses/screens/*.tsx`                   | Uses createCrudQueryKeys       | Will be fixed by crud update   |
| `apps/web/src/modules/crm/hooks/*.ts`                           | Hardcoded query keys           | Use workspace-aware keys       |
| `apps/web/src/modules/inventory/queries/inventory.queryKeys.ts` | No workspaceId                 | Add workspaceId                |

---

## Fix Plan

### Phase 1: Backend - Enforce Workspace Scoping

1. **Add workspace validation to request context**
   - Validate user is member of requested workspace
   - Return 403 if not a member

2. **Update all repository ports**
   - Change `tenantId` parameter to `workspaceId`
   - Update all implementations

3. **Update all use cases**
   - Use `ctx.workspaceId` instead of `ctx.tenantId` for data scoping
   - Add validation that workspaceId is present

### Phase 2: Frontend - Fix Query Keys and Cache

1. **Create workspace-aware query key factory**
   - All queries include active workspaceId

2. **Update workspace switch logic**
   - Clear query cache OR invalidate all workspace-scoped queries
   - Force refetch on switch

3. **Update all modules to use workspace-aware keys**

### Phase 3: Testing

1. **Backend integration tests**
   - Create user with two workspaces
   - Verify data isolation between workspaces
   - Verify 403 when accessing other workspace

2. **Frontend tests**
   - Mock workspace switch
   - Verify query cache is cleared
   - Verify new data is fetched

---

## tenantId vs workspaceId Clarification

After analysis, it appears the codebase uses both terms:

- `tenantId`: Historic term, often coming from JWT/auth context
- `workspaceId`: The active workspace selected by the user

In this multi-workspace architecture:

- A user belongs to a `tenant` (their account)
- A user can have multiple `workspaces` under their tenant
- Data should be scoped by `workspaceId`, not `tenantId`

The current bug is that the backend scopes by `tenantId` (user's account) instead of `workspaceId` (active workspace), allowing all workspaces' data to be visible.

## Remediation Update (Current)

### Fixed

1. **Frontend Cache Isolation**:
   - Implemented `workspace-query-keys.ts` which prefixes all keys with workspace ID.
   - Updated Invoice and Customer pages to use these scoped keys.
   - Updated `WorkspaceProvider` to invalidate all queries on workspace switch.

2. **Backend Invoice Isolation**:
   - Refactored `InvoiceRepoPort` and `PrismaInvoiceRepoAdapter` to use `workspaceId`.
   - **Important**: The `tenantId` column in the database is now strictly used to store the Workpsace ID for Invoices.
   - Updated all Invoice Use Cases (`list`, `create`, `update`, `delete`, `pdf`, etc) to enforce `ctx.workspaceId` usage.

### Validated

- **Expenses Module**: Already uses `ctx.workspaceId ?? ctx.tenantId`, so it was likely safe but should be re-verified manually.

### Pending

- **Customers Module**: Frontend is fixed (cache), but Backend `Client` module might still be scoping by `tenantId`. This implies customers are shared across workspaces in the same tenant. If you need strict customer isolation per workspace, the Customer/CRM backend module needs a similar refactor to Invoices.
