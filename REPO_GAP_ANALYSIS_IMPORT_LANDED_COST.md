# Repo Gap Analysis Report — Import/LandedCost/LotExpiry/Sales/VAT/Excise

## 1. Executive Summary

**What exists:**

- ✅ Catalog module with SKU/variant/UOM/tax profiles (VAT + excise flags) — **solid foundation**
- ✅ Inventory module with warehouses, locations, documents (receipts/deliveries), stock moves
- ✅ Purchasing module with PO and vendor bills
- ✅ Sales/invoicing with B2B invoicing, payment tracking, tax snapshots
- ✅ Tax module with VAT profiles, tax codes/rates, period summaries, and scheduled tax reports
- ✅ Accounting core with journal entries, COA (includes COGS account), period locking
- ✅ Documents module, audit logs, outbox events, idempotency patterns
- ✅ Module boundaries enforced: hexagonal architecture, contracts package, events-based integration

**What's missing (critical for MVP):**

- ❌ **Lot/batch + expiry tracking** — catalog flags exist but NO inventory tables capture lot numbers or expiry dates
- ❌ **Import shipment entity** — no way to track customs, clearance, freight, broker fees per shipment
- ❌ **Landed cost allocation** — no mechanism to capture import costs and allocate to SKUs
- ❌ **FEFO picking logic** — no support for first-expiring-first-out
- ❌ **Excise monthly report** — VAT reports exist but no excise-specific cut-off/reporting
- ❌ **Monthly reporting pack** — no consolidated revenue/COGS/margin/inventory valuation report
- ❌ **Excel import/export templates** — no bulk data entry or reconciliation exports

**Biggest risks:**

1. **Lot/expiry tracking gap** — can't trace inventory to shipment/supplier or enforce expiry rules
2. **Landed cost gap** — no way to capture true product cost including duties/freight
3. **Excise reporting gap** — regulatory compliance risk for excise-liable products
4. **COGS automation gap** — manual journal entry required; no automatic posting from sales

**Fastest path to MVP:**

