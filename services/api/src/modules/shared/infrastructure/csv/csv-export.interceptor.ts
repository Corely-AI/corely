import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  StreamableFile,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";
import type { Response } from "express";

/**
 * Interceptor to handle CSV export for list endpoints
 *
 * Usage: Add @UseInterceptors(CsvExportInterceptor) to list endpoints
 *
 * Clients can request CSV format by adding ?format=csv query parameter
 * or setting Accept: text/csv header
 *
 * Expected response format:
 * {
 *   items: Array<Record<string, any>>,
 *   total?: number,
 *   ...other metadata
 * }
 */
@Injectable()
export class CsvExportInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse<Response>();

    const format = request.query?.format;
    const acceptHeader = request.headers?.accept;

    const wantsCsv =
      format === "csv" ||
      acceptHeader?.includes("text/csv") ||
      acceptHeader?.includes("application/csv");

    if (!wantsCsv) {
      // Return JSON as normal
      return next.handle();
    }

    // Transform response to CSV
    return next.handle().pipe(
      map((data) => {
        const items = this.extractItems(data);

        if (!items || items.length === 0) {
          // Empty CSV
          response.setHeader("Content-Type", "text/csv");
          response.setHeader("Content-Disposition", "attachment; filename=export.csv");
          return new StreamableFile(Buffer.from(""));
        }

        const csv = this.convertToCsv(items);

        response.setHeader("Content-Type", "text/csv; charset=utf-8");
        response.setHeader("Content-Disposition", `attachment; filename=export-${Date.now()}.csv`);

        return new StreamableFile(Buffer.from(csv, "utf-8"));
      })
    );
  }

  private extractItems(data: any): Array<Record<string, any>> | null {
    // Handle different response structures
    if (Array.isArray(data)) {
      return data;
    }

    if (data && typeof data === "object") {
      // Try common property names for list items
      if (Array.isArray(data.items)) {
        return data.items;
      }
      if (Array.isArray(data.data)) {
        return data.data;
      }
      if (Array.isArray(data.results)) {
        return data.results;
      }
      if (Array.isArray(data.records)) {
        return data.records;
      }

      // Check for module-specific property names
      if (Array.isArray(data.shipments)) {
        return data.shipments;
      }
      if (Array.isArray(data.lots)) {
        return data.lots;
      }
      if (Array.isArray(data.products)) {
        return data.products;
      }
      if (Array.isArray(data.invoices)) {
        return data.invoices;
      }
    }

    return null;
  }

  private convertToCsv(items: Array<Record<string, any>>): string {
    if (items.length === 0) {
      return "";
    }

    // Extract headers from first item
    const headers = this.getHeaders(items[0]);

    // Build CSV
    const csvLines: string[] = [];

    // Header row
    csvLines.push(headers.map((h) => this.escapeCsvValue(h)).join(","));

    // Data rows
    for (const item of items) {
      const row = headers.map((header) => {
        const value = this.getNestedValue(item, header);
        return this.escapeCsvValue(this.formatValue(value));
      });
      csvLines.push(row.join(","));
    }

    return csvLines.join("\n");
  }

  private getHeaders(item: Record<string, any>): string[] {
    const headers: string[] = [];

    const traverse = (obj: any, prefix = ""): void => {
      for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          const value = obj[key];
          const fullKey = prefix ? `${prefix}.${key}` : key;

          if (value === null || value === undefined) {
            headers.push(fullKey);
          } else if (typeof value === "object" && !Array.isArray(value)) {
            // Flatten nested objects (1 level only)
            traverse(value, fullKey);
          } else {
            headers.push(fullKey);
          }
        }
      }
    };

    traverse(item);
    return headers;
  }

  private getNestedValue(obj: any, path: string): any {
    const keys = path.split(".");
    let value = obj;

    for (const key of keys) {
      if (value === null || value === undefined) {
        return null;
      }
      value = value[key];
    }

    return value;
  }

  private formatValue(value: any): string {
    if (value === null || value === undefined) {
      return "";
    }

    if (typeof value === "boolean") {
      return value ? "true" : "false";
    }

    if (typeof value === "object") {
      // Arrays and objects are stringified
      return JSON.stringify(value);
    }

    return String(value);
  }

  private escapeCsvValue(value: string): string {
    if (value === null || value === undefined) {
      return "";
    }

    const stringValue = String(value);

    // Check if value needs quoting
    if (
      stringValue.includes(",") ||
      stringValue.includes('"') ||
      stringValue.includes("\n") ||
      stringValue.includes("\r")
    ) {
      // Escape quotes by doubling them
      const escaped = stringValue.replace(/"/g, '""');
      return `"${escaped}"`;
    }

    return stringValue;
  }
}
