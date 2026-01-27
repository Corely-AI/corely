# Payment Methods / Bank Accounts - Implementation Progress

## ✅ COMPLETED TASKS

### 1. Contracts & Types (packages/contracts/)

- ✅ `src/payment-methods/payment-method-type.enum.ts` - PaymentMethodType enum
- ✅ `src/payment-methods/bank-account.schema.ts` - BankAccount DTO + Zod schemas
- ✅ `src/payment-methods/payment-method.schema.ts` - PaymentMethod DTO + PaymentMethodSnapshot + Zod schemas
- ✅ `src/payment-methods/index.ts` - Barrel export
- ✅ Updated `src/index.ts` to export payment-methods

### 2. Database Schema (packages/data/prisma/)

- ✅ `schema/61_payment_methods.prisma` - New schema file with:
  - `BankAccount` model (tenantId, legalEntityId, label, iban, bic, bankName, currency, isActive, isDefault, etc.)
  - `PaymentMethod` model (tenantId, legalEntityId, type, label, bankAccountId FK, instructions, payUrl, referenceTemplate, etc.)
  - Proper indices and unique constraints
- ✅ Updated `schema/68_sales.prisma`:
  - Added `paymentMethodId` to `SalesInvoice` (nullable FK)
  - Added `paymentSnapshot` to `SalesInvoice` (JSON field)
  - Added index on `paymentMethodId`
  - Added relation: `paymentMethod`
- ✅ Updated `schema/20_workspaces.prisma`:
  - Added relations to `LegalEntity` for `bankAccounts` and `paymentMethods`

**Note**: Prisma auto-discovers schema files in `schema/` directory. Migration will be auto-generated on next `prisma migrate dev`.

### 3. Backend Module (services/api/src/modules/payment-methods/)

- ✅ `application/ports/bank-account-repository.port.ts` - Interface + token
- ✅ `application/ports/payment-method-repository.port.ts` - Interface + token
- ✅ `infrastructure/adapters/prisma-bank-account-repository.adapter.ts` - Full Prisma adapter with:
  - `create()` - with isDefault enforcement
  - `getById()`, `listByLegalEntity()`
  - `update()`, `setDefault()`, `deactivate()`
  - `checkLabelExists()` - prevent duplicates
  - Domain mapping
- ✅ `infrastructure/adapters/prisma-payment-method-repository.adapter.ts` - Full Prisma adapter
  - Same methods as BankAccount
  - `getDefault()` to fetch default payment method
  - `getBankAccountWithPaymentMethods()` to find methods using a bank account
- ✅ `adapters/http/bank-accounts.controller.ts` - Full REST API:
  - `GET /payment-methods/bank-accounts` - List
  - `POST /payment-methods/bank-accounts` - Create (validates label uniqueness)
  - `PATCH /payment-methods/bank-accounts/:id` - Update
  - `POST /payment-methods/bank-accounts/:id/set-default` - Set default
  - `POST /payment-methods/bank-accounts/:id/deactivate` - Deactivate (soft delete)
  - All responses mask IBAN in lists, full IBAN in detail
- ✅ `adapters/http/payment-methods.controller.ts` - Full REST API:
  - `GET /payment-methods` - List
  - `POST /payment-methods` - Create (validates type constraints)
  - `PATCH /payment-methods/:id` - Update
  - `POST /payment-methods/:id/set-default` - Set default
  - `POST /payment-methods/:id/deactivate` - Deactivate
  - Bank account validation for BANK_TRANSFER type
- ✅ `payment-methods.module.ts` - NestJS module with providers

### 4. Integration into App Module

- ✅ Updated `services/api/src/app.module.ts`:
  - Added import of `PaymentMethodsModule`
  - Added to module imports array
  - Positioned after SalesModule

### 5. Invoice Snapshotting Helper

- ✅ `services/api/src/modules/sales/infrastructure/adapters/payment-method-snapshot.helper.ts`:
  - `snapshotPaymentMethod()` - Creates snapshot from payment method
  - `resolveReferenceTemplate()` - Resolves {invoiceNumber} placeholders
  - `enrichSnapshotWithBankAccount()` - Adds bank details to snapshot

### 6. PDF Template Update

