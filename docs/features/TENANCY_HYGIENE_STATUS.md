# Tenancy Hygiene & Decorator Audit

**Status**: ✅ Complete
**Last Updated**: 2026-01-28

## Overview

To ensure robust multi-tenancy and prevent cross-tenant data leaks, we have implemented a **Declarative Tenancy** pattern. All Use Cases involved in business logic must be explicitly decorated with `@RequireTenant()` to enforce the presence of a valid `tenantId` in the execution context.

## Pattern

Instead of manual checks inside `handle()`:

```typescript
// ❌ OLD: Manual check
async handle(input: Input, ctx: UseCaseContext) {
  if (!ctx.tenantId) throw new UnauthorizedError();
  // ...
}
```

We now use:

```typescript
// ✅ NEW: Decorator enforcement
@RequireTenant()
export class MyUseCase extends BaseUseCase<Input, Output> {
  async handle(input: Input, ctx: UseCaseContext) {
    // ctx.tenantId is guaranteed to be defined here
    // ...
  }
}
```

## Audit Status

The following modules have been audited and updated to fully comply with this pattern:

| Module         | Status      | Notes                                                                       |
| :------------- | :---------- | :-------------------------------------------------------------------------- |
| **CRM**        | ✅ Complete | Applied to all 13 use cases (Deals, Activities, Pipelines, Stages).         |
| **Invoices**   | ✅ Complete | Applied to all use cases. `DownloadInvoicePdf` refactored to `BaseUseCase`. |
| **Tax**        | ✅ Complete | All use cases updated. Also migrated to `Result` return type.               |
| **Inventory**  | ✅ Complete | Previously completed.                                                       |
| **Workspaces** | ✅ Complete | Previously completed.                                                       |

## Verification

- **Linting**: No specific linter rule yet, but code reviews enforce this.
- **Testing**: All unit tests have been updated to pass correct context or mock the decorator behavior (by passing `tenantId` in context).

## Related Changes

- **BaseUseCase**: Updated to handle optional logger dependencies for easier testing of legacy modules.
- **Tax Engine**: Tax use cases now return `Result<T, E>` instead of throwing errors directly, aligning with the core kernel error handling strategy.
