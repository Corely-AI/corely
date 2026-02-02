import { NotFoundError } from "@corely/domain";
import type { GetIssueRequest } from "@corely/contracts";
import type { UseCaseContext } from "@corely/kernel";
import { RequireTenant } from "@corely/kernel";
import { assertCan } from "@/shared/policies/assert-can";
import type { IssueRepositoryPort } from "../ports/issue-repository.port";
import type { IssueAttachmentRepositoryPort } from "../ports/issue-attachment-repository.port";
import type { IssueCommentRepositoryPort } from "../ports/issue-comment-repository.port";
import type { IssueActivityRepositoryPort } from "../ports/issue-activity-repository.port";
import type { IssueAttachment, IssueComment, IssueActivity, Issue } from "../../domain/issue.types";

export type GetIssueResult = {
  issue: Issue;
  attachments: IssueAttachment[];
  comments: IssueComment[];
  commentAttachments: Map<string, IssueAttachment[]>;
  activity: IssueActivity[];
};

@RequireTenant()
export class GetIssueUseCase {
  constructor(
    private readonly issueRepo: IssueRepositoryPort,
    private readonly attachmentRepo: IssueAttachmentRepositoryPort,
    private readonly commentRepo: IssueCommentRepositoryPort,
    private readonly activityRepo: IssueActivityRepositoryPort
  ) {}

  async execute(input: GetIssueRequest, ctx: UseCaseContext): Promise<GetIssueResult> {
    assertCan(ctx);
    const tenantId = ctx.tenantId!;

    const issue = await this.issueRepo.findById(tenantId, input.issueId);
    if (!issue) {
      throw new NotFoundError("Issue not found", { code: "Issues:NotFound" });
    }

    const [attachments, comments, activity] = await Promise.all([
      this.attachmentRepo.listByIssue(tenantId, issue.id),
      this.commentRepo.listByIssue(tenantId, issue.id),
      this.activityRepo.listByIssue(tenantId, issue.id),
    ]);

    const commentAttachments = new Map<string, IssueAttachment[]>();
    for (const attachment of attachments) {
      if (!attachment.commentId) {
        continue;
      }
      const list = commentAttachments.get(attachment.commentId) ?? [];
      list.push(attachment);
      commentAttachments.set(attachment.commentId, list);
    }

    return { issue, attachments, comments, commentAttachments, activity };
  }
}
