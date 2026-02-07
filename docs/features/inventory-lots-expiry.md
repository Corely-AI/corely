# Inventory Lot & Expiry Tracking

**Status:** ✅ Implemented (PR1)
**Module:** `inventory`
**Version:** 1.0
**Date:** 2026-02-07

---

## Overview

The Inventory Lot & Expiry Tracking feature enables businesses to track inventory at the lot/batch level, maintain full traceability from receipt to consumption, and manage product expiry dates to prevent waste and ensure compliance.

### Key Capabilities

- **Lot/Batch Tracking**: Assign unique lot numbers to received inventory
- **Expiry Management**: Track manufacturing and expiry dates, prevent expired stock issues
- **Traceability**: Link lots to import shipments, suppliers, and stock movements
- **FEFO Support**: Foundation for first-expiring-first-out picking (implemented in PR5)
- **Cost Tracking**: Store unit cost per lot for accurate COGS calculation
- **Status Management**: AVAILABLE, QUARANTINE, BLOCKED, DISPOSED states

---

## Architecture

### Database Schema (`commerce` schema)

**`InventoryLot` Table:**

```prisma
model InventoryLot {
  id                String              @id @default(cuid())
  tenantId          String
  productId         String              // CatalogItem or InventoryProduct
  lotNumber         String              // Unique per product
  mfgDate           DateTime?           @db.Date
  expiryDate        DateTime?           @db.Date
  receivedDate      DateTime            @db.Date
  shipmentId        String?             // Link to ImportShipment (PR3)
  supplierPartyId   String?
  unitCostCents     Int?                // Landed cost (allocated in PR4)
  qtyReceived       Int
  qtyOnHand         Int
  qtyReserved       Int                 @default(0)
  status            InventoryLotStatus  @default(AVAILABLE)
  notes             String?
  metadataJson      Json?               @db.JsonB
  // ... audit fields

  @@unique([tenantId, productId, lotNumber])
  @@index([tenantId, productId, expiryDate])
  @@index([tenantId, expiryDate])
  @@index([tenantId, status])
  @@schema("commerce")
}
```

**`InventoryLotStatus` Enum:**

- `AVAILABLE` - Normal stock available for issue
- `QUARANTINE` - On hold pending quality check
- `BLOCKED` - Cannot be issued (regulatory/quality issue)
- `DISPOSED` - Expired or damaged, written off

**Enhanced Models:**

- `InventoryDocumentLine` - Added `lotId`, `lotNumber`, `mfgDate`, `expiryDate` fields
- `StockMove` - Added `lotId` field for traceability

---

## API Endpoints

### Create Lot

```http
POST /inventory/lots
Authorization: Bearer <token>
Content-Type: application/json

{
  "productId": "prod_123",
  "lotNumber": "LOT-2026-001",
  "mfgDate": "2026-01-15",
  "expiryDate": "2027-01-15",
  "receivedDate": "2026-02-01",
  "shipmentId": "ship_abc",
  "supplierPartyId": "supplier_xyz",
  "qtyReceived": 1000,
  "status": "AVAILABLE",
  "notes": "First batch from supplier XYZ"
}
```

**Response:**

```json
{
  "lot": {
    "id": "lot_def456",
    "tenantId": "tenant_123",
    "productId": "prod_123",
    "lotNumber": "LOT-2026-001",
    "mfgDate": "2026-01-15",
    "expiryDate": "2027-01-15",
    "receivedDate": "2026-02-01",
    "shipmentId": "ship_abc",
    "supplierPartyId": "supplier_xyz",
    "unitCostCents": null,
    "qtyReceived": 1000,
    "qtyOnHand": 1000,
    "qtyReserved": 0,
    "status": "AVAILABLE",
    "notes": "First batch from supplier XYZ",
    "createdAt": "2026-02-07T19:30:00Z",
    "updatedAt": "2026-02-07T19:30:00Z"
  }
}
```

### List Lots (with Filters)

```http
GET /inventory/lots?productId=prod_123&status=AVAILABLE&expiryBefore=2026-12-31&limit=50&offset=0
```

**Query Parameters:**

- `productId` - Filter by product
- `status` - Filter by status (AVAILABLE, QUARANTINE, BLOCKED, DISPOSED)
- `expiryBefore` - Lots expiring before this date
- `expiryAfter` - Lots expiring after this date
- `shipmentId` - Filter by import shipment
- `supplierPartyId` - Filter by supplier
- `qtyOnHandGt` - Only lots with qty on hand greater than this value
- `limit` - Page size (default 100, max 1000)
- `offset` - Page offset (default 0)

