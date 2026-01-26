# Tax Snapshot Generation - Implementation Summary

## Problem

Invoices were being finalized without tax snapshots, causing VAT period queries to return €0.00 even though invoices had valid tax amounts.

## Root Cause

The `FinalizeInvoiceUseCase` was not calling the `TaxEngineService` to calculate and save tax snapshots when invoices were finalized.

## Changes Made

### 1. Updated FinalizeInvoiceUseCase (`finalize-invoice.usecase.ts`)

- **Added**: Injection of `TaxEngineService`
- **Added**: Tax calculation before invoice finalization
- **Logic**:
  - Calculate tax breakdown using `TaxEngineService.calculate()`
  - Create tax snapshot with subtotal, VAT, total, line items, and totals by kind
  - Save snapshot to invoice via `invoice.updateSnapshots()`
  - Graceful failure: If tax calculation fails, log warning but allow finalization to proceed

### 2. Updated InvoicesModule (`invoices.module.ts`)

- **Added**: Import of `TaxModule`
- **Added**: Import of `TaxEngineService`
- **Updated**: `FinalizeInvoiceUseCase` factory to inject `TaxEngineService`

### 3. Tax Snapshot Structure

```typescript
{
  subtotalAmountCents: number;      // Net amount before tax
  taxTotalAmountCents: number;      // Total VAT
  totalAmountCents: number;         // Gross amount (net + tax)
  lines: TaxLineResult[];           // Per-line tax breakdown
  totalsByKind: TaxTotalsByKind;    // Totals grouped by tax kind (STANDARD, REDUCED, etc.)
  appliedAt: string;                // ISO timestamp when tax was calculated
}
```

## How Tax Snapshots Work

1. **Invoice Creation** (DRAFT status)
   - No tax snapshot generated yet

2. **Invoice Finalization** (ISSUED status)
   - `TaxEngineService.calculate()` is called with:
     - Invoice line items (qty, unitPriceCents)
     - Customer info (country, VAT ID)
     - Document date
   - Tax engine applies jurisdiction-specific rules (currently DE/Germany only)
   - Result is saved as `taxSnapshot` JSON field on Invoice

3. **VAT Period Query**
   - Reads `taxSnapshot` field from finalized invoices
   - Extracts `taxTotalAmountCents` for VAT calculations
   - Aggregates across all invoices in the period

## Database Schema

The `taxSnapshot` field already exists in the Invoice model:

```prisma
model Invoice {
  // ...
  taxSnapshot Json? @db.JsonB
  // ...
}
```

## Testing

Created integration test: `invoice-tax-snapshot.int.test.ts`

- Tests tax snapshot storage and retrieval
- Verifies JSON structure matches schema
- Tests VAT period query integration

## Current Status

✅ Code changes complete
✅ Module wiring complete
⚠️ **Needs verification**: API server reload with new dependencies

## Next Steps Required

### 1. Verify API Server Running

The API server needs to reload with the new TaxModule dependency. Check:

```bash
# In terminal running pnpm dev:api
# Look for any startup errors related to TaxModule or TaxEngineService
```

### 2. Test with New Invoice

Create a new invoice and finalize it:

```bash
# Should now have taxSnapshot populated
# Query: SELECT id, number, status, "taxSnapshot" FROM "Invoice"
#        WHERE number = 'INV-2026-XXXXX';
```

### 3. Backfill Existing Invoices (Optional)

For existing invoices without tax snapshots, create a migration script:

```typescript
// Script to backfill tax snapshots for existing ISSUED/PAID invoices
// - Query all invoices where taxSnapshot IS NULL and status IN ('ISSUED', 'SENT', 'PAID')
// - For each, call TaxEngineService.calculate()
// - Update invoice.taxSnapshot
```

### 4. Monitor VAT Period Queries

After new invoices are finalized, verify:

- `/tax/vat-periods?year=2026` shows correct VAT amounts
- Period detail pages show invoice breakdowns

## Known Limitations

1. **Germany Only**: Tax calculation currently only supports DE jurisdiction
2. **No Fallback**: If TaxEngineService fails, invoice gets null taxSnapshot
3. **Historical Data**: Existing invoices need manual backfill

## Files Modified

- `services/api/src/modules/invoices/application/use-cases/finalize-invoice/finalize-invoice.usecase.ts`
- `services/api/src/modules/invoices/invoices.module.ts`
- `services/api/src/modules/invoices/__tests__/invoice-tax-snapshot.int.test.ts` (new)
- `services/api/src/modules/tax/infrastructure/prisma/prisma-vat-period-query.adapter.ts` (fallback for line items)

## Troubleshooting

### If VAT still shows €0.00:

1. Check invoice has `taxSnapshot` in database
2. Verify `taxSnapshot.taxTotalAmountCents` has value
3. Check VAT period query date range includes invoice.issuedAt
4. Verify invoice.status is in ['ISSUED', 'SENT', 'PAID']

### If tax calculation fails:

1. Check tax profile exists and is active
2. Verify country='DE' (only supported jurisdiction)
3. Check invoice.issuedAt is within tax profile effective dates
4. Review API logs for TaxEngineService errors
