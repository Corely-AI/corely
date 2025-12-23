import { getPrisma } from "@kerniflow/data";
import { OutboxPort } from "../../ports/outbox.port";

export class PrismaOutboxAdapter implements OutboxPort {
  async enqueue(event: {
    eventType: string;
    payload: any;
    tenantId: string;
    correlationId?: string;
  }): Promise<void> {
    const prisma = getPrisma();
    await prisma.outboxEvent.create({
      data: {
        tenantId: event.tenantId,
        eventType: event.eventType,
        payloadJson: JSON.stringify(event.payload ?? {}),
        correlationId: event.correlationId,
      },
    });
  }
}
