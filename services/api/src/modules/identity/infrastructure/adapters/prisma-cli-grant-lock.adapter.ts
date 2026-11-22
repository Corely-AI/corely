import { getPrismaClient, PrismaService } from "@corely/data";
import type { TransactionContext } from "@corely/kernel";
import { Injectable } from "@nestjs/common";
import type { CliGrantLock } from "../../application/ports/cli-grant-lock.port";

@Injectable()
export class PrismaCliGrantLock implements CliGrantLock {
  constructor(private readonly prisma: PrismaService) {}

  async acquire(key: string, transaction: TransactionContext): Promise<void> {
    await getPrismaClient(this.prisma, transaction)
      .$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${key}, 0))::text`;
  }
}
