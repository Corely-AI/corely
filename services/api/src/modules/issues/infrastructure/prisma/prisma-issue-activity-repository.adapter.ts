import { Injectable } from "@nestjs/common";
import { PrismaService } from "@corely/data";
import type { IssueActivity } from "../../domain/issue.types";
import type { IssueActivityRepositoryPort } from "../../application/ports/issue-activity-repository.port";

const parseMetadata = (value: string | null): Record<string, unknown> | null => {
  if (!value) {
    return null;
  }
  try {
    return JSON.parse(value) as Record<string, unknown>;
  } catch {
    return null;
  }
};

const toIssueActivity = (row: any): IssueActivity => ({
  id: row.id,
  tenantId: row.tenantId,
  issueId: row.issueId,
  type: row.type,
  metadata: parseMetadata(row.metadataJson),
  createdAt: row.createdAt,
  createdByUserId: row.createdByUserId,
});

@Injectable()
export class PrismaIssueActivityRepositoryAdapter implements IssueActivityRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async create(activity: IssueActivity): Promise<IssueActivity> {
    const created = await this.prisma.issueActivity.create({
      data: {
        id: activity.id,
        tenantId: activity.tenantId,
        issueId: activity.issueId,
        type: activity.type,
        metadataJson: activity.metadata ? JSON.stringify(activity.metadata) : null,
        createdAt: activity.createdAt,
        createdByUserId: activity.createdByUserId ?? null,
      },
    });

    return toIssueActivity(created);
  }

  async listByIssue(tenantId: string, issueId: string): Promise<IssueActivity[]> {
    const rows = await this.prisma.issueActivity.findMany({
      where: { tenantId, issueId },
      orderBy: { createdAt: "asc" },
    });

    return rows.map(toIssueActivity);
  }
}
