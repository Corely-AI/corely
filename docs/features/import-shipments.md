# Import Shipments Module

## Overview

The Import Shipments module tracks international shipments from suppliers, managing the full lifecycle from shipment creation through customs clearance to warehouse receipt. It provides comprehensive cost tracking for landed cost allocation and integrates with the InventoryLot module for traceability.

## Key Capabilities

1. **Shipment Lifecycle Management**: Track shipments through status workflow (DRAFT → SUBMITTED → IN_TRANSIT → CUSTOMS_CLEARANCE → CLEARED → RECEIVED)
2. **Cost Tracking**: Record FOB, freight, insurance, duties, taxes, and other costs for landed cost calculation
3. **Customs Documentation**: Track BOL, commercial invoices, certificates of origin, import licenses, customs declarations
4. **Container Tracking**: Monitor container numbers, seal numbers, vessel/voyage details
5. **Multi-line Shipments**: Support multiple products per shipment with individual quantities and costs
6. **Integration with Inventory**: Links to InventoryLot module via shipmentId field for full traceability

## Database Schema

### Core Models

**ImportShipment**

- Container/vessel tracking (containerNumber, sealNumber, vesselName, voyageNumber)
- Origin/destination ports and countries
- Shipping mode (SEA, AIR, LAND, COURIER)
- Cost breakdown (FOB, freight, insurance, duties, taxes, other)
- Customs documentation (declaration number, import license, HS codes)
- Timeline dates (departure, ETA, actual arrival, clearance, received)
- Supplier reference (supplierPartyId)

**ImportShipmentLine**

- Product details (productId, hsCode)
- Quantities (orderedQty, receivedQty)
- FOB costs (unitFobCostCents, lineFobCostCents)
- Allocated costs (freight, insurance, duty, tax, other - populated in PR4)
- Physical attributes (weightKg, volumeM3)

**ImportShipmentDocument**

- Document type (BILL_OF_LADING, COMMERCIAL_INVOICE, PACKING_LIST, etc.)
- File storage (documentUrl, fileStorageKey, mimeType)
- Document metadata (documentNumber, documentName, uploadedByUserId)

**ImportSettings**

- Auto-numbering (shipmentPrefix, shipmentNextNumber)
- Configuration flags (autoCreateLotsOnReceipt, requireBolForSubmit, requireInvoiceForSubmit)

## API Endpoints

| Method | Endpoint                        | Permission                | Description                            |
| ------ | ------------------------------- | ------------------------- | -------------------------------------- |
| POST   | `/import/shipments`             | `import.shipments.manage` | Create new shipment                    |
| PUT    | `/import/shipments/:id`         | `import.shipments.manage` | Update shipment (DRAFT/SUBMITTED only) |
| GET    | `/import/shipments`             | `import.shipments.read`   | List shipments with filters            |
| GET    | `/import/shipments/:id`         | `import.shipments.read`   | Get shipment detail                    |
| POST   | `/import/shipments/:id/submit`  | `import.shipments.manage` | Submit shipment (DRAFT → SUBMITTED)    |
| POST   | `/import/shipments/:id/receive` | `import.shipments.manage` | Receive shipment (CLEARED → RECEIVED)  |

### Filters (List Endpoint)

- `supplierPartyId`: Filter by supplier
- `status`: Filter by shipment status
- `shippingMode`: Filter by shipping mode
- `estimatedArrivalAfter/Before`: Filter by ETA date range
- `actualArrivalAfter/Before`: Filter by actual arrival date range
- `containerNumber`: Search container numbers
- `billOfLadingNumber`: Search BOL numbers
- `limit`, `offset`: Pagination

## Frontend Screens

1. **ShipmentsPage** (`/import/shipments`)
   - List view with table showing shipment number, status, container, origin, ETA, total cost
   - Filters: status, container number
   - Actions: View detail, Create new shipment

