# Technical Debt & Architecture Report

**Date**: 2026-01-27
**Auditor**: Antigravity (Staff Engineer Agent)
**Scope**: Monorepo Health, Boundaries, Complexity, Security

## 1. Executive Summary

The `Corely` monorepo demonstrates a **strong foundational architecture** (Hexagonal/Ports & Adapters) with clear separation of concerns in naming conventions. However, **implementation discipline is slipping** in key areas.

- **Type Safety is Compromised**: `pnpm typecheck` fails. This erodes confidence in the build pipeline.
- **"Grouping" Anti-Pattern**: The decision to group multiple classes (Use Cases) into single files (`*.usecases.ts`) has created unmaintainable "God Files" (>600-1000 LOC) that hide duplication and hinder reuse.
- **Boundary Leakage**: `arch:check` confirms that Prisma access is leaking from the Infrastructure layer into the Service layer, threatening the clean architecture.
- **Multi-Tenancy Risk**: Tenancy enforcement is manual (`if (!ctx.tenantId)`), repetitive, and explicitly missed in at least one repository update method, creating a security vulnerability.

## 2. Top 10 High-Risk / Impact Items

| Severity | Area         | Item                                        | Risk                                                                         |
| -------- | ------------ | ------------------------------------------- | ---------------------------------------------------------------------------- |
| **P0**   | **Security** | `PrismaCashRepository.updateRegister`       | **IDOR Vulnerability**: Ignores `tenantId` in update query.                  |
| **P0**   | **Build**    | `packages/email-templates` & `offline-core` | **Broken Build**: Typecheck fails. CI/CD reliability at risk.                |
| **P0**   | **Backend**  | `inventory.module.ts` (1103 LOC)            | **Maintainability**: Module definition is a "God Object".                    |
| **P0**   | **Frontend** | `NewInvoicePage.tsx` (955 LOC)              | **Complexity**: UI Monolith. Hard to test/refactor.                          |
| **P0**   | **Backend**  | `accounting.usecases.ts` (and others)       | **Tech Debt**: "Clustered Class" pattern forces large files and duplication. |
| **P0**   | **Arch**     | Service Layer Prisma Usage                  | **Coupling**: Detected in `tax`, `approvals`, `workflow` modules.            |
| **P1**   | **Backend**  | Missing Tenancy Decorators                  | **Safety**: Relying on manual `if` checks for tenancy is fragile.            |
| **P1**   | **Backend**  | `documents.usecases.ts` (900 LOC)           | **Complexity**: Logic dump without clear separation.                         |
| **P1**   | **Backend**  | `purchasing.module.ts` (870 LOC)            | **Maintainability**: Module file too large.                                  |
| **P2**   | **Frontend** | `sidebar.tsx`                               | **Coupling**: Hardcoded business logic in global navigation UI.              |

## 3. Recommended Remediation Strategy

### Phase 1: Quick Wins (Days 1-2)

1.  **Fix Typecheck**: Resolve the `postcss` and `offline-core` type errors. Nothing else matters if the build is red.
2.  **Patch Security**: Fix `PrismaCashRepository` to enforce tenant check in the query.
3.  **Halt Leakage**: Add stricter lint rules (using `dependency-cruiser` or `eslint-plugin-boundaries`) to prevent importing `prisma` in `*.service.ts` files.

### Phase 2: Structural Hygiene (Week 1)

1.  **Explode Use Cases**: Script a refactor to split `accounting.usecases.ts` into individual files (`create-account.usecase.ts`, etc.). This immediately reduces cognitive load.
2.  **Standardize Tenancy**: Introduce an `@AuthorizedInstance()` decorator or Middleware to handle the `tenantId` check globally, deleting 100+ loc of repetitive manual checks.

### Phase 3: Strategic Refactoring (> Week 1)

1.  **Decompose Frontend Monoliths**: Break `NewInvoicePage` into `InvoiceForm`, `LineItemsTable`, etc.
2.  **Refactor God Modules**: Split `InventoryModule` into semantic sub-modules (`Stock`, `Product`, `Warehouse`).

## 4. "Do Not Refactor Yet" (Danger Zone)

- **`inventory.module.ts`**: Do not touch this until you have full E2E test coverage of the Inventory flows. Its size suggests hidden dependencies and side-effects.
- **`shared/ui/sidebar.tsx`**: Touching this breaks navigation for everyone. Move carefully and cover with snapshot tests first.
