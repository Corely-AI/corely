import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "@corely/data";
import type { EventHandler, OutboxEvent } from "../../outbox/event-handler.interface";

@Injectable()
export class PlatformEntityDeletedHandler implements EventHandler {
  readonly eventType = "platform.entity.deleted";
  private readonly logger = new Logger(PlatformEntityDeletedHandler.name);

  constructor(private readonly prisma: PrismaService) {}

  async handle(event: OutboxEvent): Promise<void> {
    const payload = event.payload as {
      tenantId?: string;
      entityType?: string;
      entityId?: string;
    };
    const tenantId = payload.tenantId ?? event.tenantId;
    const entityType = payload.entityType;
    const entityId = payload.entityId;

    if (!tenantId || !entityType || !entityId) {
      this.logger.warn(
        `Skipping platform.entity.deleted event due to missing data: ${JSON.stringify(payload)}`
      );
      return;
    }

    await this.prisma.$transaction([
      this.prisma.entityDimension.deleteMany({
        where: {
          tenantId,
          entityType,
          entityId,
        },
      }),
      this.prisma.customFieldIndex.deleteMany({
        where: {
          tenantId,
          entityType,
          entityId,
        },
      }),
      this.prisma.extEntityAttr.deleteMany({
        where: {
          tenantId,
          moduleId: "customization",
          entityType,
          entityId,
        },
      }),
    ]);
  }
}