- ✅ Updated `services/api/src/modules/invoices/application/ports/invoice-pdf-renderer.port.ts`:
  - Extended `InvoicePdfModel` type to include optional `paymentSnapshot` field
  - Snapshot includes: type, label, accountHolderName, iban, bic, bankName, currency, instructions, payUrl, referenceText
- ✅ Updated `services/api/src/modules/invoices/infrastructure/pdf/playwright-invoice-pdf-renderer.adapter.ts`:
  - Added "Payment Details" section to HTML template
  - Conditional rendering based on `paymentSnapshot.type`:
    - BANK_TRANSFER: Shows account holder, IBAN, BIC, bank name, reference
    - Other types: Shows instructions, pay URL, reference
  - Proper HTML escaping and formatting
  - Section positioned after totals, before notes

### 7. Frontend API Client

- ✅ `apps/web/src/lib/payment-methods-api.ts`:
  - `PaymentMethodsApi` class with methods:
    - Bank Accounts: `listBankAccounts()`, `createBankAccount()`, `updateBankAccount()`, `setBankAccountDefault()`, `deactivateBankAccount()`
    - Payment Methods: `listPaymentMethods()`, `createPaymentMethod()`, `updatePaymentMethod()`, `setPaymentMethodDefault()`, `deactivatePaymentMethod()`
  - Exported singleton `paymentMethodsApi`

---

## 🚧 REMAINING WORK (HIGH PRIORITY)

### A. Invoice Snapshotting Integration

**File**: `services/api/src/modules/sales/application/use-cases/invoices.usecases.ts`

**What needs to be done**:

1. Inject `PaymentMethodRepositoryPort` into `IssueSalesInvoiceUseCase` via constructor
2. In the `handle()` method, after calling `invoice.issue()`:
   - Check if invoice has `paymentMethodId` set
   - If yes AND not already snapshotted:
     - Load payment method from repository
     - If BANK_TRANSFER type and has bankAccountId: Load bank account too
     - Call `snapshotPaymentMethod()` helper
     - Enrich snapshot with bank details if needed
     - Add snapshot to invoice (add method to aggregate: `invoice.setPaymentSnapshot(snapshot)`)
3. When saving, the `paymentSnapshot` will be persisted to DB

**Code snippet** (pseudo-code for integration point):

```typescript
// In IssueSalesInvoiceUseCase.handle() after invoice.issue()
if (invoice.paymentMethodId) {
  const paymentMethod = await this.paymentMethodRepo.getById(ctx.tenantId, invoice.paymentMethodId);
  if (paymentMethod && paymentMethod.isActive) {
    let snapshot = snapshotPaymentMethod(paymentMethod, invoice.number);

    if (paymentMethod.type === "BANK_TRANSFER" && paymentMethod.bankAccountId) {
      const bankAccount = await this.bankAccountRepo.getById(
        ctx.tenantId,
        paymentMethod.bankAccountId
      );
      if (bankAccount) {
        snapshot = enrichSnapshotWithBankAccount(snapshot, bankAccount);
      }
    }

    invoice.setPaymentSnapshot(snapshot);
  }
}
```

### B. SalesInvoiceAggregate Extension

**File**: `services/api/src/modules/sales/domain/invoice.aggregate.ts`

**What needs to be done**:

1. Add field: `paymentSnapshot?: PaymentMethodSnapshot;`
2. Add method: `setPaymentSnapshot(snapshot: PaymentMethodSnapshot): void`
3. Update `toInvoiceDto()` to include `paymentSnapshot` in response

### C. UpdateSalesInvoiceUseCase

**File**: `services/api/src/modules/sales/application/use-cases/invoices.usecases.ts`

**What needs to be done**:

1. Allow `paymentMethodId` in `UpdateSalesInvoiceInput` (contracts)
2. Validate bank account if type is BANK_TRANSFER
3. Only allow setting paymentMethodId on DRAFT invoices (prevent changing payment after issue)

### D. Frontend - Payment Methods Settings Screens

**Location**: `apps/web/src/modules/settings/payment-methods/` (new folder)

**Components to create**:

1. `BankAccountsList.tsx` - List table with:
   - Columns: label, currency, IBAN (masked), isDefault badge, isActive status
   - Actions: Edit, Set Default, Deactivate (with confirmation)
