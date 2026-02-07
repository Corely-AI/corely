# COGS Auto-Posting Service

The `CogsPostingService` automatically creates journal entries for Cost of Goods Sold (COGS) when invoices are issued.

## Overview

When an invoice is finalized, this service:

1. Calculates COGS from product costs (lot-based or default)
2. Creates a journal entry:
   - **Debit**: COGS account (5000)
   - **Credit**: Inventory account (1500)
3. Links the journal entry to the source invoice

This ensures accurate P&L reporting without manual journal entry creation.

## Usage

### Basic Usage (Default Product Costs)

```typescript
import { CogsPostingService } from "./cogs-posting.service";

// In your invoice finalization handler
const result = await cogsPostingService.postCogsForInvoice(
  {
    invoiceId: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    invoiceDate: invoice.invoiceDate, // ISO date string
    lines: invoice.lines.map((line) => ({
      productId: line.productId,
      productName: line.productName,
      quantity: line.quantity,
      unitCostCents: line.unitCostCents || product.defaultPurchaseCostCents,
    })),
    currency: invoice.currency,
  },
  ctx
);

if (result.journalEntryId) {
  console.log(`COGS posted: Journal Entry ${result.journalEntryId}`);
} else {
  console.warn(`COGS posting skipped: ${result.error}`);
}
```

### Advanced Usage (Lot-Based FEFO Costing)

```typescript
// After FEFO lot allocation
const pickResult = await inventoryService.pickForDelivery({
  warehouseId: invoice.warehouseId,
  lines: invoice.lines.map((line) => ({
    productId: line.productId,
    quantityRequested: line.quantity,
  })),
  strategy: "FEFO",
});

// Post COGS using actual lot costs
const result = await cogsPostingService.postCogsFromLots(
  {
    invoiceId: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    invoiceDate: invoice.invoiceDate,
    lotAllocations: pickResult.picks.flatMap((pick) =>
      pick.allocations.map((alloc) => ({
        lotId: alloc.lotId,
        lotNumber: alloc.lotNumber,
        productName: pick.productName,
        quantityPicked: alloc.quantityPicked,
        unitCostCents: alloc.unitCostCents || 0,
      }))
    ),
    currency: invoice.currency,
  },
  ctx
);
```

## Integration Points

### Option 1: Direct Call (Synchronous)

Add COGS posting directly in the invoice finalization use case:

```typescript
// In IssueInvoiceUseCase.handle()
async handle(input, ctx) {
  // ... issue invoice logic

  // Post COGS immediately
  await this.cogsPostingService.postCogsForInvoice({
    invoiceId: invoice.id,
    // ... other params
  }, ctx);

  return ok({ invoice });
}
```

**Pros**: Simple, immediate posting
**Cons**: Couples invoice and accounting modules

### Option 2: Domain Event (Asynchronous - Recommended)

Emit an event when invoice is issued, then handle COGS posting in a separate handler:

```typescript
// In IssueInvoiceUseCase
await this.eventBus.publish(
  new InvoiceIssuedEvent({
    invoiceId: invoice.id,
    tenantId: invoice.tenantId,
    // ... invoice details
  })
);

// In accounting module - InvoiceIssuedEventHandler
@Injectable()
export class InvoiceIssuedEventHandler {
  constructor(private readonly cogsPostingService: CogsPostingService) {}

  @OnEvent("invoice.issued")
  async handleInvoiceIssued(event: InvoiceIssuedEvent) {
    await this.cogsPostingService.postCogsForInvoice(
      {
        invoiceId: event.invoiceId,
        // ... fetch invoice details
      },
      event.ctx
    );
  }
}
```

**Pros**: Loose coupling, follows module boundaries
**Cons**: Requires event infrastructure

### Option 3: Outbox Pattern (Guaranteed Delivery)

Use the existing outbox pattern for reliable cross-module communication:

```typescript
// In IssueInvoiceUseCase
await this.outboxRepo.save({
  eventType: "invoice.issued",
  aggregateId: invoice.id,
  payload: {
    invoiceId: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    lines: invoice.lines,
    // ...
  },
});

// In accounting module - Outbox Worker
@Injectable()
export class CogsOutboxWorker {
  @Cron("*/5 * * * *") // Every 5 minutes
  async processInvoiceEvents() {
    const events = await this.outboxRepo.findUnprocessed("invoice.issued");

    for (const event of events) {
      await this.cogsPostingService.postCogsForInvoice(event.payload, this.buildContext(event));

      await this.outboxRepo.markProcessed(event.id);
    }
  }
}
```

