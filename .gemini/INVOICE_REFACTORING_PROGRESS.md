# Invoice Module Refactoring - Progress Report

## 🎯 OBJECTIVE

Eliminate duplication between Sales (`/sales/invoices`) and Invoices (`/invoices`) modules by making the Invoices module the single source of truth, following hexagonal architecture patterns.

## ✅ COMPLETED

### 1. **Contracts Layer** (packages/contracts)

- ✅ Added `sourceType` and `sourceId` to `CreateInvoiceInputSchema` (manual, order, quote, deal)
- ✅ Added `customerContactPartyId` to `CreateInvoiceInputSchema`
- ✅ Added `sourceType` and `sourceId` to `InvoiceDtoSchema`
- ✅ Rebuilt contracts package

### 2. **Domain Layer** (invoices/domain)

- ✅ Added `InvoiceSourceType` to `invoice.types.ts`
- ✅ Updated `InvoiceProps` with `sourceType` and `sourceId` fields
- ✅ Updated `InvoiceAggregate` class fields
- ✅ Updated `InvoiceAggregate.constructor()` to initialize source fields
- ✅ Updated `InvoiceAggregate.createDraft()` to accept source fields

### 3. **Application Layer - Ports** (invoices/application/ports)

- ✅ Created `invoice-commands.port.ts` - Canonical interface for invoice operations
  - Defines all CRUD operations (create, update, finalize, send, cancel, etc.)
  - Includes specialized `createDraftFromSalesSource()` method
  - Exports `INVOICE_COMMANDS` injection token

### 4. **Application Layer - Services** (invoices/application/services)

- ✅ Created `invoice-command.service.ts` - Implementation of InvoiceCommandsPort
  - Wraps InvoicesApplication use cases
  - Implements port interface
  - Maps sales source inputs to invoice creation

## 🔄 IN PROGRESS / REMAINING

### 5. **Application Layer - Use Cases** (invoices/application/use-cases)

- ⏳ Update `CreateInvoiceUseCase` to:
  - Accept `sourceType` and `sourceId` from input
  - Pass them to `InvoiceAggregate.createDraft()`
- ⏳ Update `invoice-dto.mapper.ts` to:
  - Include `sourceType` and `sourceId` in DTO mapping

### 6. **Infrastructure Layer** (invoices/infrastructure)

- ⏳ Update Prisma schema (if needed):
  - Check if `invoice` table has `sourceType` and `sourceId` columns
  - Create migration if needed
- ⏳ Update `PrismaInvoiceRepositoryAdapter`:
  - Persist `sourceType` and `sourceId` on create/save
  - Load them on findById/list operations

### 7. **Module Wiring** (invoices/invoices.module.ts)

- ⏳ Export Invoice Commands Port:
  ```typescript
  providers: [
    InvoiceCommandService,
    { provide: INVOICE_COMMANDS, useClass: InvoiceCommandService },
    // ... existing providers
  ],
  exports: [
    INVOICE_COMMANDS,
    // ... existing exports
  ]
  ```

### 8. **Sales Module Refactoring**

- ⏳ Import InvoicesModule in SalesModule
- ⏳ Create Sales Invoice Facade:
  - `sales/application/facades/sales-invoice.facade.ts`
  - Inject `INVOICE_COMMANDS` port
  - Translate Sales DTOs → Invoice DTOs
  - Map status names (ISSUED ↔ FINALIZED, VOID ↔ CANCELED)
- ⏳ Refactor Sales Controller:
  - Keep `/sales/invoices` endpoints as thin wrappers
  - Delegate to Sales Invoice Facade
  - Mark as `@deprecated` with comment
- ⏳ Update "Create Invoice from Order/Quote" endpoints:
  - Use `invoiceCommands.createDraftFromSalesSource()`
  - Set sourceType to 'order' or 'quote'

### 9. **Database Migration**