**Response:**

```json
{
  "lots": [...],
  "total": 42
}
```

### Get Lot Detail

```http
GET /inventory/lots/{lotId}
```

### Get Expiry Summary

```http
GET /inventory/expiry/summary?days=30
```

**Query Parameters:**

- `days` - Days ahead to check for expiry (default 30)

**Response:**

```json
{
  "expiringSoon": [
    {
      "lotId": "lot_abc",
      "lotNumber": "LOT-2026-001",
      "productId": "prod_123",
      "productName": "Product A",
      "expiryDate": "2026-03-05",
      "qtyOnHand": 500,
      "daysUntilExpiry": 26
    }
  ],
  "expired": [
    {
      "lotId": "lot_xyz",
      "lotNumber": "LOT-2025-050",
      "productId": "prod_456",
      "productName": "Product B",
      "expiryDate": "2026-01-31",
      "qtyOnHand": 100,
      "daysUntilExpiry": -7
    }
  ],
  "totalExpiringSoon": 3,
  "totalExpired": 2
}
```

---

## UI Screens

### Lots List Page

**Route:** `/inventory/lots`
**Permission:** `inventory.lots.read`

**Features:**

- Table view with columns: Lot Number, Product, Expiry Date, Qty On Hand, Qty Reserved, Status
- Collapsible filter panel (product, status, expiry date range)
- Status badges with color coding
- Create Lot button
- View button navigates to lot detail page

### Lot Detail Page

**Route:** `/inventory/lots/:id`
**Permission:** `inventory.lots.read`

**Sections:**

- **Lot Information**: Lot number, Product ID, Status badge
- **Dates**: Manufacturing date, Expiry date, Received date
- **Quantity**: Qty received, Qty on hand, Qty reserved
- **Traceability**: Shipment link, Supplier, Unit cost
- **Notes**: Free-form text
- **Stock Movements**: Table of related moves with document links
- **Metadata**: JSON display (if present)

### Expiry Dashboard

**Route:** `/inventory/expiry`
**Permission:** `inventory.lots.read`

**Features:**

- Summary cards: Expired count (red), Expiring Soon count (orange)
- Days-ahead filter (default 30)
- Two tables:
  - Expired Lots (red theme)
  - Expiring Soon (orange theme)
- Columns: Lot Number, Product, Expiry Date, Qty, Days Until/Since Expiry
- Color-coded days: Red (expired), Orange (<=7 days), Yellow (8-14 days), Normal (15+ days)
- Empty state: "All Clear!" message

---

## Integration Points

### Catalog Module (PR2)

Catalog items have lot/expiry configuration flags:

- `requiresLotTracking` (boolean)
- `requiresExpiryDate` (boolean)
- `shelfLifeDays` (int, optional)

These flags are enforced during receipt posting (PR2):

- If `requiresLotTracking=true`, lot number is mandatory on receipt lines
- If `requiresExpiryDate=true`, expiry or mfg date is mandatory
- If `shelfLifeDays` present and mfg date provided, expiry auto-calculated

### Import Shipment Module (PR3)

Lots can be linked to import shipments:

- `shipmentId` field stores reference
- After shipment cost allocation (PR4), `unitCostCents` populated
- Traceability from lot → shipment → customs/freight costs

### FEFO Picking (PR5)

Lots with expiry dates used in FEFO (First-Expiring-First-Out) algorithm:

- Delivery documents auto-allocate lots by expiry date ascending
- Expired lots can be blocked from issue (configurable)

### COGS Auto-Posting (PR6)

Lot-based cost tracking enables accurate COGS:

- Invoice issue triggers consumption from specific lots (FEFO)
- `unitCostCents` from lot determines COGS journal entry amount
- Avoids using catalog default cost for lot-tracked items

---

## Business Rules

1. **Unique Lot Numbers**: Lot number must be unique per product within a tenant
2. **Initial Quantities**: On creation, `qtyOnHand = qtyReceived` and `qtyReserved = 0`
3. **Lot Consumption**: Decreases `qtyOnHand`, `qtyReserved` tracks reservations
4. **Status Transitions**:
   - AVAILABLE → QUARANTINE (pending QC)
   - QUARANTINE → AVAILABLE (QC passed)
   - QUARANTINE → BLOCKED (QC failed)
   - AVAILABLE/QUARANTINE/BLOCKED → DISPOSED (write-off)
