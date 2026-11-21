import { getPrismaClient, PrismaService } from "@corely/data";
import type { TransactionContext } from "@corely/kernel";
import { Injectable } from "@nestjs/common";
import type { TenantAdminSessionLock } from "../../application/ports/tenant-admin-session-lock.port";

@Injectable()
export class PrismaTenantAdminSessionLock implements TenantAdminSessionLock {
  constructor(private readonly prisma: PrismaService) {}

  async acquire(tenantId: string, sessionId: string, tx: TransactionContext): Promise<void> {
    const key = `identity:tenant-admin-session:${tenantId}:${sessionId}`;
    await getPrismaClient(this.prisma, tx)
      .$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${key}, 0))::text`;
  }
}