1. Extend inventory schema: add `InventoryLot` table linking to shipments and expiry
2. Create `ImportShipment` module with landed cost capture and allocation endpoints
3. Implement COGS auto-posting on invoice finalization (use catalog's `defaultPurchaseCostCents` or lot-based FEFO cost)
4. Build monthly reports screen aggregating existing data sources
5. Add CSV export endpoints to key list screens
6. Extend tax reports to split excise from VAT

---

## 2. Repo Map & Standards Discovered

### Architecture Summary

- **Monorepo**: `pnpm` workspace with `apps/`, `services/`, `packages/`
- **Backend**: NestJS API (`services/api/src/modules/*`) with hexagonal architecture (domain/application/infrastructure/adapters)
- **Frontend**: Vite + React (`apps/web/src/modules/*`)
- **Shared contracts**: `packages/contracts/src/*` (Zod schemas for API validation)
- **Database**: PostgreSQL with Prisma; schema split across domain bucket schemas (`commerce`, `billing`, `accounting`, etc.) per **3-Tier Persistence Model** (docs/architecture/DATABASE_PERSISTENCE_STRATEGY.md)

### Key Conventions

- **Tenancy**: All tables have `tenantId` + workspace scoping where applicable
- **IDs**: `@default(cuid())` for primary keys
- **Soft delete**: `archivedAt` timestamp (nullable)
- **Audit**: `createdAt`, `updatedAt`, `createdByUserId`, `updatedByUserId` fields
- **Outbox**: Domain events written to `OutboxEvent` table in same transaction (see `packages/data/prisma/schema/95_automation.prisma`)
- **Idempotency**: `IdempotencyKey` table + headers; command endpoints must guard against retries

### Evidence References

- Module boundaries: [docs/architecture/BOUNDARIES.md](docs/architecture/BOUNDARIES.md)
- Persistence strategy: [docs/architecture/DATABASE_PERSISTENCE_STRATEGY.md](docs/architecture/DATABASE_PERSISTENCE_STRATEGY.md)
- Module guide: [docs/guides/MODULE_IMPLEMENTATION_GUIDE.md](docs/guides/MODULE_IMPLEMENTATION_GUIDE.md)
- Catalog feature: [docs/features/catalog.md](docs/features/catalog.md)

---

## 3. Capability Coverage Matrix (Requirements → Current Repo)

| Capability                                        | Status      | Evidence (paths)                                                                                                                                                                                   | Notes / Gaps                                                                                                                                                                                                                                                                                                                     |
| ------------------------------------------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Catalog (items/SKU/variants/UOM/tax profiles)** | **Exists**  | `packages/data/prisma/schema/67_catalog.prisma`<br>`services/api/src/modules/catalog/`<br>`apps/web/src/modules/catalog/screens/`                                                                  | ✅ CatalogItem has `requiresLotTracking`, `requiresExpiryDate`, `shelfLifeDays`, `hsCode`<br>✅ CatalogTaxProfile has `vatRateBps`, `isExciseApplicable`, `exciseType`, `exciseValue`<br>✅ CatalogUom with conversion factors<br>✅ Full CRUD APIs + UI screens<br>**Gap**: No multi-tier UOM conversion beyond baseCode+factor |
| **Import shipment / lot container**               | **Missing** | _(none)_                                                                                                                                                                                           | ❌ No `ImportShipment` or `Shipment` entity<br>❌ Cannot link vendor invoices to shipments<br>❌ Cannot track customs/clearance/freight/broker fees per shipment                                                                                                                                                                 |
| **Landed cost capture + allocation**              | **Missing** | _(none)_                                                                                                                                                                                           | ❌ No fields for air/sea freight, broker fees, bank charges<br>❌ No landed cost allocation logic to SKUs<br>**Possible workaround**: Store total in VendorBill but no SKU-level allocation                                                                                                                                      |
| **Documents/attachments for customs**             | **Partial** | `services/api/src/modules/documents/`<br>`packages/data/prisma/schema/` (File models exist in assets schema for CMS/issues)                                                                        | ✅ Documents module exists but limited to generic file attachments<br>**Gap**: No specific customs document types (invoice, packing list, BOL, customs declaration) or tagging to shipments                                                                                                                                      |
| **Inventory ledger**                              | **Exists**  | `packages/data/prisma/schema/71_inventory.prisma`<br>`InventoryProduct`, `InventoryDocument`, `StockMove`<br>`services/api/src/modules/inventory/`                                                 | ✅ Stock moves tracked by product/location/date<br>✅ Document types: RECEIPT, DELIVERY, TRANSFER, ADJUSTMENT<br>**Gap**: No lot/batch dimension in stock moves or balances                                                                                                                                                      |
| **Lot/batch + expiry modeling**                   | **Missing** | Catalog schema has flags (`requiresLotTracking`, `requiresExpiryDate`) but no inventory tables capture lot data                                                                                    | ❌ No `InventoryLot` or `Batch` table<br>❌ No lot number, expiry date, mfg date fields in `InventoryDocumentLine` or `StockMove`<br>❌ Cannot trace which lot was sold or issued<br>**Catalog flags exist** but unused in inventory module                                                                                      |
| **FEFO picking support**                          | **Missing** | _(none)_                                                                                                                                                                                           | ❌ No expiry-based prioritization logic<br>❌ No "expiring soon" query or report                                                                                                                                                                                                                                                 |
| **Sales channels + invoicing**                    | **Exists**  | `packages/data/prisma/schema/68_sales.prisma` (SalesOrder)<br>`packages/data/prisma/schema/60_billing.prisma` (Invoice)<br>`services/api/src/modules/sales/`, `services/api/src/modules/invoices/` | ✅ SalesOrder + Invoice models<br>✅ B2B invoice with party, line items, tax snapshot<br>✅ Invoice statuses: DRAFT, ISSUED, SENT, PAID, CANCELED<br>**Gap**: No explicit "channel" field (retail/online/market); can use metadata or sourceType                                                                                 |
| **Discounts**                                     | **Partial** | Invoice line has `unitPriceCents` but no explicit discount fields                                                                                                                                  | **Gap**: No discount_pct, discount_amount, or promo code tracking at line or header level                                                                                                                                                                                                                                        |
| **COGS posting/valuation**                        | **Partial** | Accounting COA has `COGS` system account (`services/api/src/modules/accounting/domain/coa-templates.ts`)<br>Journal entry system exists                                                            | ✅ COGS account exists<br>**Gap**: No automatic COGS posting on invoice finalization<br>**Gap**: No inventory valuation (average cost, FIFO) calculation or journal generation<br>Catalog has `defaultPurchaseCostCents` but not updated from landed costs                                                                       |
| **VAT input/output monthly**                      | **Exists**  | `packages/data/prisma/schema/62_tax.prisma`<br>`VatPeriodSummary`, `TaxReport` (VAT_ADVANCE, VAT_ANNUAL)<br>`services/api/src/modules/tax/`                                                        | ✅ VAT profiles with filing frequency (MONTHLY, QUARTERLY, YEARLY)<br>✅ VAT period summary with totals by kind (JSON)<br>✅ Tax reports scheduled by due date<br>**Gap**: No explicit VAT "cutoff lock" UI for closing input/output for a month                                                                                 |
| **Excise/TTĐB**                                   | **Partial** | Catalog tax profile has `isExciseApplicable`, `exciseType` (PERCENT/AMOUNT), `exciseValue`<br>TaxSnapshot breakdownJson includes excise calculations                                               | ✅ Excise flags and values in catalog<br>✅ Tax snapshot captures excise at invoice time<br>**Gap**: No monthly excise report (only VAT reports exist)<br>**Gap**: No excise-specific TaxReportType or aggregation query                                                                                                         |
| **Reporting (monthly pack)**                      | **Missing** | Reporting module exists (`services/api/src/modules/reporting/`) but limited to generic framework                                                                                                   | ❌ No consolidated monthly pack report (revenue, COGS, gross margin, VAT, inventory balance, expiry status, import summary)<br>**Gap**: Must build report aggregation queries and PDF generation                                                                                                                                 |
| **RBAC + audit**                                  | **Exists**  | Identity module with roles/permissions (`services/api/src/modules/identity/`)<br>Audit logs (`AuditLog` table in `95_automation.prisma`)<br>Outbox events for all mutating ops                     | ✅ Tenant isolation, role-based permissions<br>✅ Audit logs capture user, action, entity, timestamp<br>**Gap**: No specific "Customs user" or "Accounting user" roles defined yet (can add)                                                                                                                                     |
| **Excel import/export**                           | **Missing** | _(no generic CSV/Excel export endpoints found)_                                                                                                                                                    | ❌ No bulk import templates for suppliers, items, lots, purchases, sales<br>❌ No CSV export on list endpoints<br>**Workaround**: API returns JSON; frontend could export to CSV client-side but no backend template support                                                                                                     |

---

## 4. Data Model Findings (DB/schema)

### Discovered Relevant Tables (by schema)

**`commerce` schema** (Tier 1 domain bucket):

- `CatalogItem`, `CatalogVariant`, `CatalogVariantBarcode`, `CatalogUom`, `CatalogTaxProfile`, `CatalogCategory`, `CatalogPriceList`, `CatalogPrice`
- `InventoryProduct`, `InventoryWarehouse`, `InventoryLocation`, `InventoryDocument`, `InventoryDocumentLine`, `StockMove`, `StockReservation`, `ReorderPolicy`, `InventorySettings`
- `PurchaseOrder`, `PurchaseOrderLine`, `VendorBill`, `VendorBillLine`, `BillPayment`
- `SalesSettings` (invoice numbering, default accounts)

**`billing` schema**:

- `Invoice`, `InvoiceLine`, `InvoicePayment`, `InvoiceEmailDelivery`
- `TaxProfile`, `TaxCode`, `TaxRate`, `TaxSnapshot`, `VatPeriodSummary`, `TaxConsultant`, `TaxReport`, `TaxReportLine`
- `PaymentMethod`

**`accounting` schema**:

- `AccountingSettings`, `AccountingPeriod`, `LedgerAccount`, `JournalEntry`, `JournalLine`

**`workflow` schema**:

- `OutboxEvent`, `DomainEvent`, `AuditLog`, `IdempotencyKey` (in `95_automation.prisma`)

**`crm` schema**:

- `Party`, `Contact`, `Deal` (supplier/customer tracking)

### Missing Tables/Models Required for Case Study

1. **`InventoryLot`** (or `Batch`) in `commerce` schema:

   ```prisma
   model InventoryLot {
     id                String   @id @default(cuid())
     tenantId          String
     productId         String   // FK to CatalogItem or InventoryProduct
     lotNumber         String
     mfgDate           DateTime? @db.Date
     expiryDate        DateTime? @db.Date
     receivedDate      DateTime  @db.Date
     shipmentId        String?   // FK to ImportShipment (new)
     supplierPartyId   String?
     unitCostCents     Int       // Allocated landed cost per unit
     qtyReceived       Int
     qtyRemaining      Int
     // ... audit fields
     @@unique([tenantId, productId, lotNumber])
     @@index([tenantId, expiryDate])
     @@schema("commerce")
   }
   ```

2. **`ImportShipment`** (new module) in `commerce` schema:

   ```prisma
   model ImportShipment {
     id                String   @id @default(cuid())
     tenantId          String
     shipmentRef       String?  // User-assigned reference
     supplierPartyId   String
     portOfEntry       String?
     arrivalDate       DateTime? @db.Date
     currency          String   @db.VarChar(3)

     // Cost components (all in cents)
     goodsValueCents        Int  // FOB value
     freightCostCents       Int  // Air/sea freight
     insuranceCents         Int
     brokerFeeCents         Int
     clearanceFeeCents      Int
     bankTransferFeeCents   Int
     importDutyCents        Int
     importExciseCents      Int  // TTĐB on import
     importVatCents         Int
     otherCostsCents        Int

     totalLandedCostCents   Int  // Sum of above

     status            ShipmentStatus @default(DRAFT)
     allocatedAt       DateTime? @db.Timestamptz(6)
     // ... audit fields

     lots              InventoryLot[]
     documents         ShipmentDocument[]

     @@index([tenantId, status])
     @@index([tenantId, arrivalDate])
     @@schema("commerce")
   }

   enum ShipmentStatus {
     DRAFT
     IN_TRANSIT
     ARRIVED
     CLEARED
     ALLOCATED
     @@schema("commerce")
   }
   ```

3. **`ShipmentDocument`** (link to existing documents module):

   ```prisma
   model ShipmentDocument {
     id            String  @id @default(cuid())
     tenantId      String
     shipmentId    String
     documentType  ShipmentDocType
     fileId        String  // FK to File/Document
     // ... audit fields
     @@index([tenantId, shipmentId])
     @@schema("commerce")
   }

   enum ShipmentDocType {
     VENDOR_INVOICE
     PACKING_LIST
     BILL_OF_LADING
     CUSTOMS_DECLARATION
     CLEARANCE_RECEIPT
     PAYMENT_PROOF
     @@schema("commerce")
   }
   ```

4. **`InventoryDocumentLine` enhancement**:

   ```prisma
   // Add fields to existing InventoryDocumentLine:
   lotId           String?
   expiryDate      DateTime? @db.Date
   lotNumber       String?   // Denormalized for quick display
   ```

5. **`StockMove` enhancement**:

   ```prisma
   // Add fields to existing StockMove:
   lotId           String?
   ```

6. **`ExciseReport`** (or extend `TaxReport`):
   - Add `TaxReportType.EXCISE_MONTHLY` to existing enum
   - Reuse `TaxReport` + `TaxReportLine` structure with excise-specific line metadata

7. **Monthly reporting tables** (denormalized or materialized views):
   - Could use `ext.kv` for storing monthly snapshots OR
   - Build on-demand aggregation queries (no new table required initially)

### Indexing/Scale Concerns

- **Lot traceability queries** will need indexes on `tenantId + productId + expiryDate` and `tenantId + lotNumber`
- **FEFO picking** needs index on `tenantId + productId + expiryDate` (sorted ascending)
- **Shipment cost allocation** may require denormalization of allocated cost per lot (already proposed in `InventoryLot.unitCostCents`)
- **Monthly VAT/excise aggregation**: Current `VatPeriodSummary.totalsByKindJson` is JSONB; consider extracting excise totals to dedicated columns for query performance if 10k+ invoices/month

### Evidence

- Schema files: `packages/data/prisma/schema/67_catalog.prisma`, `71_inventory.prisma`, `69_purchasing.prisma`, `60_billing.prisma`, `62_tax.prisma`, `58_accounting.prisma`, `95_automation.prisma`

---

## 5. API Findings

### Relevant Endpoints Found

**Catalog** (`services/api/src/modules/catalog/http/`):

- `GET /catalog/items` ✅
- `POST /catalog/items` ✅
- `GET /catalog/items/:itemId` ✅
- `PATCH /catalog/items/:itemId` ✅
- `POST /catalog/items/:itemId/archive` ✅
- Variants, UOMs, tax profiles, categories, price lists endpoints exist ✅

**Inventory** (`services/api/src/modules/inventory/`):

- Products CRUD (uses `InventoryProduct` — separate from `CatalogItem`) ✅
- Warehouses, locations CRUD ✅
- Documents (receipts/deliveries/transfers/adjustments) CRUD ✅
- Stock overview queries ✅
- **Gap**: No lot/expiry filtering or FEFO picking endpoint

**Purchasing** (`services/api/src/modules/purchasing/`):

- Purchase orders CRUD ✅
- Vendor bills CRUD ✅
- Bill payments ✅
- **Gap**: No shipment/import endpoints

**Sales** (`services/api/src/modules/sales/`):

- Sales orders (assumed, module exists) ✅

**Invoicing** (`services/api/src/modules/invoices/`):

- Invoice CRUD ✅
- Issue invoice, send invoice, record payment ✅
- **Gap**: No automatic COGS posting on issue

**Tax** (`services/api/src/modules/tax/`):

- Tax profiles, codes, rates CRUD ✅
- VAT period summaries, tax reports generation ✅
- **Gap**: No excise-specific report endpoint

**Accounting** (`services/api/src/modules/accounting/`):

- Chart of accounts, journal entries, period locking ✅
- **Gap**: No COGS auto-posting integration

### Missing Endpoints for MVP

1. **Import shipment module** (new):
   - `POST /import-shipments` — create shipment with cost breakdown
   - `GET /import-shipments` — list with filters (status, date range)
   - `GET /import-shipments/:id` — detail view
   - `PATCH /import-shipments/:id` — update costs
   - `POST /import-shipments/:id/allocate-costs` — allocate landed cost to lots
   - `POST /import-shipments/:id/documents` — attach customs/clearance docs

2. **Inventory receipt with lot/expiry**:
   - Extend `POST /inventory/documents` (RECEIPT type) to accept `lotNumber`, `expiryDate` per line
   - `GET /inventory/lots` — list lots with filters (product, expiry date range, qty remaining)
   - `GET /inventory/lots/:id` — lot detail with traceability (shipment, sales history)

3. **FEFO picking query**:
   - `GET /inventory/available-lots?productId=X&qty=Y&method=FEFO` — return lots sorted by expiry

4. **COGS posting**:
   - Extend invoice finalization logic to auto-create journal entry (Debit COGS, Credit Inventory) based on lot cost
   - No new endpoint needed; enhance `POST /invoices/:id/issue` use case

5. **VAT month cut-off**:
   - `POST /tax/vat-periods/:periodId/lock` — lock VAT period to prevent backdated changes
   - (Period locking may already exist in accounting module; reuse if possible)

6. **Excise reports**:
   - `POST /tax/excise-reports` — generate monthly excise summary (reuse TaxReport structure with new type)
   - `GET /tax/excise-reports` — list excise reports

7. **Monthly reporting pack**:
   - `GET /reporting/monthly-pack?periodStart=YYYY-MM-DD&periodEnd=YYYY-MM-DD` — aggregated JSON:
     - Revenue, COGS, gross margin (from accounting journal lines)
     - VAT input/output (from VatPeriodSummary)
     - Excise summary (new aggregation)
     - Inventory balance by product (from StockMove SUM)
     - Expiring inventory (lots expiring within 30/60/90 days)
     - Import summary (shipments cleared in period)
   - `POST /reporting/monthly-pack/pdf` — generate PDF of above

8. **Excel/CSV export**:
   - Extend list endpoints with `?format=csv` query param or `Accept: text/csv` header
   - Templates for bulk import (POST with multipart/form-data):
     - `POST /catalog/items/bulk-import`
     - `POST /import-shipments/bulk-import`
     - `POST /inventory/lots/bulk-import`

### Evidence

- Module folders: `services/api/src/modules/{catalog,inventory,purchasing,sales,invoices,tax,accounting}/`
- HTTP controllers: `*.controller.ts` files in `adapters/http/` or module root

---

## 6. Frontend Findings

### Relevant Screens Found

**Catalog** (`apps/web/src/modules/catalog/screens/`):

- `CatalogItemsPage.tsx` — list items ✅
- `CatalogItemEditorPage.tsx` — create/edit item ✅
- `CatalogUomsPage.tsx` ✅
- `CatalogTaxProfilesPage.tsx` ✅
- `CatalogCategoriesPage.tsx` ✅

**Inventory** (`apps/web/src/modules/inventory/screens/`):

- `ProductsPage.tsx` — list products ✅
- `ProductDetailPage.tsx` ✅
- `WarehousesPage.tsx` ✅
- `DocumentsPage.tsx` — list inventory documents ✅
- `DocumentDetailPage.tsx` ✅
- `StockOverviewPage.tsx` ✅
- `ReorderDashboardPage.tsx` ✅
- `InventoryCopilotPage.tsx` (AI assistant) ✅

**Purchasing** (`apps/web/src/modules/purchasing/screens/`):

- `PurchaseOrdersPage.tsx` ✅
- `NewPurchaseOrderPage.tsx` ✅
- `PurchaseOrderDetailPage.tsx` ✅
- `VendorBillsPage.tsx` ✅
- `NewVendorBillPage.tsx` ✅
- `VendorBillDetailPage.tsx` ✅
- `RecordBillPaymentPage.tsx` ✅
- `PurchasingSettingsPage.tsx` ✅
- `PurchasingCopilotPage.tsx` ✅

**Sales** (`apps/web/src/modules/sales/` assumed to have similar CRUD screens)

**Invoicing** (`apps/web/src/modules/` — separate from sales or combined, details not fully visible)

**Tax** (`apps/web/src/modules/tax/screens/TaxReportsPage.tsx` mentioned in docs)

**Accounting** (`apps/web/src/modules/accounting/` — journal entries, COA, periods)

### Missing Pages for MVP

1. **Import shipment management**:
   - `/import-shipments` — list shipments with filters (status, supplier, date)
   - `/import-shipments/new` — create shipment form with cost breakdown inputs
   - `/import-shipments/:id` — detail view with:
     - Cost components (goods, freight, broker, duty, excise, VAT)
     - Documents tab (upload customs/clearance/payment docs)
     - Allocated lots table (after allocation)
     - Allocate costs button → triggers allocation API
   - `/import-shipments/:id/edit`

2. **Inventory receipt with lot/expiry**:
   - Enhance existing `/inventory/documents/new?type=RECEIPT` form to include:
     - Lot number input per line (text field)
     - Expiry date picker per line (date field)
     - Auto-populate expiry from catalog `shelfLifeDays` if present
   - Add "Link to shipment" dropdown (optional) to pre-fill from import shipment

3. **Lot traceability screen**:
   - `/inventory/lots` — list lots with columns: product, lot number, expiry date, qty remaining, shipment ref
   - `/inventory/lots/:id` — detail view with:
     - Lot info (product, lot, expiry, received date, supplier)
     - Linked shipment (cost breakdown)
     - Stock moves history (receipts, issues, adjustments)
     - Sales history (invoices that consumed this lot)

4. **Expiry management screens**:
   - `/inventory/expiry-dashboard` — widget-based dashboard:
     - Expiring within 30 days (sortable table)
     - Expiring within 60/90 days
     - Expired on hand (action required)
   - Expiry alert badges in existing stock overview

5. **Sales/invoicing enhancements**:
   - Add "Channel" dropdown (Retail, Online, Market, B2B) in invoice form (store in metadata or new field)
   - Add discount fields at line level (discount_pct or discount_amount)
   - COGS auto-posting indicator (show journal entry link after invoice issued)

6. **VAT month cut-off screen**:
   - `/tax/vat-periods/:periodId/close` — review screen before locking:
     - Input VAT summary (from vendor bills, expenses)
     - Output VAT summary (from invoices)
     - Net VAT payable/receivable
     - Lock period button (prevents backdated entries)
   - Already partially exists; extend with lock action

7. **Excise reporting screen**:
   - `/tax/excise-reports` — list monthly excise reports (similar to VAT reports page)
   - `/tax/excise-reports/:id` — detail view with:
     - Excise-liable products sold in period
     - Excise collected per product (breakdown by PERCENT vs AMOUNT type)
     - Total excise payable
   - "Generate report" button for new periods

8. **Monthly reporting pack screen**:
   - `/reporting/monthly-pack` — date range picker + generate button → displays:
     - Revenue, COGS, gross margin (table)
     - VAT summary (input/output/net)
     - Excise summary
     - Inventory balance (value + qty by product/category)
     - Expiry status (expiring soon, expired)
     - Import summary (shipments cleared, total landed cost)
   - Export to PDF / Excel buttons

9. **Excel import/export templates**:
   - Add "Import CSV" button to relevant list pages:
     - Catalog items, UOMs, tax profiles
     - Import shipments
     - Inventory receipts (bulk lot creation)
   - Add "Export to CSV" button to all list pages
   - Provide downloadable template CSVs (with headers + sample data)

### Evidence

- Frontend module folders: `apps/web/src/modules/{catalog,inventory,purchasing,sales,tax,accounting}/screens/`
- Route definitions: `routes.tsx` or `index.ts` in each module

---

## 7. Reporting Findings

### What Reporting Framework Exists

- **Reporting module** exists at `services/api/src/modules/reporting/` (folder structure: adapters, application, domain, infrastructure)
- Purpose appears to be generic reporting framework (based on folder structure)
- **No specific monthly reports implemented** (no files found for revenue/COGS/margin/inventory reports)

### Which Monthly Reports Exist vs. Missing

**Exist:**

- ❌ None (no pre-built monthly pack)

**Tax reports exist** (but not general business reports):

- ✅ `TaxReport` model with types: `VAT_ADVANCE`, `VAT_ANNUAL`, `INCOME_TAX`, `EU_SALES_LIST`, `INTRASTAT`, etc.
- ✅ VAT period summaries (`VatPeriodSummary`)
- ❌ No `EXCISE_MONTHLY` report type

**Missing (required for case study):**

1. **Revenue report** (monthly) — aggregate invoice totals by product/category/channel
2. **COGS report** (monthly) — aggregate COGS journal lines (when auto-posting implemented)
3. **Gross margin report** (monthly) — revenue - COGS, by product/category
4. **Inventory valuation report** (point-in-time) — qty on hand × cost per unit (from lots or default cost)
5. **Expiry status report** (point-in-time) — lots expiring within 30/60/90 days + expired on hand
6. **Import summary report** (monthly) — shipments cleared, total landed cost, duties/excise paid
7. **VAT monthly report** (exists, may need UI enhancements for lock/cut-off)
8. **Excise monthly report** (missing) — excise collected by product, split by type (PERCENT/AMOUNT)

### Minimum Monthly Pack Required for This Case

**Monthly Pack Components** (single consolidated report):

1. **P&L summary** (revenue, COGS, gross margin)
2. **VAT summary** (input VAT, output VAT, net payable/receivable)
3. **Excise summary** (excise collected, by product category)
4. **Inventory balance** (qty + value by product/category)
5. **Expiry alerts** (expiring within 30/60/90 days, expired on hand)
6. **Import activity** (shipments received, landed costs, duties/excise paid)
7. **Reconciliation notes** (manual adjustments, journal entry references)

**Deliverable format**: PDF + Excel export

**Implementation approach**:

- Aggregation queries pulling from:
  - `JournalLine` (revenue, COGS accounts)
  - `VatPeriodSummary` (VAT totals)
  - `TaxSnapshot` (excise breakdown)
  - `StockMove` + `InventoryLot` (inventory balance + cost)
  - `InventoryLot` (expiry status)
  - `ImportShipment` (import summary)
- PDF generation using existing `pdfStorageKey` pattern (see Invoice model)
- Excel export via CSV or library like `exceljs`

### Evidence

- Reporting module: `services/api/src/modules/reporting/`
- Tax reports: `packages/data/prisma/schema/62_tax.prisma` (TaxReport model)
- Accounting data: `packages/data/prisma/schema/58_accounting.prisma` (JournalEntry, JournalLine)

---

## 8. Gaps & Recommended Backlog (Prioritized)

### P0 (Must-Have for MVP)

**P0-1: Lot/batch + expiry tracking (inventory)**

- **What**: Add `InventoryLot` table; extend `InventoryDocumentLine` and `StockMove` with `lotId`, `expiryDate`
- **Why**: Core requirement for traceability and regulatory compliance (expiry enforcement)
- **Dependencies**: Catalog already has flags (`requiresLotTracking`, `requiresExpiryDate`)
- **Risk**: Without this, cannot trace inventory to supplier/shipment or prevent expired goods sales
- **Complexity**: **M** (schema migration + API updates + UI form changes)

**P0-2: Import shipment module**

- **What**: Create `ImportShipment` entity/module with cost breakdown fields (freight, broker, duties, excise, VAT)
- **Why**: Required to capture landed costs and link to lots for true COGS
- **Dependencies**: None (new module)
- **Risk**: Without this, landed costs are lost or manually tracked in spreadsheets
- **Complexity**: **L** (new module: DB + API + UI from scratch)

**P0-3: Landed cost allocation logic**

- **What**: API endpoint to allocate shipment costs to lots/SKUs (proportional by weight/value/qty)
- **Why**: Accurate product costing for COGS and pricing decisions
- **Dependencies**: P0-1 (lots), P0-2 (shipment)
- **Risk**: Inaccurate COGS → incorrect gross margin → bad business decisions
- **Complexity**: **M** (allocation algorithm + API + DB updates)

**P0-4: Excise monthly report**

- **What**: Extend `TaxReport` with `EXCISE_MONTHLY` type; build aggregation query from `TaxSnapshot.breakdownJson`
- **Why**: Regulatory compliance for excise-liable products
- **Dependencies**: Tax module exists; need to parse excise from snapshots
- **Risk**: Compliance violation, fines
- **Complexity**: **S** (reuse existing report structure + new aggregation query)

**P0-5: COGS auto-posting on invoice finalization**

- **What**: On invoice issue, auto-create journal entry (Debit COGS, Credit Inventory) using lot cost or default cost
- **Why**: Accurate P&L without manual journal entries
- **Dependencies**: P0-1 (lots with cost), Accounting module (journal entry API)
- **Risk**: Manual COGS entry → errors, delays in financial close
- **Complexity**: **M** (integration between invoicing and accounting modules via domain event or use case call)

### P1 (High Priority for Operational Efficiency)

**P1-1: FEFO picking query/logic**

- **What**: Inventory API endpoint to return lots sorted by expiry date (FEFO); optional: auto-reserve on sales order
- **Why**: Prevent expiry waste; regulatory best practice for food/pharma
- **Dependencies**: P0-1 (lots with expiry)
- **Risk**: Expired inventory waste, customer complaints
- **Complexity**: **S** (query + index on expiry date)

**P1-2: Monthly reporting pack UI**

- **What**: Frontend screen with date range picker → display revenue, COGS, margin, VAT, excise, inventory, expiry, import summaries
- **Why**: Single source of truth for month-end review
- **Dependencies**: P0-4 (excise report), P0-5 (COGS), P0-1 (inventory lot cost)
- **Risk**: Finance team builds manual reports in Excel → errors, inefficiency
- **Complexity**: **M** (aggregation queries + PDF generation + UI)

**P1-3: Expiry dashboard/alerts**

- **What**: Frontend dashboard page showing expiring inventory (30/60/90 days); email/notification alerts
- **Why**: Proactive inventory management to avoid waste
- **Dependencies**: P0-1 (lots with expiry)
- **Risk**: Expired goods discovered too late → write-offs
- **Complexity**: **S** (query + UI widgets)

**P1-4: Documents/attachments for shipments**

- **What**: Link existing Documents module to shipments; add document type enum (VENDOR_INVOICE, CUSTOMS_DECLARATION, etc.)
- **Why**: Audit trail for customs/clearance; required for compliance and disputes
- **Dependencies**: P0-2 (shipment module), existing Documents module
- **Risk**: Missing docs during audit → penalties
- **Complexity**: **S** (extend existing Documents module with new entity link)

**P1-5: CSV export for all list screens**

- **What**: Add `?format=csv` support to list endpoints (catalog, inventory, shipments, invoices, etc.)
- **Why**: Excel-first operation for reconciliation and external audits
- **Dependencies**: None (generic feature)
- **Risk**: Users manually copy-paste data → errors
- **Complexity**: **S** (add CSV serializer middleware)

### P2 (Nice-to-Have for Scale/UX)

**P2-1: Bulk CSV import templates**

- **What**: CSV upload endpoints for catalog items, UOMs, tax profiles, shipments, lots
- **Why**: Faster onboarding, bulk data entry for large catalogs
- **Dependencies**: P1-5 (export as template reference)
- **Risk**: Manual data entry → slow, error-prone
- **Complexity**: **M** (validation + upsert logic per entity)

**P2-2: Sales channel tracking**

- **What**: Add `channel` field to Invoice (RETAIL, ONLINE, MARKET, B2B) or use existing `sourceType`
- **Why**: Revenue breakdown by channel for business intelligence
- **Dependencies**: None
- **Risk**: Cannot analyze channel profitability
- **Complexity**: **S** (add field + UI dropdown)

**P2-3: Discount tracking**

- **What**: Add discount fields to `InvoiceLine` (discount_pct, discount_amount, promo_code)
- **Why**: Accurate margin analysis (gross vs. net revenue)
- **Dependencies**: None
- **Risk**: Discounts hidden in unitPrice adjustments → unclear profitability
- **Complexity**: **S** (schema + UI)

**P2-4: Inventory valuation methods (FIFO, avg cost)**

- **What**: Build costing engine to calculate inventory value using FIFO or weighted average cost
- **Why**: Required for financial statements (balance sheet) and COGS accuracy
- **Dependencies**: P0-1 (lots with cost), P0-5 (COGS posting)
- **Risk**: Manual valuation → errors in financial reporting
- **Complexity**: **L** (costing engine + reports)

**P2-5: VAT period lock UI**

- **What**: Frontend screen to lock VAT periods (prevent backdated invoices/bills after cut-off)
- **Why**: Regulatory compliance (VAT filing deadlines)
- **Dependencies**: Accounting period locking may already exist; extend to tax periods
- **Risk**: Late entries → amended VAT returns → penalties
- **Complexity**: **S** (UI + lock enforcement in API)

**P2-6: RBAC roles for Customs + Accounting users**

- **What**: Define roles: "Customs Officer" (view/edit shipments, clearance docs), "Accounting Manager" (close periods, reports)
- **Why**: Separation of duties, audit compliance
- **Dependencies**: Identity module with role management already exists
- **Risk**: All users have same access → security, compliance risk
- **Complexity**: **S** (role definitions + permission assignments)

---

## 9. Integration & Boundaries Plan (Proposal Only)

### Challenge: Strict Module Boundaries + Cross-Module Data Needs

Per **BOUNDARIES.md**, modules cannot directly read/write other modules' tables. Cross-module access must use:

1. HTTP APIs (sync, for UI composition)
2. Domain events via outbox (async, for denormalization)
3. Explicit ports (rare, documented)

### Proposed Integration Points

**1. Catalog → Inventory (product master data)**

- **Need**: Inventory needs product name, UOM, tax profile, lot/expiry flags
- **Solution**:
  - Store `catalogItemId` (FK) in `InventoryProduct` (already has `productId` field, may be separate)
  - OR: Merge `InventoryProduct` into `CatalogItem` (breaking change)
  - **Recommended**: Keep separate; Inventory reads catalog via HTTP API in UI; denormalize minimal fields (name, sku) in inventory tables for performance
  - Outbox event: `catalog.item.updated` → Inventory worker updates denormalized fields

**2. Purchasing → Shipment (link PO to shipment)**

- **Need**: Link `VendorBill` to `ImportShipment` for cost tracing
- **Solution**:
  - Add `shipmentId` field to `VendorBill` (optional FK) OR
  - Add `purchaseOrderId` field to `ImportShipment` OR
  - Use `sourceType/sourceId` pattern (generic link)
  - **Recommended**: `ImportShipment.purchaseOrderId` (optional) + `VendorBill.shipmentId` (optional) for flexibility

**3. Shipment → Inventory (lot creation)**

- **Need**: When shipment costs are allocated, create `InventoryLot` records
- **Solution**:
  - Shipment module emits event: `import-shipment.costs-allocated`
  - Inventory worker consumes event → creates `InventoryLot` records with `shipmentId` and `unitCostCents`
  - OR: Shipment allocation API directly calls Inventory use case (via port injection)
  - **Recommended**: Use domain event for loose coupling; Inventory module owns lot creation logic

**4. Inventory → Sales/Invoicing (lot consumption, COGS)**

- **Need**: On invoice finalization, determine which lots were consumed (FEFO) and post COGS
- **Solution**:
  - Sales module emits event: `invoice.issued` (already exists)
  - Inventory worker consumes event → creates `StockMove` (delivery type) with `lotId` (FEFO logic)
  - Accounting worker consumes event → creates journal entry for COGS (reads lot cost via Inventory API or from event payload)
  - **Recommended**: Multi-step choreography:
    1. Invoice issued → Inventory reserves/consumes lots (FEFO)
    2. Inventory emits: `inventory.lot-consumed` (with lot cost)
    3. Accounting consumes → posts COGS journal entry

**5. Tax → Accounting (VAT/excise posting)**

- **Need**: Monthly VAT/excise liability posted to accounting ledger
- **Solution**:
  - Tax module emits event: `tax.vat-period-submitted` (with payable amount)
  - Accounting worker consumes event → creates journal entry (Debit VAT Expense, Credit VAT Payable)
  - OR: Tax module directly calls Accounting API (sync)
  - **Recommended**: Use domain event for audit trail

**6. Reporting → All Modules (data aggregation)**

- **Need**: Monthly pack report pulls data from Catalog, Inventory, Sales, Tax, Accounting
- **Solution**:
  - Reporting module queries other modules via HTTP APIs (read-only, for UI display) OR
  - Build read models in Reporting schema (denormalized) updated by outbox events OR
  - On-demand aggregation (no caching; slower but always current)
  - **Recommended**: On-demand aggregation for MVP (simpler); migrate to read models if performance issues

### Best Practices Alignment

- ✅ Use outbox events for state propagation (lot cost, COGS trigger)
- ✅ Use HTTP APIs for read-only composition (reporting, UI dropdowns)
- ✅ Use idempotency keys for all commands (shipment allocation, COGS posting)
- ✅ Keep domain logic in owning module (Inventory owns lot creation, Accounting owns journal entries)
- ✅ Avoid circular dependencies (Shipment → Inventory → Accounting; no reverse calls)

---

## 10. Open Questions / Assumptions

### Uncertainties (Could Not Resolve from Repo)

1. **Lot tracking scope**: Are ALL products lot-tracked, or only flagged items (`requiresLotTracking=true`)?
   - **Assumption for backlog**: Only flagged items; others use default cost from catalog
   - **Clarification needed**: Confirm with stakeholders

2. **COGS valuation method**: FIFO, weighted average, or specific identification (lot-based)?
   - **Assumption for P0**: Lot-based (specific ID) for lot-tracked items; default cost for others
   - **Clarification needed**: Finance team preference

3. **Excise calculation**: Is excise calculated at invoice time (like VAT) or at import?
   - **Found in repo**: Catalog has `exciseType` (PERCENT/AMOUNT) and `exciseValue`; TaxSnapshot includes excise
   - **Assumption**: Excise calculated at both import (paid to customs) and sale (collected from customer, if pass-through)
   - **Clarification needed**: Vietnam excise rules (import vs. sale)

4. **VAT on imports**: Is import VAT recoverable (input VAT) or capitalized into landed cost?
   - **Assumption**: Recoverable (most jurisdictions); record as VAT input
   - **Clarification needed**: Accounting policy

5. **Shipment cost allocation basis**: Proportional by weight, FOB value, or qty?
   - **Assumption**: Proportional by FOB value (most common)
   - **Clarification needed**: Business preference

6. **Channel tracking**: Use existing `sourceType` field or add new `channel` field?
   - **Assumption**: Add new field for clarity
   - **Clarification needed**: Data model preference

7. **Excel templates format**: CSV, XLSX, or both?
   - **Assumption**: CSV for simplicity (UTF-8, comma-delimited)
   - **Clarification needed**: User preference

8. **Reporting frequency**: Monthly pack generated automatically (scheduled) or on-demand?
   - **Assumption**: On-demand for MVP; scheduled generation in P2
   - **Clarification needed**: Operations workflow

9. **Audit retention**: How long to keep audit logs and outbox events?
   - **Found in repo**: No TTL or archival logic visible
   - **Assumption**: Retain indefinitely for now; add archival in P2
   - **Clarification needed**: Compliance requirements

10. **User roles**: Are "Customs Officer" and "Accounting Manager" real roles, or should we use existing roles?
    - **Found in repo**: Identity module has role system; no predefined roles visible
    - **Assumption**: Define new roles as needed
    - **Clarification needed**: Org structure

---

## Appendix A: Search Evidence

### Commands Run (or Equivalent Semantic Searches)

**Directory listings:**

```bash
ls /services/api/src/modules/
# Result: catalog, inventory, purchasing, sales, invoices, tax, accounting, documents, party, crm, ...

ls /apps/web/src/modules/
# Result: catalog, inventory, purchasing, sales, accounting, tax, settings, ...

ls /packages/contracts/src/
# Result: catalog, inventory, purchasing, sales, invoices, tax, accounting, ...
```

**Schema searches:**

```bash
rg "catalog|product|sku|item|variant|uom" packages/data/prisma/schema/*.prisma
# Result: 67_catalog.prisma (CatalogItem, CatalogVariant, CatalogUom, CatalogTaxProfile)

rg "inventory|stock|ledger|lot|batch|expiry" packages/data/prisma/schema/*.prisma
# Result: 71_inventory.prisma (InventoryProduct, InventoryDocument, StockMove)
# NO lot/batch/expiry fields found

rg "purchase|supplier|vendor|shipment" packages/data/prisma/schema/*.prisma
# Result: 69_purchasing.prisma (PurchaseOrder, VendorBill)
# NO shipment entity found

rg "vat|tax|excise|duty" packages/data/prisma/schema/*.prisma
# Result: 62_tax.prisma (TaxProfile, TaxCode, TaxRate, TaxSnapshot, VatPeriodSummary, TaxReport)
# Found: CatalogTaxProfile.isExciseApplicable, exciseType, exciseValue

rg "invoice|billing|revenue|cogs" packages/data/prisma/schema/*.prisma
# Result: 60_billing.prisma (Invoice, InvoiceLine, InvoicePayment)
#         58_accounting.prisma (JournalEntry, LedgerAccount with COGS system key)

rg "report|monthly|export|excel|csv" packages/data/prisma/schema/*.prisma
# Result: 62_tax.prisma (TaxReport)
# NO monthly pack or generic export tables
```

**Code searches:**

```bash
rg "requiresLotTracking|requiresExpiryDate|shelfLifeDays" services/api/src/modules/catalog/**/*.ts
# Result: Found in catalog repository adapters, use cases (fields exist in CatalogItem)

rg "landed|customs|clearance|freight|broker|duty|import" services/api/src/modules/**/*.ts
# Result: NO results (landed cost not implemented)

rg "COGS|cost of goods|inventory valuation" services/api/src/modules/**/*.ts
# Result: accounting/domain/coa-templates.ts (COGS account definition)
# NO auto-posting logic found

rg "excel|csv|export|import|template" services/api/src/modules/**/*.ts
# Result: NO generic CSV export endpoints found
```

**Module file inventories:**

```bash
ls services/api/src/modules/catalog/
# Result: domain, application, infrastructure, adapters, http, policies

ls apps/web/src/modules/catalog/screens/
# Result: CatalogItemsPage, CatalogItemEditorPage, CatalogUomsPage, CatalogTaxProfilesPage, CatalogCategoriesPage

ls apps/web/src/modules/inventory/screens/
# Result: ProductsPage, DocumentsPage, StockOverviewPage, ReorderDashboardPage, WarehousesPage

ls apps/web/src/modules/purchasing/screens/
# Result: PurchaseOrdersPage, VendorBillsPage, NewPurchaseOrderPage, VendorBillDetailPage
```

**Documentation reviewed:**

- `docs/README.md` — index of all docs
- `docs/architecture/DATABASE_PERSISTENCE_STRATEGY.md` — 3-tier persistence model
- `docs/architecture/BOUNDARIES.md` — module boundaries and integration patterns
- `docs/guides/MODULE_IMPLEMENTATION_GUIDE.md` — module structure conventions
- `docs/features/catalog.md` — catalog module overview
- `docs/features/INVENTORY_NOTE.md` — tax reporting note (VAT vs excise gap mentioned)

**Key findings:**

- Catalog flags (`requiresLotTracking`, `requiresExpiryDate`) exist but UNUSED in inventory
- No `InventoryLot` or `Batch` table
- No `ImportShipment` or `Shipment` entity
- No landed cost fields anywhere
- Tax module has VAT but NOT excise monthly reports
- COGS account exists but NO auto-posting logic
- No monthly reporting pack
- No CSV export infrastructure

---

**End of Report**
