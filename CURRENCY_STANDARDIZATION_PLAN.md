# Currency Standardization Implementation Plan

## Goal

Standardize currency handling across the monorepo using ISO 4217 codes (uppercase, 3 letters) and derived symbols for presentation.

## Step-by-Step Execution

### 1. Shared Contracts (DONE)

- Created `packages/contracts/src/money/currency.schema.ts` with `CurrencyCodeSchema` and `MoneySchema`.
- Exported from `packages/contracts/src/index.ts`.
- Replaced legacy `Currency` type.

### 2. Kernel Primitives (DONE)

- Created `packages/kernel/src/money/index.ts` with `normalizeCurrencyCode`, `getCurrencySymbol`, and `formatMoney`.
- Exported from `packages/kernel/src/index.ts`.

### 3. Backend Enforcement (IN PROGRESS)

- [x] Updated `rentals.types.ts`
- [x] Updated `expense.types.ts`
- [x] Updated `invoice.types.ts`
- [ ] Update others (Deal, JournalEntry, etc.)

### 4. Database Standardization (IN PROGRESS)

- [x] Updated all `currency` fields in Prisma to `String @db.VarChar(3)`.

### 5. Database Migration (TODO)

- Create migration SQL to:
  - Normalize existing columns to uppercase.
  - Add CHECK constraints (if possible via raw SQL).

### 6. Presentation Logic (TODO)

- Update `apps/web/src/modules/accounting/components/Money.tsx` to use standardized formatting.
- Audit other UI points for symbol hardcoding.

### 7. Testing (TODO)

- Add unit tests for `CurrencyCodeSchema` (normalizing "eur" to "EUR").
- Add E2E test for a simple flow (e.g., creating a rental with lowercase currency).

## Risk Notes

- Legacy data may contain unknown currency strings. The migration will UPPERCASE them, but invalid codes will still exist until filtered or fixed manually.
- CHECK constraints might fail if legacy data is invalid.
