# Payment Methods / Bank Accounts Implementation Notes

## Phase 0: Discovery Findings

### 1. Workspace & Legal Entity Flow

- **Multi-tenant model**: `tenantId` from JWT token (identifies organization/account)
- **Workspace**: Operational unit scoped to `tenantId`
- **LegalEntity**: Business identity with `kind` (PERSONAL or COMPANY), linked to workspace
- **Isolation**: All queries filtered by `tenantId`; request context resolver picks from JWT or headers
- **Authorization**: WorkspaceMembership model controls access (roles: OWNER, ADMIN, MEMBER, ACCOUNTANT, VIEWER)

### 2. Invoice Architecture

- **Two systems**:
  - Simple `invoices` module (basic) at `services/api/src/modules/invoices/`
  - **Full featured**: `sales` module at `services/api/src/modules/sales/` (primary for this implementation)
- **SalesInvoice model** (Prisma): `id`, `tenantId`, `number`, `status`, `customerPartyId`, `currency`, `issueDate`, `dueDate`, `notes`
- **Existing fields**: Stores customer snapshot, payment tracking (SalesPayment), but NO payment method configuration
- **Status flow**: DRAFT → ISSUED → PARTIALLY_PAID/PAID/VOID
- **Frontend**: `apps/web/src/modules/sales/` with `NewInvoicePage.tsx` and invoice detail views

### 3. Invoice Issue/Send Flow

- **CreateSalesInvoiceUseCase**: Drafting invoice (services/api/src/modules/sales/application/use-cases/invoices.usecases.ts)
- **IssueSalesInvoiceUseCase**: Transitions DRAFT → ISSUED (includes journal entry posting for accounting)
- **SendInvoiceUseCase** (simpler invoices module): Queues email delivery via outbox pattern, creates InvoiceEmailDelivery record
- **Snapshot point**: When issuing/sending, is the moment to freeze payment method details

### 4. PDF Generation

- **Engine**: PlaywrightInvoicePdfRendererAdapter at `services/api/src/modules/invoices/infrastructure/pdf/`
- **Input**: InvoicePdfModel (type, invoiceNumber, billToName, issueDate, dueDate, currency, items, totals, notes)
- **HTML generation**: Dynamic template in `generateHtml()` method
- **Output**: Playwright renders HTML → PDF via browser automation
- **Customization point**: Add "Payment Details" section to HTML before rendering

### 5. RBAC & Authorization

- **AuthGuard**: Validates JWT, sets user on request
- **RbacGuard**: Enforces permissions per endpoint (WorkspaceMembership + role checking)
- **Patterns**: Use `@Require Permission('permission.name')` on controllers
- **Tenant isolation**: All endpoints must check `tenantId` from context

### 6. Architecture Patterns Used

- **Clean architecture**: Use cases → Ports/Adapters → Infrastructure
- **Error handling**: Result<T, Error> type (ok/err)
- **Validation**: Zod schemas in contracts, validated at controller layer
- **Database**: Prisma ORM with schema split across numbered files (60_billing, 68_sales, etc.)
- **Frontend**: TanStack Query for data fetching, React patterns
- **Type safety**: End-to-end TypeScript with contracts as single source of truth

### 7. Existing Patterns to Follow

- **API DTOs**: Defined in `packages/contracts/src/` with Zod schemas
- **Repository pattern**: PrismaXxxRepository adapters implement ports
- **Use cases**: Inject dependencies, return Result type, handle errors explicitly
- **Frontend API client**: Located at `apps/web/src/lib/*-api.ts` (e.g., SalesApi, InvoicesApi)
- **Form validation**: React forms with TypeScript types and submission handlers

---

## Implementation Strategy

### Data Model (Prisma)

**File**: `packages/data/prisma/schema/61_payment_methods.prisma` (new)

1. **BankAccount**
   - Scoped to: `(tenantId, legalEntityId)`
   - Fields: id, tenantId, legalEntityId, label, accountHolderName, iban, bic, bankName, currency, country, isActive, isDefault, createdAt, updatedAt
   - Unique constraint: (tenantId, legalEntityId, label)
   - Default constraint: At most 1 per (tenantId, legalEntityId) with isDefault=true

2. **PaymentMethod**
   - Scoped to: `(tenantId, legalEntityId)`
   - Fields: id, tenantId, legalEntityId, type (enum), label, isActive, isDefaultForInvoicing, bankAccountId (FK, nullable), instructions, payUrl, referenceTemplate, createdAt, updatedAt
   - Type enum: BANK_TRANSFER, PAYPAL, CASH, CARD, OTHER
   - Validations:
     - If type=BANK_TRANSFER: bankAccountId required
     - If type≠BANK_TRANSFER: bankAccountId must be null

