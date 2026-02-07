# CSV Export Infrastructure

This module provides CSV export capabilities for list endpoints across the application.

## Usage

### Basic Usage

Add the `@UseInterceptors(CsvExportInterceptor)` decorator to any list endpoint:

```typescript
import { UseInterceptors } from "@nestjs/common";
import { CsvExportInterceptor } from "../../../shared/infrastructure/csv";

@Controller("import/shipments")
export class ImportShipmentController {
  @Get()
  @UseInterceptors(CsvExportInterceptor)
  async list(@Query() query: ListShipmentsInput): Promise<ListShipmentsOutput> {
    // ... your endpoint logic
    return { shipments: [...], total: 100 };
  }
}
```

### Client Usage

Clients can request CSV format in two ways:

1. **Query parameter**: Add `?format=csv` to the URL

   ```
   GET /import/shipments?format=csv
   ```

2. **Accept header**: Set the `Accept` header to `text/csv`
   ```
   GET /import/shipments
   Accept: text/csv
   ```

### Response Format Requirements

The interceptor expects the endpoint to return data in one of these formats:

```typescript
// Array format (direct array)
[{ id: "1", name: "Item 1" }, { id: "2", name: "Item 2" }]

// Object with items property (preferred)
{ items: [...], total: 100 }

// Alternative property names
{ data: [...], total: 100 }
{ results: [...], total: 100 }
{ records: [...], total: 100 }

// Module-specific property names
{ shipments: [...], total: 100 }
{ lots: [...], total: 100 }
{ products: [...], total: 100 }
{ invoices: [...], total: 100 }
```

### Features

- **Automatic header extraction**: Column headers are extracted from the first item
- **Nested object flattening**: Nested objects are flattened with dot notation (e.g., `supplier.name`)
- **CSV escaping**: Properly escapes commas, quotes, and newlines
- **Empty handling**: Returns empty CSV file if no items found
- **UTF-8 support**: Full Unicode character support

### CSV Format

The generated CSV format:

- **Headers**: First row contains column names
- **Delimiter**: Comma (`,`)
- **Quote character**: Double quote (`"`)
- **Quote escaping**: Quotes are escaped by doubling (`""`)
- **Line ending**: Newline (`\n`)
- **Encoding**: UTF-8

### Example Output

Given this data:

```json
{
  "items": [
    {
      "id": "1",
      "name": "Product A",
      "price": 100,
      "supplier": { "name": "Supplier 1" }
    },
    {
      "id": "2",
      "name": "Product B",
      "price": 200,
      "supplier": { "name": "Supplier 2" }
    }
  ]
}
```

CSV output:

```csv
id,name,price,supplier.name
1,Product A,100,Supplier 1
2,Product B,200,Supplier 2
```

### Limitations

- Nested arrays are JSON-stringified (not flattened)
- Only one level of object nesting is flattened
- Date formatting uses ISO string format
- Binary data is not supported

### Implementation Examples

See these controllers for working examples:

- `services/api/src/modules/import/adapters/http/import-shipment.controller.ts`
- `services/api/src/modules/inventory/adapters/http/inventory-lot.controller.ts`
