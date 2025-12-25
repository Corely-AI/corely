import { Injectable } from "@nestjs/common";
import { OutboxPort } from "@kerniflow/kernel";
import { PrismaService, getPrismaClient, type TransactionContext } from "@kerniflow/data";

@Injectable()
export class PrismaOutboxAdapter implements OutboxPort {
  constructor(private readonly prisma: PrismaService) {}

  async enqueue(
    event: {
      eventType: string;
      payload: unknown;
      tenantId: string;
      correlationId?: string;
      availableAt?: Date;
    },
    tx?: TransactionContext
  ): Promise<void> {
    const client = getPrismaClient(this.prisma, tx);

    await client.outboxEvent.create({
      data: {
        tenantId: event.tenantId,
        eventType: event.eventType,
        payloadJson: JSON.stringify(event.payload ?? {}),
        correlationId: event.correlationId,
        availableAt: event.availableAt ?? new Date(),
      },
    });
  }
}