5. **Expiry Enforcement**: Configurable warning/block on issue from expired lots (PR2)
6. **Cost Allocation**: `unitCostCents` nullable until allocated from shipment (PR4)

---

## Permissions

| Permission              | Description                    | Required For                     |
| ----------------------- | ------------------------------ | -------------------------------- |
| `inventory.lots.read`   | View lots and expiry dashboard | GET endpoints, list/detail pages |
| `inventory.lots.manage` | Create/update lots             | POST endpoints, create lot       |

---

## Use Cases

### UC-1: Receive Goods with Lot Tracking

**Actor:** Warehouse Staff
**Preconditions:** Catalog item has `requiresLotTracking=true`

**Flow:**

1. Create receipt document (POST `/inventory/documents`)
2. For each line, provide `lotNumber`, `mfgDate`, `expiryDate`
3. Post receipt → system creates `InventoryLot` records
4. `StockMove` created with `lotId` for traceability

### UC-2: Track Expiring Inventory

**Actor:** Inventory Manager
**Preconditions:** Some lots have expiry dates approaching

**Flow:**

1. Navigate to `/inventory/expiry` dashboard
2. Review "Expiring Soon" section (default 30 days ahead)
3. Filter by days ahead to adjust time horizon
4. Click "View" to see lot detail
5. Take action: mark as QUARANTINE, create disposal document, or expedite sales

### UC-3: Trace Product to Shipment

**Actor:** Quality Manager
**Preconditions:** Lot linked to import shipment

**Flow:**

1. Navigate to lot detail page (`/inventory/lots/:id`)
2. View "Traceability" section
3. Click shipment link → navigate to shipment detail (PR3)
4. Review customs documents, clearance dates, supplier info

### UC-4: Check Lot Availability for Order

**Actor:** Sales Staff
**Preconditions:** Customer order requires specific product

**Flow:**

1. Navigate to `/inventory/lots` page
2. Filter by `productId` and `status=AVAILABLE`
3. Check `qtyOnHand` for each lot
4. Select lots with furthest expiry dates first (manually, FEFO automation in PR5)

---

## Testing

### Unit Tests

**Domain Layer:**

- ✅ Lot entity creation with default values
- ✅ Unique lot number validation
- ✅ Quantity initialization logic

**Application Layer:**

- ✅ Create lot use case with idempotency
- ✅ List lots with filters (status, expiry date range, pagination)
- ✅ Get expiry summary calculation (days until expiry)

**Infrastructure Layer:**

- ✅ Prisma repository adapter (LocalDate handling, tenant scoping)

### Integration Tests

```typescript
describe("POST /inventory/lots", () => {
  it("creates lot with valid input", async () => {
    const input = {
      productId: "prod_123",
      lotNumber: "LOT-TEST-001",
      receivedDate: "2026-02-01",
      expiryDate: "2027-02-01",
      qtyReceived: 1000,
    };

    const res = await request(app)
      .post("/inventory/lots")
      .set("Authorization", `Bearer ${token}`)
      .send(input);

    expect(res.status).toBe(201);
    expect(res.body.lot.qtyOnHand).toBe(1000);
    expect(res.body.lot.qtyReserved).toBe(0);
  });

  it("rejects duplicate lot number for same product", async () => {
    // Create first lot
    await createLot({ productId: "prod_123", lotNumber: "LOT-001" });

    // Attempt duplicate
    const res = await request(app)
      .post("/inventory/lots")
      .send({ productId: "prod_123", lotNumber: "LOT-001" });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain("Lot number already exists");
  });
});

describe("GET /inventory/expiry/summary", () => {
  it("returns expiring and expired lots", async () => {
    // Create lots with various expiry dates
    await createLot({ expiryDate: "2026-02-05" }); // Expired
    await createLot({ expiryDate: "2026-03-05" }); // Expiring soon
    await createLot({ expiryDate: "2027-02-05" }); // Far future

    const res = await request(app)
      .get("/inventory/expiry/summary?days=30")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.expired.length).toBe(1);
    expect(res.body.expiringSoon.length).toBe(1);
  });
});
```

### E2E Tests