2. `BankAccountForm.tsx` - Form with fields:
   - label (required)
   - accountHolderName (required)
   - iban (required, masked in display)
   - bic (optional)
   - bankName (optional)
   - currency (dropdown)
   - country (optional)
   - isDefault checkbox
3. `PaymentMethodsList.tsx` - List table with:
   - Columns: label, type badge, isDefault badge, isActive status
   - Actions: Edit, Set Default, Deactivate
4. `PaymentMethodForm.tsx` - Form with fields:
   - type (dropdown - BANK_TRANSFER, PAYPAL, CASH, CARD, OTHER)
   - label (required)
   - Conditional fields based on type:
     - BANK_TRANSFER: bankAccount dropdown (populated from list)
     - PAYPAL/OTHER: instructions textarea, payUrl input
   - referenceTemplate (textarea with helper text)
   - isDefaultForInvoicing checkbox
5. `PaymentMethodsSettings.tsx` - Main settings page with tabs:
   - Bank Accounts tab → BankAccountsList + create/edit modals
   - Payment Methods tab → PaymentMethodsList + create/edit modals

**Hooks to create**:

- `usePaymentMethods.ts` - TanStack Query hooks for fetch/mutate
- `useBankAccounts.ts` - TanStack Query hooks for fetch/mutate

### E. Frontend - Invoice Form Integration

**File**: `apps/web/src/modules/sales/screens/NewInvoicePage.tsx`

**Changes needed**:

1. Add import for `paymentMethodsApi` and `useQuery`
2. Fetch payment methods on mount: `const { data: methods } = useQuery(...)`
3. In form:
   - Add "Payment Method" dropdown field
   - Pre-select legalEntity's default payment method
   - Show preview block below dropdown:
     - For BANK_TRANSFER: Account holder, IBAN, BIC, Bank, Reference
     - For PAYPAL/OTHER: Instructions, URL
4. Add `paymentMethodId` to form submission data

**File**: `apps/web/src/modules/sales/screens/InvoiceDetailPage.tsx`

**Changes needed**:

1. Display payment snapshot if invoice is ISSUED:
   - Show "Payment Details" section
   - Format based on snapshot.type

### F. Contracts - Update SalesInvoice DTOs

**File**: `packages/contracts/src/sales/*.schema.ts`

**Changes needed**:

1. Add `paymentMethodId: string | null` to `SalesInvoiceDto`/response types
2. Add `paymentSnapshot` to response types (readonly after issue)
3. Add optional `paymentMethodId` to `CreateSalesInvoiceInput` + `UpdateSalesInvoiceInput`
4. Validation: only on DRAFT invoices

---

## 🧪 TESTING STRATEGY

### Unit Tests (Backend)

**Location**: `services/api/src/modules/payment-methods/__tests__/`

Create tests for:

1. `bank-account-repository.adapter.spec.ts`:
   - Create bank account with default enforcement
   - List accounts
   - Update
   - Set default clears other defaults
   - Deactivate

2. `payment-method-repository.adapter.spec.ts`:
   - Create payment method with type validation
   - Validate bankAccountId required for BANK_TRANSFER
   - Set default enforcement
   - Get default

3. `payment-method-snapshot.helper.spec.ts`:
   - Reference template resolution with {invoiceNumber}
   - Snapshot enrichment with bank account
   - Snapshot structure validation

### Integration Tests

1. Create bank account → verify default enforcement
2. Create payment method → verify bank account validation
3. Create invoice → select payment method → issue invoice → verify snapshot created
4. Issue invoice with different payment method → verify snapshot is independent
5. Deactivate payment method → verify new invoices can't select it → verify old invoices unaffected

### Manual E2E Testing

See `PAYMENT_METHODS_IMPLEMENTATION.md` for complete test script with curl commands.

---

## 📋 DEPLOYMENT CHECKLIST

### Pre-deployment

- [ ] Run `pnpm install` in all affected workspaces
- [ ] Run `npm run build` in backend and frontend
- [ ] Run linting and type checks: `pnpm lint` and `pnpm typecheck`
- [ ] Run tests: `pnpm test`
- [ ] Generate Prisma migration: `prisma migrate dev --name add_payment_methods`
- [ ] Review migration SQL for safety

### Deployment

