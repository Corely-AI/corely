import { Injectable } from "@nestjs/common";
import { PrismaService } from "@corely/data";
import type { Issue, IssuePriority, IssueSiteType, IssueStatus } from "../../domain/issue.types";
import type {
  IssueListFilters,
  IssueListResult,
  IssueRepositoryPort,
} from "../../application/ports/issue-repository.port";

const toDate = (value?: string) => (value ? new Date(value) : undefined);

const parseSort = (sort?: string | string[]) => {
  const sortValue = Array.isArray(sort) ? sort[0] : sort;
  if (!sortValue) {
    return { createdAt: "desc" as const };
  }

  const [field, direction] = sortValue.split(":");
  const dir = direction === "asc" ? "asc" : "desc";

  switch (field) {
    case "createdAt":
    case "updatedAt":
    case "priority":
    case "status":
    case "title":
      return { [field]: dir } as Record<string, "asc" | "desc">;
    default:
      return { createdAt: "desc" as const };
  }
};

const toIssue = (row: any): Issue => ({
  id: row.id,
  tenantId: row.tenantId,
  title: row.title,
  description: row.description,
  status: row.status as IssueStatus,
  priority: row.priority as IssuePriority,
  siteType: row.siteType as IssueSiteType,
  siteId: row.siteId,
  customerPartyId: row.customerPartyId,
  manufacturerPartyId: row.manufacturerPartyId,
  assigneeUserId: row.assigneeUserId,
  reporterUserId: row.reporterUserId,
  resolvedAt: row.resolvedAt,
  resolvedByUserId: row.resolvedByUserId,
  closedAt: row.closedAt,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

@Injectable()
export class PrismaIssueRepositoryAdapter implements IssueRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async create(issue: Issue): Promise<Issue> {
    const created = await this.prisma.issue.create({
      data: {
        id: issue.id,
        tenantId: issue.tenantId,
        title: issue.title,
        description: issue.description ?? null,
        status: issue.status,
        priority: issue.priority,
        siteType: issue.siteType,
        siteId: issue.siteId ?? null,
        customerPartyId: issue.customerPartyId ?? null,
        manufacturerPartyId: issue.manufacturerPartyId ?? null,
        assigneeUserId: issue.assigneeUserId ?? null,
        reporterUserId: issue.reporterUserId ?? null,
        resolvedAt: issue.resolvedAt ?? null,
        resolvedByUserId: issue.resolvedByUserId ?? null,
        closedAt: issue.closedAt ?? null,
        createdAt: issue.createdAt,
        updatedAt: issue.updatedAt,
      },
    });

    return toIssue(created);
  }

  async update(tenantId: string, issueId: string, updates: Partial<Issue>): Promise<Issue> {
    const updated = await this.prisma.issue.update({
      where: { id: issueId, tenantId },
      data: {
        title: updates.title,
        description: updates.description ?? undefined,
        status: updates.status,
        priority: updates.priority,
        siteType: updates.siteType,
        siteId: updates.siteId ?? undefined,
        customerPartyId: updates.customerPartyId ?? undefined,
        manufacturerPartyId: updates.manufacturerPartyId ?? undefined,
        assigneeUserId: updates.assigneeUserId ?? undefined,
        reporterUserId: updates.reporterUserId ?? undefined,
        resolvedAt: updates.resolvedAt ?? undefined,
        resolvedByUserId: updates.resolvedByUserId ?? undefined,
        closedAt: updates.closedAt ?? undefined,
        updatedAt: updates.updatedAt ?? undefined,
      },
    });

    return toIssue(updated);
  }

  async findById(tenantId: string, issueId: string): Promise<Issue | null> {
    const row = await this.prisma.issue.findUnique({
      where: { id: issueId, tenantId },
    });
    return row ? toIssue(row) : null;
  }

  async list(
    tenantId: string,
    filters: IssueListFilters,
    pagination: { page: number; pageSize: number }
  ): Promise<IssueListResult> {
    const where: any = { tenantId };

    if (filters.status) {
      where.status = filters.status;
    }
    if (filters.priority) {
      where.priority = filters.priority;
    }
    if (filters.siteType) {
      where.siteType = filters.siteType;
    }
    if (filters.assigneeUserId) {
      where.assigneeUserId = filters.assigneeUserId;
    }
    if (filters.reporterUserId) {
      where.reporterUserId = filters.reporterUserId;
    }
    if (filters.customerPartyId) {
      where.customerPartyId = filters.customerPartyId;
    }
    if (filters.manufacturerPartyId) {
      where.manufacturerPartyId = filters.manufacturerPartyId;
    }

    const fromDate = toDate(filters.fromDate);
    const toDateValue = toDate(filters.toDate);
    if (fromDate || toDateValue) {
      where.createdAt = {
        ...(fromDate ? { gte: fromDate } : {}),
        ...(toDateValue ? { lte: toDateValue } : {}),
      };
    }

    if (filters.q) {
      where.OR = [
        { title: { contains: filters.q, mode: "insensitive" } },
        { description: { contains: filters.q, mode: "insensitive" } },
      ];
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.issue.findMany({
        where,
        orderBy: parseSort(filters.sort),
        skip: (pagination.page - 1) * pagination.pageSize,
        take: pagination.pageSize,
      }),
      this.prisma.issue.count({ where }),
    ]);

    return { items: items.map(toIssue), total };
  }
}
