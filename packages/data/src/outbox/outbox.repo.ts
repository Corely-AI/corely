import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

export interface OutboxEventData {
  eventType: string;
  payloadJson: string;
  tenantId: string;
  availableAt?: Date;
}

/**
 * OutboxRepository for worker polling use cases.
 * This is separate from OutboxPort which is used by application layer.
 */
@Injectable()
export class OutboxRepository {
  constructor(private readonly prisma: PrismaService) {}

  async fetchPending(limit: number = 10) {
    return this.prisma.outboxEvent.findMany({
      where: {
        status: "PENDING",
        availableAt: { lte: new Date() },
      },
      orderBy: { createdAt: "asc" },
      take: limit,
    });
  }

  async markSent(id: string) {
    return this.prisma.outboxEvent.update({
      where: { id },
      data: { status: "SENT" },
    });
  }

  async markFailed(id: string, error: string) {
    return this.prisma.outboxEvent.update({
      where: { id },
      data: {
        status: "FAILED",
        attempts: { increment: 1 },
      },
    });
  }
}