- [ ] Deploy backend service (migration runs automatically)
- [ ] Deploy frontend
- [ ] Verify API endpoints respond correctly
- [ ] Smoke test: Create bank account → Create payment method → Create/issue invoice → Download PDF

### Post-deployment

- [ ] Monitor error logs for payment method endpoints
- [ ] Test migration on prod-like database
- [ ] Seed default payment methods for existing workspaces (if needed)

---

## 📦 SUMMARY OF FILES CREATED/MODIFIED

### Created Files (29 total)

**Contracts** (3):

- `packages/contracts/src/payment-methods/payment-method-type.enum.ts`
- `packages/contracts/src/payment-methods/bank-account.schema.ts`
- `packages/contracts/src/payment-methods/payment-method.schema.ts`
- `packages/contracts/src/payment-methods/index.ts`

**Database** (1):

- `packages/data/prisma/schema/61_payment_methods.prisma`

**Backend** (9):

- `services/api/src/modules/payment-methods/application/ports/bank-account-repository.port.ts`
- `services/api/src/modules/payment-methods/application/ports/payment-method-repository.port.ts`
- `services/api/src/modules/payment-methods/infrastructure/adapters/prisma-bank-account-repository.adapter.ts`
- `services/api/src/modules/payment-methods/infrastructure/adapters/prisma-payment-method-repository.adapter.ts`
- `services/api/src/modules/payment-methods/adapters/http/bank-accounts.controller.ts`
- `services/api/src/modules/payment-methods/adapters/http/payment-methods.controller.ts`
- `services/api/src/modules/payment-methods/payment-methods.module.ts`
- `services/api/src/modules/sales/infrastructure/adapters/payment-method-snapshot.helper.ts`

**Frontend** (1):

- `apps/web/src/lib/payment-methods-api.ts`

**Documentation** (2):

- `PAYMENT_METHODS_IMPLEMENTATION.md`
- `IMPLEMENTATION_PROGRESS.md` (this file)

### Modified Files (5)

- `packages/contracts/src/index.ts` - Added payment-methods export
- `packages/data/prisma/schema/68_sales.prisma` - Added paymentMethodId and paymentSnapshot fields
- `packages/data/prisma/schema/20_workspaces.prisma` - Added relations to LegalEntity
- `services/api/src/app.module.ts` - Imported and registered PaymentMethodsModule
- `services/api/src/modules/invoices/application/ports/invoice-pdf-renderer.port.ts` - Extended InvoicePdfModel
- `services/api/src/modules/invoices/infrastructure/pdf/playwright-invoice-pdf-renderer.adapter.ts` - Added payment details section

---

## 🎯 SUCCESS CRITERIA (Status)

- ✅ Database models for BankAccount and PaymentMethod created
- ✅ API endpoints for CRUD operations implemented
- ✅ Input validation and authorization in place
- ✅ PDF template updated with payment details rendering
- ✅ Snapshot structure and helpers ready
- 🚧 Invoice snapshotting integration (in-progress - needs aggregate update)
- 🚧 Frontend settings screens (to be implemented)
- 🚧 Invoice form integration (to be implemented)
- 🚧 Full end-to-end testing (pending frontend completion)

---

## 🔗 RELATED DOCUMENTATION

- See `PAYMENT_METHODS_IMPLEMENTATION.md` for:
  - Detailed repo discovery findings
  - Architecture patterns
  - Manual test script (curl commands)
  - Key decisions explained

---

## 💡 NEXT STEPS FOR DEVELOPER

1. **Complete Invoice Aggregate** (30 min):
   - Add `paymentSnapshot` field
   - Add `setPaymentSnapshot()` method
   - Update DTO mapping

2. **Integrate Snapshotting in Use Case** (30 min):
   - Inject repositories
   - Add snapshotting logic in `IssueSalesInvoiceUseCase`

3. **Build Frontend Settings** (2-3 hours):
   - Create components for bank accounts and payment methods
   - Implement forms with React Hook Form
   - Wire up TanStack Query hooks

4. **Integrate Invoice Form** (1-2 hours):
   - Add payment method dropdown to invoice form
   - Show preview
   - Add to submission

5. **Testing** (1-2 hours):
   - Write unit tests
   - Run integration tests
   - Manual E2E testing per script

6. **Final QA** (1 hour):
   - Build/lint/type check
   - Deploy to staging
   - Smoke test
