# Technical Debt & Architecture Report

**Date**: 2026-01-28
**Auditor**: Antigravity (Staff Engineer Agent)
**Scope**: Monorepo Health, Boundaries, Complexity, Security

## 1. Executive Summary

The `Corely` monorepo refactoring is **underway with significant progress** in both Backend architecture and Frontend modularity.

- **Backend Hygiene**: The `@RequireTenant` decorator and `BaseUseCase` pattern have been successfully adopted in 4 major modules (`Tax`, `POS`, `Cash Management`, `Accounting`), improving security and code consistency. Type safety for `services/api` is restored.
- **Frontend De-Monolithing**: The critical `NewInvoicePage.tsx` (formerly ~950 LOC) and `InvoiceDetailPage.tsx` (formerly ~870 LOC) have been decomposed into reusable, atomic components (`InvoiceLineItems`, `CustomerSelection`, `InvoiceTotals`), reducing file sizes by ~50-80% and consolidating logic.
- **Remaining Riskiest Areas**: The `Inventory` module remains a "God Object" on the backend. The `apps/web` build pipeline is noisy with configuration errors (`TS6305`).

## 2. Top 10 High-Risk / Impact Items

| Severity | Area         | Item                                  | Risk                                                              | Status                                    |
| :------- | :----------- | :------------------------------------ | :---------------------------------------------------------------- | :---------------------------------------- |
| **P0**   | **Security** | `PrismaCashRepository.updateRegister` | **IDOR Vulnerability**: Ignores `tenantId`.                       | ✅ **Fixed**                              |
| **P0**   | **Build**    | `apps/web` Build Config               | **Broken Build**: `TS6305` output file errors pollute build logs. | ✅ **Fixed**                              |
| **P0**   | **Backend**  | `inventory.module.ts` (1103 LOC)      | **Maintainability**: Module definition is a "God Object".         | 🔴 **Open**                               |
| **P0**   | **Frontend** | `NewInvoicePage.tsx`                  | **Complexity**: UI Monolith (~955 LOC).                           | ✅ **Fixed**                              |
| **P0**   | **Backend**  | `documents.usecases.ts` (900 LOC)     | **Tech Debt**: "Clustered Class" pattern.                         | 🔴 **Open**                               |
| **P0**   | **Arch**     | Service Layer Prisma Usage            | **Coupling**: detected in `tax`, `approvals`, etc.                | ⚠️ **Improving**                          |
| **P1**   | **Backend**  | Missing Tenancy Decorators            | **Safety**: Manual checks are fragile.                            | 🟡 **In Progress** (4/9 Modules Complete) |
| **P1**   | **Frontend** | `InvoiceDetailPage.tsx`               | **Duplication**: Logic duplicated from New Invoice.               | ✅ **Fixed**                              |
| **P2**   | **Frontend** | `sidebar.tsx`                         | **Coupling**: Hardcoded business logic in UI.                     | ✅ **Fixed**                              |

## 3. Progress Update & Completed Works

### ✅ Completed

- **Backend Security & Standards**:
  - Refactored **Tax**, **POS**, **Cash Management**, and **Accounting** use cases.
  - Standardized on `BaseUseCase` abstract class (Result pattern enactment).
  - Enforced security via `@RequireTenant()` decorator (removed manual `ctx.tenantId` checks).
  - Fixed `PrismaCashRepository` IDOR vulnerability.
- **Frontend Refactoring**:
  - **NewInvoicePage**: Decomposed into `InvoiceMetadata`, `CustomerSelection`, `InvoiceLineItems`, `InvoiceTotals`, `InvoiceNotes`.
  - **InvoiceDetailPage**: Refactored to reuse the same components as `NewInvoicePage`.
  - **Utilities**: Extracted shared logic for invoice number generation and money formatting.
- **Type Safety**:
  - `services/api` now passes `tsc` without errors.

### 🟡 In Progress / Next Up

1.  **Backend Expansion**: Apply `BaseUseCase` + `@RequireTenant` to remaining modules:
    - `Inventory` (High Risk)
    - `Purchasing`
    - `CRM`
    - `Documents`
    - `Platform` / `Workspaces`
2.  **Frontend Build Fixes**: Resolve `TS6305` errors in `apps/web` caused by `composite` project references or `noEmit` misconfiguration.

## 4. Recommended Next Steps

### Phase 3.1: Inventory & Purchasing (The "Hard Stuff")

1.  **Inventory Module**: This is the largest technical debt on the backend. It needs to be broken down handling `Stock`, `Product`, and `Warehouse` domains separately.
2.  Apply Tenancy decorators to `Inventory` and `Purchasing` use cases.

### Phase 3.2: Frontend Polish

1.  **Sidebar Decoupling**: Refactor `sidebar.tsx` to read from a configuration provider rather than hardcoding business rules.
2.  **Linting**: Strict boundaries check to ensure Use Cases do not import React components or UI libraries (and vice versa).

## 5. "Do Not Refactor Yet" (Danger Zone)

- **`inventory.module.ts`**: Still risky. Proceed only with extreme caution or after improved test coverage.
