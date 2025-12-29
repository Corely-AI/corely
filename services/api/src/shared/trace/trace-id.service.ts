import { Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";

/**
 * Service for generating and managing request trace/correlation IDs
 */
@Injectable()
export class TraceIdService {
  /**
   * Generate a new trace ID
   */
  generate(): string {
    return randomUUID();
  }

  /**
   * Extract trace ID from incoming request header or generate a new one
   */
  extractOrGenerate(headerValue: string | undefined): string {
    if (headerValue && this.isValidTraceId(headerValue)) {
      return headerValue;
    }
    return this.generate();
  }

  /**
   * Validate that a string looks like a valid trace ID (UUID format)
   */
  private isValidTraceId(value: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(value);
  }
}