**Test: Lot Creation Flow**

1. Navigate to `/inventory/lots`
2. Click "Create Lot" button
3. Fill form with lot details
4. Submit → verify redirect to lot detail page
5. Verify lot appears in list

**Test: Expiry Dashboard**

1. Create lot with expiry date 10 days in future
2. Navigate to `/inventory/expiry`
3. Verify lot appears in "Expiring Soon" table
4. Verify "Days Until Expiry" shows correct value (10)

---

## Performance Considerations

### Indexes

Critical indexes for query performance:

```sql
CREATE INDEX idx_inventory_lot_tenant_product_expiry
  ON commerce.InventoryLot(tenantId, productId, expiryDate);

CREATE INDEX idx_inventory_lot_tenant_expiry
  ON commerce.InventoryLot(tenantId, expiryDate);

CREATE INDEX idx_inventory_lot_tenant_status
  ON commerce.InventoryLot(tenantId, status);
```

### Query Optimization

- **List Lots**: Uses offset pagination (consider cursor-based for 10k+ lots)
- **Expiry Summary**: Filters by `expiryDate < now() + days` in SQL, performant up to 100k lots
- **Lot Detail**: Single-row lookup by primary key, very fast

### Caching Strategy

- **Product Names**: Denormalized in expiry summary to avoid N+1 queries
- **Query Results**: Use React Query cache (5 minutes) for list/summary queries
- **Detail Page**: Invalidate cache on mutation (create/update lot)

---

## Roadmap

### Completed (PR1)

- ✅ Database schema and migration
- ✅ API contracts (Zod schemas)
- ✅ Backend CRUD (domain, application, infrastructure, HTTP)
- ✅ Frontend UI (list, detail, expiry dashboard)
- ✅ Tenant scoping and permissions
- ✅ Basic traceability (shipment, supplier links)

### Next Steps

**PR2: Receipt Form Enhancements**

- Enforce lot/expiry rules on receipt posting
- Auto-calculate expiry from mfg date + shelf life
- Block/warn on missing lot number for lot-tracked items

**PR3: Import Shipment Module**

- Link lots to import shipments
- Store shipment reference in `shipmentId` field

**PR4: Landed Cost Allocation**

- Populate `unitCostCents` from shipment cost allocation
- Enable accurate COGS calculation

**PR5: FEFO Picking**

- Auto-allocate lots by expiry date on delivery
- Block expired lot consumption (configurable)

**PR6: COGS Auto-Posting**

- Use lot-based costs in COGS journal entries
- Trace COGS back to specific lots

### Future Enhancements

- Lot splitting/merging
- Quality check workflows (QUARANTINE status transitions)
- Batch number pattern generation (auto-generate lot numbers)
- Barcode scanning integration for lot entry
- Lot genealogy (parent-child relationships for processed goods)
- Expiry date extension (regulatory approval workflows)

---

## FAQ

**Q: Can I use lot tracking for only some products?**
A: Yes! Set `requiresLotTracking=true` on CatalogItem only for products needing tracking. Other products can use standard inventory without lots.

**Q: What happens if I don't set an expiry date?**
A: Expiry date is optional unless `requiresExpiryDate=true` on the catalog item. Lots without expiry won't appear in expiry dashboard.

**Q: Can I have multiple lots with the same lot number for different products?**
A: Yes! Lot numbers are unique per product within a tenant, not globally unique.

**Q: How do I write off expired inventory?**
A: Change lot status to DISPOSED and create an ADJUSTMENT document to decrease qty on hand to zero.

**Q: Can I edit a lot after creation?**
A: Currently, lots are immutable after creation (audit trail). Future enhancement will add lot editing with change history.

**Q: How do I link lots to specific storage locations?**
A: Lots are not tied to locations directly. Instead, `StockMove` records track lot movement between locations. Check stock move history on lot detail page.

---

## References

- [Inventory Module Overview](./inventory.md)
- [Catalog Module](./catalog.md)
- [Import Shipments](./import-shipments.md) _(PR3)_
- [Landed Cost Allocation](./landed-cost-allocation.md) _(PR4)_
- [FEFO Picking](./fefo-picking.md) _(PR5)_
- [Database Persistence Strategy](../architecture/DATABASE_PERSISTENCE_STRATEGY.md)
- [Module Implementation Guide](../guides/MODULE_IMPLEMENTATION_GUIDE.md)