2. **ShipmentDetailPage** (`/import/shipments/:id`)
   - Shipment Information card (shipping mode, container #, BOL, carrier)
   - Origin & Destination card (ports, countries)
   - Dates card (departure, ETA, actual arrival, clearance, received)
   - Costs card (FOB, freight, insurance, duties, taxes, total landed cost)
   - Shipment Lines table (product, HS code, ordered/received quantities, costs)

## Architecture

### Backend (Hexagonal Architecture)

**Domain Layer**

- `import-shipment.entity.ts`: Entity interfaces and factory functions
- Types: ImportShipmentStatus, ImportDocumentType, ShippingMode

**Application Layer**

- Ports: `import-shipment-repository.port.ts`
- Use Cases: create, update, list, get, submit, receive
- Mappers: `import-shipment-dto.mapper.ts`

**Infrastructure Layer**

- `prisma-import-shipment-repository.adapter.ts`: Prisma implementation
- LocalDate handling (formatLocalDate/parseLocalDate)
- Tenant-scoped queries

**HTTP Layer**

- `import-shipment.controller.ts`: REST endpoints
- Guards: AuthGuard, RbacGuard, WorkspaceCapabilityGuard
- Capability required: `import.basic`

### Frontend

**API Client**: `import-shipments-api.ts`

- Methods: createShipment, updateShipment, listShipments, getShipment, submitShipment, receiveShipment
- Idempotency key generation for mutations
- Correlation ID tracking

**UI Components**: React with TanStack Query

- Status badges with color coding
- Currency formatting
- Date formatting

## Business Rules

1. **Status Workflow**:
   - Only DRAFT shipments can be submitted
   - Only CLEARED shipments can be received
   - RECEIVED and CANCELED shipments cannot be updated

2. **Cost Calculation**:
   - Total Landed Cost = FOB + Freight + Insurance + Duties + Taxes + Other
   - Line FOB Cost = orderedQty × unitFobCostCents (if provided)

3. **Required Fields**:
   - Must have at least one line to submit
   - supplierPartyId required
   - lines[].productId and lines[].orderedQty required

## Integration Points

### InventoryLot Module

- InventoryLot.shipmentId links to ImportShipment.id
- When shipment received, lots are created with shipmentId populated
- Enables traceability from import → lot → stock move → sales

### Party/CRM Module

- supplierPartyId references Party entity
- Used for supplier tracking and reporting

### Catalog Module

- ImportShipmentLine.productId references CatalogItem
- HS codes from catalog can pre-populate shipment lines

### Future: Landed Cost Allocation (PR4)

- Will populate allocatedFreightCents, allocatedInsuranceCents, etc.
- Will calculate unitLandedCostCents for each line
- Will update InventoryLot.unitCostCents with allocated landed cost

## Permissions

- `import.shipments.read`: View shipments
- `import.shipments.manage`: Create, update, submit, receive shipments

## Capability

- `import.basic`: Required workspace capability to access import module

## Testing Strategy

### Unit Tests (To be added)

- Entity factory functions
- Use case logic (validation, status transitions)
- Cost calculations

### Integration Tests (To be added)

- API endpoints with authentication
- Tenant scoping enforcement
- Status workflow validation
- Filter queries

### E2E Tests (To be added)

- Create shipment → submit → receive flow
- Integration with inventory receipt posting
- Lot creation with shipmentId linkage

## Roadmap

**PR3 (Current)**

- ✅ Basic CRUD for shipments
- ✅ Status workflow (submit, receive)
- ✅ Frontend list and detail pages

**PR4: Landed Cost Allocation**

- Allocate shipment costs to lines based on weight/volume
- Populate unitLandedCostCents on shipment lines
- Update InventoryLot.unitCostCents when lots created

**PR5: FEFO Integration**

- Use shipmentId for advanced traceability
- Link FEFO picking to specific import shipments

**Future Enhancements**

- Document upload/management (attach BOL, invoices, etc.)
- Shipment status change via workflow automation
- Email notifications (ETA approaching, customs clearance needed)
- Integration with freight forwarder APIs
- Multi-currency support for costs
- Exchange rate tracking
- Duty/tax calculation based on HS codes
- Customs broker integration

## File Structure

```
packages/
├── contracts/src/import/
│   ├── import-shipment.types.ts
│   ├── create-shipment.schema.ts
│   ├── update-shipment.schema.ts
│   ├── list-shipments.schema.ts
│   ├── get-shipment.schema.ts
│   ├── submit-shipment.schema.ts
│   ├── receive-shipment.schema.ts
│   └── index.ts
├── data/prisma/schema/
│   └── 71b_import_shipment.prisma
│
services/api/src/modules/import/
├── domain/
│   └── import-shipment.entity.ts
├── application/
│   ├── ports/
│   │   └── import-shipment-repository.port.ts
│   ├── use-cases/
│   │   ├── create-shipment.usecase.ts
│   │   ├── update-shipment.usecase.ts
│   │   ├── list-shipments.usecase.ts
│   │   ├── get-shipment.usecase.ts
│   │   ├── submit-shipment.usecase.ts
│   │   └── receive-shipment.usecase.ts
│   └── mappers/
│       └── import-shipment-dto.mapper.ts
├── infrastructure/adapters/
│   └── prisma-import-shipment-repository.adapter.ts
├── adapters/http/
│   └── import-shipment.controller.ts
├── providers/
│   ├── shipment.providers.ts
│   └── repository.providers.ts
├── import.module.ts
├── import.permissions.ts
└── index.ts

apps/web/src/
├── lib/
│   └── import-shipments-api.ts
└── modules/import/
    ├── screens/
    │   ├── ShipmentsPage.tsx
    │   └── ShipmentDetailPage.tsx
    └── index.ts
```

## Notes

- Module follows strict hexagonal architecture patterns
- No cross-module database access (uses events/contracts for integration)
- Receive shipment use case is simplified in PR3 (returns placeholder receipt ID)
- Full inventory integration will be completed in later PRs
- Document management is scaffolded but not fully implemented (future enhancement)