3. **SalesInvoice (extend)**
   - Add: `paymentMethodId` (nullable, FK to PaymentMethod)
   - Add: `paymentSnapshot` (JSON) with fields: type, label, accountHolderName, iban, bic, bankName, currency, instructions, payUrl, referenceText, snapshotVersion

### Backend

**Module**: New `services/api/src/modules/payment-methods/`

- **Controllers**: BankAccountsController, PaymentMethodsController
- **Services**: BankAccountsService, PaymentMethodsService (business logic)
- **Use cases**: CreatePaymentMethod, UpdatePaymentMethod, SetDefaultPaymentMethod, DeactivatePaymentMethod, etc.
- **Repositories**: PrismaBankAccountRepository, PrismaPaymentMethodRepository
- **Validation**: Zod schemas in contracts, IBAN validation (basic)
- **Authorization**: RbacGuard with workspace membership checks
- **Integration points**:
  - Extend IssueSalesInvoiceUseCase to snapshot payment method
  - Extend InvoicePdfModel port to include payment snapshot

### Frontend

**Location**: `apps/web/src/modules/settings/` (new or extend existing)

- **Payment Methods Settings**: Tab-based UI with BankAccounts and PaymentMethods sub-sections
- **Invoice Form**: Add PaymentMethod dropdown in NewInvoicePage, with preview block
- **API Integration**: Use TanStack Query (useQuery, useMutation) with api client

### PDF

**File**: `services/api/src/modules/invoices/infrastructure/pdf/playwright-invoice-pdf-renderer.adapter.ts`

- Add "Payment Details" section to HTML template
- Conditional rendering based on paymentSnapshot.type
- Layout: Below totals, before notes

---

## Files That Will Be Modified/Created

### New Files

- `packages/data/prisma/schema/61_payment_methods.prisma`
- `packages/data/prisma/migrations/[timestamp]_add_payment_methods/migration.sql`
- `packages/contracts/src/payment-methods/*.ts` (enums, DTOs, schemas)
- `services/api/src/modules/payment-methods/` (controllers, services, adapters, ports)
- `services/api/src/modules/payment-methods/__tests__/` (tests)
- `apps/web/src/modules/settings/payment-methods/` (UI components)
- `apps/web/src/lib/payment-methods-api.ts` (API client)

### Modified Files

- `packages/data/prisma/schema/68_sales.prisma` (add paymentMethodId, paymentSnapshot to SalesInvoice)
- `services/api/src/modules/sales/application/use-cases/invoices.usecases.ts` (IssueSalesInvoiceUseCase snapshotting)
- `services/api/src/modules/invoices/infrastructure/pdf/playwright-invoice-pdf-renderer.adapter.ts` (PDF template)
- `services/api/src/modules/invoices/application/ports/invoice-pdf-renderer.port.ts` (InvoicePdfModel extension)
- `apps/web/src/modules/sales/screens/NewInvoicePage.tsx` (payment method selector)
- `apps/web/src/modules/sales/screens/InvoiceDetailPage.tsx` (show payment snapshot)
- `apps/web/src/lib/sales-api.ts` (update create/update invoice inputs)
- `packages/contracts/src/index.ts` (export new types)

---

## Key Decisions

1. **Snapshot strategy**: Freeze payment method on invoice issue, not on creation. Allows previewing different methods before issuing.
2. **Default behavior**: Reference template defaults to `INV-{invoiceNumber}`. Banks can override per method.
3. **Multi-currency**: Each bank account has a currency; match against invoice currency when suggesting defaults.
4. **Soft deactivation**: Never delete; use `isActive=false`. Preserves history and allows re-activation.
5. **Legal entity scoping**: All payment methods/bank accounts are per legalEntity within a workspace/tenant. Supports future multi-entity scenarios.
6. **Authorization**: Only workspace OWNER/ADMIN can manage payment settings; MEMBER+ can view/select on invoices.

---

## Testing Strategy

### Unit Tests

- Payment method validation (required fields per type)
- Reference template substitution
- Bank account uniqueness constraints
- Default enforcement (only one per scope)

### Integration Tests

- Create payment method → verify belongs to correct scope
- Issue invoice → snapshot captured
- Change payment method after issue → old snapshot unchanged
- Deactivate method → can't select on new invoices, but old invoices still show

### Manual Testing (see end-to-end script below)

---

## Manual End-to-End Test Script

