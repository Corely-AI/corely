import { Injectable } from "@nestjs/common";
import { PrismaService } from "@corely/data";
import { randomUUID } from "crypto";

export interface SeedCrmWorkflowActivityInput {
  tenantId: string;
  dealId: string;
  actorUserId: string;
  subject?: string;
}

export interface SeedCrmWorkflowActivityResult {
  activityId: string;
  subject: string;
}

@Injectable()
export class CrmTestHooksService {
  constructor(private readonly prisma: PrismaService) {}

  async seedWorkflowActivity(
    params: SeedCrmWorkflowActivityInput
  ): Promise<SeedCrmWorkflowActivityResult> {
    const deal = await this.prisma.deal.findFirst({
      where: { tenantId: params.tenantId, id: params.dealId },
      select: { id: true, partyId: true },
    });

    if (!deal) {
      throw new Error("Deal not found for workflow test hook");
    }

    const now = new Date();
    const subject = params.subject ?? "Workflow automation follow-up task";
    const created = await this.prisma.activity.create({
      data: {
        id: randomUUID(),
        tenantId: params.tenantId,
        type: "TASK",
        subject,
        body: "Created by deterministic test hook",
        partyId: deal.partyId,
        dealId: deal.id,
        status: "OPEN",
        assignedToUserId: params.actorUserId,
        createdByUserId: params.actorUserId,
        createdAt: now,
        updatedAt: now,
        metadata: {
          source: "test-hook",
          trigger: "deal.stage.change",
        },
      },
      select: { id: true, subject: true },
    });

    return {
      activityId: created.id,
      subject: created.subject,
    };
  }
}
