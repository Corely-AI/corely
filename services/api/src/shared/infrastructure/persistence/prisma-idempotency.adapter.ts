import { getPrisma } from "@kerniflow/data";
import { IdempotencyPort, StoredResponse } from "../../ports/idempotency.port";

export class PrismaIdempotencyAdapter implements IdempotencyPort {
  async get(
    actionKey: string,
    tenantId: string | null,
    key: string
  ): Promise<StoredResponse | null> {
    // When tenantId is null, we can't use findUnique with the compound key
    // so we use findFirst instead
    const prisma = getPrisma();
    const existing = tenantId
      ? await prisma.idempotencyKey.findUnique({
          where: {
            tenantId_actionKey_key: {
              tenantId,
              actionKey,
              key,
            },
          },
        })
      : await prisma.idempotencyKey.findFirst({
          where: {
            tenantId: null,
            actionKey,
            key,
          },
        });

    if (!existing || !existing.responseJson) return null;
    return {
      statusCode: existing.statusCode ?? undefined,
      body: JSON.parse(existing.responseJson),
    };
  }

  async store(
    actionKey: string,
    tenantId: string | null,
    key: string,
    response: StoredResponse
  ): Promise<void> {
    // When tenantId is null, we can't use upsert with the compound key
    // so we need to handle it differently
    if (tenantId) {
      const prisma = getPrisma();
      await prisma.idempotencyKey.upsert({
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
      const prisma = getPrisma();
      const existing = await prisma.idempotencyKey.findFirst({
        where: {
          tenantId: null,
          actionKey,
          key,
        },
      });

      if (existing) {
        await prisma.idempotencyKey.update({
          where: { id: existing.id },
          data: {
            responseJson: JSON.stringify(response.body ?? null),
            statusCode: response.statusCode,
          },
        });
      } else {
        await prisma.idempotencyKey.create({
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