```bash
# 1. Create workspace & legal entity (usually done via signup)
# Workspace ID: {WS_ID}
# Tenant ID: {TENANT_ID}
# User: authenticated

# 2. Create bank account
curl -X POST http://localhost:3000/api/payment-methods/bank-accounts \
  -H "Authorization: Bearer {TOKEN}" \
  -H "X-Tenant-ID: {TENANT_ID}" \
  -H "X-Workspace-ID: {WS_ID}" \
  -H "Content-Type: application/json" \
  -d '{
    "label": "Main EUR Account",
    "accountHolderName": "John Doe",
    "iban": "DE89370400440532013000",
    "bic": "COBADEFFXXX",
    "bankName": "Commerzbank",
    "currency": "EUR",
    "isDefault": true
  }'
# Response: {id, label, iban (masked), isDefault, currency, isActive}

# 3. Create payment method
curl -X POST http://localhost:3000/api/payment-methods \
  -H "Authorization: Bearer {TOKEN}" \
  -H "X-Tenant-ID: {TENANT_ID}" \
  -H "X-Workspace-ID: {WS_ID}" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "BANK_TRANSFER",
    "label": "Bank Transfer (EUR)",
    "bankAccountId": "{BANK_ACCOUNT_ID}",
    "referenceTemplate": "INV-{invoiceNumber}",
    "isDefaultForInvoicing": true
  }'
# Response: {id, type, label, isDefault, isActive}

# 4. Create sales invoice
curl -X POST http://localhost:3000/api/sales/invoices \
  -H "Authorization: Bearer {TOKEN}" \
  -H "X-Tenant-ID: {TENANT_ID}" \
  -H "X-Workspace-ID: {WS_ID}" \
  -H "Content-Type: application/json" \
  -d '{
    "customerPartyId": "{CUSTOMER_ID}",
    "currency": "EUR",
    "lineItems": [{"description": "Service", "quantity": 1, "unitPriceCents": 10000}],
    "paymentMethodId": "{PAYMENT_METHOD_ID}",
    "idempotencyKey": "draft-1"
  }'
# Response: {id, status: "DRAFT", paymentMethodId}

# 5. Verify payment method is shown in invoice detail (frontend)
# GET /api/sales/invoices/{INVOICE_ID}
# Response should include paymentMethodId

# 6. Issue invoice
curl -X POST http://localhost:3000/api/sales/invoices/{INVOICE_ID}/issue \
  -H "Authorization: Bearer {TOKEN}" \
  -H "X-Tenant-ID: {TENANT_ID}" \
  -H "X-Workspace-ID: {WS_ID}" \
  -H "Content-Type: application/json" \
  -d '{"idempotencyKey": "issue-1"}'
# Response: {id, status: "ISSUED", paymentSnapshot: {...}}

# 7. Modify payment method (e.g., update bank account)
curl -X PATCH http://localhost:3000/api/payment-methods/bank-accounts/{BANK_ACCOUNT_ID} \
  -H "Authorization: Bearer {TOKEN}" \
  -H "X-Tenant-ID: {TENANT_ID}" \
  -H "X-Workspace-ID: {WS_ID}" \
  -H "Content-Type: application/json" \
  -d '{
    "accountHolderName": "Jane Doe"
  }'

# 8. Verify issued invoice snapshot is unchanged
curl -X GET http://localhost:3000/api/sales/invoices/{INVOICE_ID} \
  -H "Authorization: Bearer {TOKEN}" \
  -H "X-Tenant-ID: {TENANT_ID}" \
  -H "X-Workspace-ID: {WS_ID}"
# Response: paymentSnapshot.accountHolderName should still be "John Doe"

# 9. Download PDF
curl -X GET "http://localhost:3000/api/sales/invoices/{INVOICE_ID}/pdf" \
  -H "Authorization: Bearer {TOKEN}" \
  -H "X-Tenant-ID: {TENANT_ID}" \
  -H "X-Workspace-ID: {WS_ID}" \
  > invoice.pdf
# Should show payment details section with "John Doe", IBAN, BIC, reference

# 10. Deactivate payment method
curl -X POST http://localhost:3000/api/payment-methods/{PAYMENT_METHOD_ID}/deactivate \
  -H "Authorization: Bearer {TOKEN}" \
  -H "X-Tenant-ID: {TENANT_ID}" \
  -H "X-Workspace-ID: {WS_ID}" \
  -H "Content-Type: application/json" \
  -d '{}'
# Response: {id, isActive: false}

# Verify: New invoice creation should not allow selecting deactivated method
```

---

## Success Criteria

✅ User can create bank account(s) and set default
✅ User can create payment methods and set default for invoicing
✅ Create invoice with payment method selection (default pre-selected)
✅ Issue invoice → freezes payment snapshot
✅ Download PDF → shows payment details block
✅ Modify payment settings after issue → old invoice unaffected
✅ Multi-entity ready: All CRUD filters by (tenantId, legalEntityId)
✅ No cross-workspace data leakage
✅ Code aligned to repo patterns (clean architecture, error handling, validation)
✅ Tests covering main flows
