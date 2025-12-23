import { Injectable } from "@nestjs/common";
import { IdempotencyPort, TransactionContext } from "@kerniflow/kernel";
import { PrismaService } from "../prisma/prisma.service";
import { getPrismaClient } from "../uow/prisma-unit-of-work.adapter";

/**
 * Prisma implementation of IdempotencyPort.
 * Supports both transactional and non-transactional operations.
 */
@Injectable()
export class PrismaIdempotencyAdapter implements IdempotencyPort {
  constructor(private readonly prisma: PrismaService) {}

  async isProcessed(key: string, tx?: TransactionContext): Promise<boolean> {
    const client = getPrismaClient(this.prisma, tx);
    const record = await client.idempotencyKey.findUnique({ where: { key } });
    return record !== null;
  }

  async markAsProcessed(key: string, result?: any, tx?: TransactionContext): Promise<void> {
    const client = getPrismaClient(this.prisma, tx);
    await client.idempotencyKey.create({
      data: {
        key,
        result: result ? JSON.stringify(result) : null,
      },
    });
  }

  async getResult<T = any>(key: string, tx?: TransactionContext): Promise<T | null> {
    const client = getPrismaClient(this.prisma, tx);
    const record = await client.idempotencyKey.findUnique({ where: { key } });
    if (!record || !record.result) return null;
    return JSON.parse(record.result as string);
  }
}