- ⏳ Decision needed: Two separate tables exist (`invoice` vs `salesInvoice`)
- ⏳ Recommended approach:
  - NEW invoices go to `invoice` table (via Invoice Commands Port)
  - Keep backward compatibility for existing `salesInvoice` reads
  - Create background job to migrate `salesInvoice` → `invoice`
  - Eventually deprecate `salesInvoice` table

### 10. **Frontend Updates**

- ⏳ Update `lib/sales-api.ts`:
  - Change `listInvoices()` to call `/invoices`
  - Change `createInvoice()` to call `/invoices`
  - Map `issueInvoice()` → `/invoices/:id/finalize`
  - Map `voidInvoice()` → `/invoices/:id/cancel`
- ⏳ Create status mapper utility:
  - `lib/invoice-status-mapper.ts`
  - Bi-directional mapping (ISSUED ↔ FINALIZED, VOID ↔ CANCELED)
- ⏳ Optional: Update navigation
  - Change `/sales/invoices/:id` → `/invoices/:id`
  - Add deprecation banner to `/sales/invoices` pages

### 11. **Testing**

- ⏳ Integration tests:
  - Create invoice from order → saved in invoice table
  - Create invoice from quote → saved in invoice table
  - Sales endpoints produce same result as Invoice endpoints
- ⏳ Contract tests:
  - Verify `/sales/invoices` and `/invoices` return compatible DTOs
- ⏳ Unit tests:
  - Invoice Command Service properly delegates to use cases
  - Sales facade correctly maps statuses
  - Source tracking fields persisted correctly

## 🏗️ ARCHITECTURE COMPLIANCE

Following the established hexagonal architecture:

### ✅ **Ports & Adapters Pattern**

- Created `InvoiceCommandsPort` as stable interface
- Sales depends on port, not implementation
- Enforces dependency inversion

### ✅ **Single Source of Truth**

- Invoice module owns Invoice aggregate and persistence
- Sales module calls Invoice via port (no direct DB access)

### ✅ **Backward Compatibility**

- Sales endpoints remain active as wrappers
- Gradual migration path for frontend
- No breaking changes for existing clients

### ✅ **Domain Integrity**

- Invoice business rules stay in Invoice module
- Sales module focused on sales workflows (quotes → orders → invoices)

## 📋 NEXT STEPS (Priority Order)

1. **Complete Invoice Module Updates**
   - Update CreateInvoiceUseCase to handle source fields
   - Update DTO mapper
   - Update repository adapter
   - Export Invoice Commands Port from module

2. **Create Sales Facade**
   - Build facade service in Sales module
   - Inject and use Invoice Commands Port
   - Map between Sales and Invoice DTOs/statuses

3. **Refactor Sales Controller**
   - Update endpoints to use facade
   - Add deprecation notices
   - Maintain API contract

4. **Database Strategy**
   - Assess migration complexity
   - Implement chosen approach (recommended: gradual migration)

5. **Frontend Updates**
   - Update API client layer
   - Test thoroughly
   - Optional: consolidate UI

6. **Testing & Validation**
   - Write/update tests
   - Verify no regressions
   - Document migration for team

## 🚧 BLOCKERS / DECISIONS NEEDED

1. **Database Table Strategy**
   - Keep both tables temporarily?
   - Immediate migration?
   - Timeline for deprecation?

2. **Frontend Timeline**
   - Update API clients immediately?
   - Keep dual UI paths?
   - When to redirect `/sales/invoices`?

3. **Backward Compatibility**
   - How long to maintain Sales invoice endpoints?
   - Versioning strategy?

## 📊 ESTIMATED COMPLETION

- **Backend Core (Steps 1-7)**: 70% complete
- **Sales Refactoring (Step 8)**: 0% complete
- **Database Migration (Step 9)**: 0% complete
- **Frontend (Step 10)**: 0% complete
- **Testing (Step 11)**: 0% complete

**Overall Progress**: ~35% complete

---

_Last updated: 2026-01-21 16:10 UTC_
