import { Injectable } from "@nestjs/common";
import { PrismaService } from "@corely/data";
import { type InvoiceCopilotRateLimitPort } from "../../application/ports/invoice-copilot-rate-limit.port";

const COPILOT_DRAFT_ACTION = "invoice.copilot.email_drafted";

@Injectable()
export class PrismaInvoiceCopilotRateLimitAdapter implements InvoiceCopilotRateLimitPort {
  constructor(private readonly prisma: PrismaService) {}

  async countDraftsSince(params: {
    tenantId: string;
    userId: string;
    since: Date;
  }): Promise<number> {
    return this.prisma.auditLog.count({
      where: {
        tenantId: params.tenantId,
        actorUserId: params.userId,
        action: COPILOT_DRAFT_ACTION,
        createdAt: {
          gte: params.since,
        },
      },
    });
  }
}
