import { Injectable } from "@nestjs/common";
import { IdempotencyPort } from "../../application/ports/idempotency.port";

@Injectable()
export class InMemoryIdempotencyAdapter implements IdempotencyPort {
  private readonly cache = new Set<string>();

  async checkAndInsert(key: string, tenantId: string): Promise<boolean> {
    const compound = `${tenantId}:${key}`;
    if (this.cache.has(compound)) return false;
    this.cache.add(compound);
    return true;
  }
}
