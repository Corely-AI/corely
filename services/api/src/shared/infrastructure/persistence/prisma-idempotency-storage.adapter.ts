import type { TransactionContext } from "@corely/kernel";
import { Injectable, Inject } from "@nestjs/common";
import { PrismaService, getPrismaClient } from "@corely/data";
import type { IdempotencyStoragePort, StoredResponse } from "../../ports/idempotency-storage.port";

@Injectable()
export class PrismaIdempotencyStorageAdapter implements IdempotencyStoragePort {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async get(
    actionKey: string,
    tenantId: string | null,
    key: string
  ): Promise<StoredResponse | null> {
    // When tenantId is null, we can't use findUnique with the compound key
    // so we use findFirst instead
    const existing = tenantId
      ? await this.prisma.idempotencyKey.findUnique({
          where: {
            tenantId_actionKey_key: {
              tenantId,
              actionKey,
              key,
            },
          },
        })
      : await this.prisma.idempotencyKey.findFirst({
          where: {
            tenantId: null,
            actionKey,
            key,
          },
        });

    if (!existing || !existing.responseJson) {
      return null;
    }
    return {
      statusCode: existing.statusCode ?? undefined,
      body: JSON.parse(existing.responseJson),
    };
  }

  async store(
    actionKey: string,
    tenantId: string | null,
    key: string,
    response: StoredResponse,
    tx?: TransactionContext
  ): Promise<void> {
    const client = getPrismaClient(this.prisma, tx);
    // When tenantId is null, we can't use upsert with the compound key
    // so we need to handle it differently
    if (tenantId) {
      await client.idempotencyKey.upsert({
        where: {
          tenantId_actionKey_key: {
            tenantId,
            actionKey,
            key,
          },
        },
        update: {
          responseJson: JSON.stringify(response.body ?? null),
          statusCode: response.statusCode,
        },
        create: {
          tenantId,
          actionKey,
          key,
          responseJson: JSON.stringify(response.body ?? null),
          statusCode: response.statusCode,
        },
      });
    } else {
      // For null tenantId, check if it exists first, then create or update
      const existing = await client.idempotencyKey.findFirst({
        where: {
          tenantId: null,
          actionKey,
          key,
        },
      });

      if (existing) {
        await client.idempotencyKey.update({
          where: { id: existing.id },
          data: {
            responseJson: JSON.stringify(response.body ?? null),
            statusCode: response.statusCode,
          },
        });
      } else {
        await client.idempotencyKey.create({
          data: {
            tenantId: null,
            actionKey,
            key,
            responseJson: JSON.stringify(response.body ?? null),
            statusCode: response.statusCode,
          },
        });
      }
    }
  }
}
