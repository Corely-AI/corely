import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "@corely/data";
import { type EventHandler, type OutboxEvent } from "../../outbox/event-handler.interface";
import { NOTIFICATION_EVENTS, NotificationIntentPayloadSchema } from "@corely/contracts";
import { randomUUID } from "crypto";

@Injectable()
export class NotificationIntentHandler implements EventHandler {
  readonly eventType = NOTIFICATION_EVENTS.INTENT;
  private readonly logger = new Logger(NotificationIntentHandler.name);

  constructor(private readonly prisma: PrismaService) {}

  async handle(event: OutboxEvent): Promise<void> {
    const payload = NotificationIntentPayloadSchema.parse(event.payload);
    const { tenantId, workspaceId, dedupeKey, recipientUserIds, ...data } = payload;

    // 1. Idempotent Notification Creation
    // We use a dedupeKey to prevent duplicate notifications from the same intent
    let notificationId: string;

    // Try to find existing first to avoid unique constraint errors in logs (though upsert handles it)
    const existing = await this.prisma.notification.findUnique({
      where: {
        tenantId_workspaceId_dedupeKey: {
          tenantId,
          workspaceId,
          dedupeKey,
        },
      },
    });

    if (existing) {
      notificationId = existing.id;
    } else {
      // Create new
      try {
        const created = await this.prisma.notification.create({
          data: {
            tenantId,
            workspaceId,
            dedupeKey,
            type: data.type,
            severity: data.severity,
            title: data.title,
            body: data.body,
            resource: data.resource,
            data: data.data || {},
            createdAt: new Date(data.createdAt),
          },
        });
        notificationId = created.id;
      } catch (e: any) {
        // Handle race condition if parallel processing
        if (e.code === "P2002") {
          const retry = await this.prisma.notification.findUnique({
            where: {
              tenantId_workspaceId_dedupeKey: {
                tenantId,
                workspaceId,
                dedupeKey,
              },
            },
          });
          if (!retry) {
            throw e;
          } // Should not happen
          notificationId = retry.id;
        } else {
          throw e;
        }
      }
    }

    // 2. Create Recipients (Idempotent)
    // We use createMany with skipDuplicates for efficiency
    // But createMany is not supported with SQLite (if that were the case, but we use Postgres)
    // Postgres supports skipDuplicates.

    // Map recipients to data
    const recipientData = payload.recipientUserIds.map((userId) => ({
      id: randomUUID(),
      tenantId,
      workspaceId,
      notificationId,
      userId,
      createdAt: new Date(),
    }));

    if (recipientData.length > 0) {
      await this.prisma.notificationRecipient.createMany({
        data: recipientData,
        skipDuplicates: true,
      });
    }

    this.logger.log(
      `Processed notification intent: ${data.title} for ${recipientData.length} recipients`
    );
  }
}