**Pros**: Guaranteed delivery, transactional safety
**Cons**: More complex setup

## Configuration

### Account Mapping

The service uses these system account keys:

- **COGS**: `systemAccountKey: "COGS"` (typically code 5000)
- **Inventory**: Account code `1500`

If your chart of accounts uses different codes, update the service:

```typescript
// In cogs-posting.service.ts
const inventoryAccount = await this.accountRepo.findByCode(tenantId, "1300"); // Your custom code
```

### Cost Fallback

When product costs are not available:

1. Service logs a warning
2. COGS posting is skipped for that invoice
3. Returns `{ journalEntryId: null, error: "No cost data" }`

To avoid skipped postings:

- Ensure `CatalogItem.defaultPurchaseCostCents` is set
- Use lot tracking with `InventoryLot.unitCostCents`
- Update costs after landed cost allocation

## Journal Entry Format

Created journal entries have this structure:

```
Date: [Invoice Date]
Memo: COGS for Invoice INV-001 - Product A (10 units @ 5.00 USD), ...

Account                 Debit    Credit
5000 - COGS             50.00
1500 - Inventory                 50.00
```

Metadata:

- `sourceType`: "Invoice"
- `sourceId`: Invoice ID
- `sourceRef`: Invoice Number
- `tags`: ["auto-cogs", "invoice:{invoiceId}"]

## Error Handling

The service handles these scenarios gracefully:

| Scenario                     | Behavior                                     |
| ---------------------------- | -------------------------------------------- |
| No cost data                 | Logs warning, returns null, no entry created |
| COGS account missing         | Logs error, returns error message            |
| Inventory account missing    | Logs error, returns error message            |
| Journal entry creation fails | Logs error, returns error message            |

All errors are logged but do not throw exceptions, allowing invoice finalization to proceed.

## Testing

### Manual Test

```bash
# Issue an invoice via API
POST /invoices/:id/issue

# Check journal entries
GET /accounting/journal-entries?sourceType=Invoice&sourceId={invoiceId}

# Verify COGS entry exists with correct amounts
```

### Unit Test Example

```typescript
describe("CogsPostingService", () => {
  it("should create COGS journal entry for invoice", async () => {
    const result = await service.postCogsForInvoice(
      {
        invoiceId: "inv-123",
        invoiceNumber: "INV-001",
        invoiceDate: "2024-01-15",
        lines: [
          {
            productId: "prod-1",
            productName: "Product A",
            quantity: 10,
            unitCostCents: 500, // $5.00
          },
        ],
        currency: "USD",
      },
      ctx
    );

    expect(result.journalEntryId).toBeDefined();
    expect(createJournalEntry).toHaveBeenCalledWith({
      lines: [
        { direction: "Debit", amountCents: 5000 }, // COGS
        { direction: "Credit", amountCents: 5000 }, // Inventory
      ],
    });
  });
});
```

## Migration Guide

### Existing Invoices

For invoices issued before COGS auto-posting was enabled:

1. **Query invoices without COGS entries**:

   ```sql
   SELECT i.id, i.invoice_number
   FROM billing.invoices i
   LEFT JOIN accounting.journal_entries je
     ON je.source_type = 'Invoice' AND je.source_id = i.id
   WHERE i.status = 'ISSUED'
     AND je.id IS NULL
   ```

2. **Backfill COGS entries** (create a migration script):
   ```typescript
   for (const invoice of invoicesWithoutCogs) {
     await cogsPostingService.postCogsForInvoice(
       {
         invoiceId: invoice.id,
         // ... fetch invoice details
       },
       ctx
     );
   }
   ```

## Troubleshooting

### COGS not posting

1. **Check account setup**:

   ```bash
   GET /accounting/accounts?systemKey=COGS
   GET /accounting/accounts?code=1500
   ```

   Both should return active accounts.

2. **Check product costs**:

   ```bash
   GET /catalog/items/:id
   ```

   Verify `defaultPurchaseCostCents` is set.

3. **Check logs**:
   ```bash
   grep "COGS posting" logs/api.log
   ```

### Incorrect COGS amounts

- Verify lot costs are up-to-date after landed cost allocation
- Check FEFO picking allocations match invoice quantities
- Ensure unit costs are in cents (not dollars)

## References

- Gap Analysis: P0-5 COGS Auto-Posting
- Accounting Module: `services/api/src/modules/accounting/`
- Journal Entry Use Case: `create-journal-entry.usecase.ts`
- Chart of Accounts: `domain/coa-templates.ts`
