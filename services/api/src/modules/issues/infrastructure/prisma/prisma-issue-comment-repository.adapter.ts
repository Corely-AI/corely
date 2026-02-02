import { type PrismaService } from "@corely/data";
import type { IssueComment } from "../../domain/issue.types";
import type { IssueCommentRepositoryPort } from "../../application/ports/issue-comment-repository.port";

const toIssueComment = (row: any): IssueComment => ({
  id: row.id,
  tenantId: row.tenantId,
  issueId: row.issueId,
  body: row.body,
  createdByUserId: row.createdByUserId,
  createdAt: row.createdAt,
});

export class PrismaIssueCommentRepositoryAdapter implements IssueCommentRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async create(comment: IssueComment): Promise<IssueComment> {
    const created = await this.prisma.issueComment.create({
      data: {
        id: comment.id,
        tenantId: comment.tenantId,
        issueId: comment.issueId,
        body: comment.body,
        createdByUserId: comment.createdByUserId,
        createdAt: comment.createdAt,
      },
    });

    return toIssueComment(created);
  }

  async listByIssue(tenantId: string, issueId: string): Promise<IssueComment[]> {
    const rows = await this.prisma.issueComment.findMany({
      where: { tenantId, issueId },
      orderBy: { createdAt: "asc" },
    });

    return rows.map(toIssueComment);
  }
}
